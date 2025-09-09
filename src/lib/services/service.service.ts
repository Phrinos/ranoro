

import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  query,
  DocumentReference,
  Timestamp,
  where,
  orderBy,
  serverTimestamp,
  limit,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, QuoteRecord, Vehicle, User, Payment, PayableAccount, InventoryItem, ServiceItem, PaymentMethod } from "@/types";
import { cleanObjectForFirestore, parseDate } from '../forms';
import { IVA_RATE } from '../money';
import { adminService } from './admin.service';
import { AUTH_USER_LOCALSTORAGE_KEY } from '../placeholder-data';
import { nanoid } from 'nanoid';
import { savePublicDocument } from '../public-document';
import { cashService } from './cash.service';
import type { PaymentDetailsFormValues } from '@/schemas/payment-details-form-schema';
import { inventoryService } from './inventory.service';
import { format, isValid, compareDesc, parse } from 'date-fns';
import { calcCardCommission, calcSuppliesCostFromItems, calcTotalFromItems } from "@/lib/money-helpers";

// --- Generic Document Getter ---
const getDocById = async (collectionName: string, id: string): Promise<any> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};


// --- Service Listeners ---

const _onServicesUpdateByStatus = (
  statuses: string[],
  callback: (services: ServiceRecord[]) => void,
  sortFn: (a: ServiceRecord, b: ServiceRecord) => number
): (() => void) => {
  if (!db) return () => {};
  const q = query(
    collection(db, "serviceRecords"),
    where("status", "in", statuses)
  );
  return onSnapshot(q, (snapshot) => {
    const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
    services.sort(sortFn);
    callback(services);
  }, (error) => {
    console.error(`Error listening to services with statuses [${statuses.join(', ')}]:`, error.message);
    callback([]);
  });
};


const onServicesUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "serviceRecords"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord)));
    }, (error) => console.error("Error listening to services:", error.message));
};

const onAgendaUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    return _onServicesUpdateByStatus(['Agendado'], callback, (a, b) => {
        const dateA = a.appointmentDateTime ? new Date(a.appointmentDateTime) : (a.serviceDate ? new Date(a.serviceDate) : null);
        const dateB = b.appointmentDateTime ? new Date(b.appointmentDateTime) : (b.serviceDate ? new Date(b.serviceDate) : null);
        if (dateA && dateB) return dateA.getTime() - dateB.getTime();
        return 0;
    });
};

const onQuotesUpdate = (callback: (quotes: ServiceRecord[]) => void): (() => void) => {
    return _onServicesUpdateByStatus(['Cotizacion'], callback, (a, b) => {
        const dateA = a.receptionDateTime ? new Date(a.receptionDateTime) : 0;
        const dateB = b.receptionDateTime ? new Date(b.receptionDateTime) : 0;
        if (dateA && dateB) return dateB.getTime() - dateA.getTime(); // Descending
        return 0;
    });
};

const onHistoryUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    return _onServicesUpdateByStatus(['Entregado', 'Cancelado'], callback, (a, b) => {
        const dateA = parseDate(a.deliveryDateTime) || parseDate(a.serviceDate) || new Date(0);
        const dateB = parseDate(b.deliveryDateTime) || parseDate(b.serviceDate) || new Date(0);
        if (dateA && dateB) return dateB.getTime() - dateA.getTime();
        return 0;
    });
};

const onServicesUpdatePromise = async (): Promise<ServiceRecord[]> => {
    if (!db) return [];
    const q = query(collection(db, "serviceRecords"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
};

const getServicesForVehicle = async (vehicleId: string): Promise<ServiceRecord[]> => {
    if (!db) return [];
    
    const q = query(
        collection(db, "serviceRecords"), 
        where("vehicleId", "==", vehicleId)
    );
    const snapshot = await getDocs(q);
    const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
    
    return services.sort((a, b) => {
        const dateA = parseDate(a.deliveryDateTime) || parseDate(a.serviceDate);
        const dateB = parseDate(b.deliveryDateTime) || parseDate(b.serviceDate);
        if (dateA && dateB) return compareDesc(dateA, dateB);
        if (dateA) return -1;
        if (dateB) return 1;
        return 0;
    });
};


// --- Service CRUD Operations ---
const updateVehicleOnServiceChange = async (vehicleId: string, serviceDate: string) => {
    if (!db) return;
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    try {
        const vehicleDoc = await getDoc(vehicleRef);
        if (vehicleDoc.exists()) {
            const vehicleData = vehicleDoc.data() as Vehicle;
            if (!vehicleData.lastServiceDate || new Date(serviceDate) > new Date(vehicleData.lastServiceDate)) {
                await updateDoc(vehicleRef, { lastServiceDate: serviceDate });
            }
        }
    } catch (e) {
        console.error("Failed to update vehicle's lastServiceDate", e);
    }
};


const addService = async (data: Omit<ServiceRecord, 'id'>): Promise<ServiceRecord> => {
    if (!db) throw new Error("Database not initialized.");
    const newId = `SRV-${nanoid(8).toUpperCase()}`;
    
    const serviceData: ServiceRecord = {
        ...data,
        id: newId,
        publicId: newId, 
        receptionDateTime: new Date().toISOString(),
    } as ServiceRecord;
    
    const cleanedData = cleanObjectForFirestore(serviceData);
    await setDoc(doc(db, 'serviceRecords', newId), cleanedData);
    
    if (data.vehicleId && data.serviceDate) {
      await updateVehicleOnServiceChange(data.vehicleId, data.serviceDate);
    }
    
    const vehicleDoc = await getDoc(doc(db, 'vehicles', data.vehicleId));
    if (vehicleDoc.exists()) {
        await savePublicDocument('service', serviceData, vehicleDoc.data() as Vehicle);
    }

    return serviceData;
};

const updateService = async (id: string, data: Partial<ServiceRecord>): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'serviceRecords', id);
    
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error("Service record not found");
    const existingData = docSnap.data() as ServiceRecord;

    const isMovingToWorkshop = data.status && data.status.toLowerCase() === 'en taller';
    const hasNoOriginalQuote = !existingData.originalQuoteItems || existingData.originalQuoteItems.length === 0;

    if (isMovingToWorkshop && hasNoOriginalQuote) {
        data.originalQuoteItems = existingData.serviceItems;
    }

    const cleanedData = cleanObjectForFirestore(data);
    await updateDoc(docRef, cleanedData);

    // --- Start of Synchronization Logic ---
    const updatedDoc = await getDoc(docRef);
    if (updatedDoc.exists()) {
        const fullUpdatedData = { id: updatedDoc.id, ...updatedDoc.data() } as ServiceRecord;
        
        if (fullUpdatedData.vehicleId) {
            if (fullUpdatedData.serviceDate) {
                await updateVehicleOnServiceChange(fullUpdatedData.vehicleId, fullUpdatedData.serviceDate);
            }
            
            const vehicleDoc = await getDoc(doc(db, 'vehicles', fullUpdatedData.vehicleId));
            if (vehicleDoc.exists()) {
                await savePublicDocument('service', fullUpdatedData, vehicleDoc.data() as Vehicle);
            }
        }
    }
    // --- End of Synchronization Logic ---
};


const saveService = async (data: Partial<ServiceRecord | QuoteRecord>): Promise<ServiceRecord> => {
    if (!db) throw new Error("Database not initialized.");

    const serviceItems = data.serviceItems || [];
    const totalCost = calcTotalFromItems(serviceItems);
    const totalSuppliesWorkshopCost = calcSuppliesCostFromItems(serviceItems);

    const payments = (data as any).payments as Payment[] | undefined;
    const commission = Number(data.cardCommission ?? (payments ? calcCardCommission(totalCost, payments, data.paymentMethod as any) : 0));
    
    const serviceProfit = totalCost - totalSuppliesWorkshopCost - commission;
    
    const subTotal = totalCost / (1 + IVA_RATE);
    const taxAmount = totalCost - subTotal;

    const dataWithCalculatedTotals: Partial<ServiceRecord> = {
        ...data,
        totalCost,
        totalSuppliesWorkshopCost,
        cardCommission: Number(data.cardCommission ?? commission),
        serviceProfit,
        subTotal,
        taxAmount,
    };

    if (dataWithCalculatedTotals.status === 'Agendado' && !dataWithCalculatedTotals.subStatus) {
        dataWithCalculatedTotals.subStatus = 'Sin Confirmar';
    }

    const isEditing = !!data.id;
    
    if (isEditing) {
        await updateService(data.id!, dataWithCalculatedTotals);
        const updatedDoc = await getDoc(doc(db, 'serviceRecords', data.id!));
        return { id: updatedDoc.id, ...updatedDoc.data() } as ServiceRecord;
    } else {
        return await addService(dataWithCalculatedTotals as Omit<ServiceRecord, 'id'>);
    }
};

const saveIndividualMigratedService = async (data: any) => {
    if (!db) throw new Error("Database not initialized.");
    
    const serviceDate = data.serviceDate ? new Date(data.serviceDate).toISOString() : new Date().toISOString();
    const totalCost = Number(data.totalCost) || 0;
    const suppliesCost = Number(data.suppliesCost) || 0;

    const newService = {
        vehicleId: data.vehicleId,
        vehicleIdentifier: data.licensePlate,
        description: data.description,
        serviceDate: serviceDate,
        receptionDateTime: serviceDate,
        deliveryDateTime: serviceDate,
        status: 'Entregado',
        paymentMethod: data.paymentMethod,
        totalCost: totalCost,
        totalSuppliesWorkshopCost: suppliesCost,
        serviceProfit: totalCost - suppliesCost,
        subTotal: totalCost / (1 + IVA_RATE),
        taxAmount: totalCost - (totalCost / (1 + IVA_RATE)),
    };
    
    return await addService(newService);
};


const saveMigratedServices = async (services: any[], vehicles: any[]) => {
    if (!db) throw new Error("Database not initialized.");
    const batch = writeBatch(db);

    for (const vehicleData of vehicles) {
      const vehicleRef = doc(collection(db, "vehicles"));
      batch.set(vehicleRef, cleanObjectForFirestore(vehicleData));
    }

    for (const serviceData of services) {
        const serviceRef = doc(collection(db, 'serviceRecords'));
        const { vehicleLicensePlate, serviceDate, description, totalCost } = serviceData;

        const vehicleSnapshot = await getDocs(query(collection(db, "vehicles"), where("licensePlate", "==", vehicleLicensePlate), limit(1)));
        const vehicleId = vehicleSnapshot.empty ? null : vehicleSnapshot.docs[0].id;
        
        const parsedDate = parse(serviceDate, 'M/d/yy', new Date());

        const newService = {
            vehicleId,
            vehicleIdentifier: vehicleLicensePlate,
            serviceDate: isValid(parsedDate) ? parsedDate.toISOString() : new Date().toISOString(),
            description,
            totalCost,
            status: 'Entregado',
            paymentMethod: 'Efectivo',
            receptionDateTime: isValid(parsedDate) ? parsedDate.toISOString() : new Date().toISOString(),
            deliveryDateTime: isValid(parsedDate) ? parsedDate.toISOString() : new Date().toISOString(),
        };

        batch.set(serviceRef, cleanObjectForFirestore(newService));
    }
    await batch.commit();
};


const cancelService = async (serviceId: string, reason?: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await updateDoc(doc(db, 'serviceRecords', serviceId), {
        status: 'Cancelado',
        cancellationReason: reason || "Cancelado desde el panel",
        deliveryDateTime: new Date().toISOString(),
    });
    const updatedDoc = await getDoc(doc(db, 'serviceRecords', serviceId));
    if (updatedDoc.exists()) {
        const vehicle = await getDoc(doc(db, 'vehicles', updatedDoc.data().vehicleId));
        if(vehicle.exists()){
             await savePublicDocument('service', updatedDoc.data() as ServiceRecord, vehicle.data() as Vehicle);
        }
    }
};

const deleteService = async (serviceId: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    
    const batch = writeBatch(db);
    
    const mainServiceRef = doc(db, 'serviceRecords', serviceId);
    batch.delete(mainServiceRef);
    
    const publicServiceRef = doc(db, 'publicServices', serviceId);
    batch.delete(publicServiceRef);
    
    await batch.commit();
};

const completeService = async (
    service: ServiceRecord, 
    paymentDetails: PaymentDetailsFormValues & { nextServiceInfo?: ServiceRecord['nextServiceInfo'] },
    batch: any
): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");

    const serviceRef = doc(db, 'serviceRecords', service.id);
    const deliveryDate = new Date().toISOString();

    // 1) Calcula total, insumos y comisión con base en los pagos que estás guardando
    const total     = Number(service.totalCost ?? calcTotalFromItems(service.serviceItems));
    const supplies  = Number(service.totalSuppliesWorkshopCost ?? calcSuppliesCostFromItems(service.serviceItems));
    const commission = calcCardCommission(total, paymentDetails.payments as any, service.paymentMethod as any);

    // 2) Ganancia efectiva
    const serviceProfit = total - supplies - commission;

    const updateData = {
        status: 'Entregado' as const,
        deliveryDateTime: deliveryDate,
        payments: paymentDetails.payments,
        nextServiceInfo: paymentDetails.nextServiceInfo,
        cardCommission: commission,
        serviceProfit, // ← deja persistido el valor correcto
    };

    batch.update(serviceRef, cleanObjectForFirestore(updateData));
    
    if (service.vehicleId) {
        await updateVehicleOnServiceChange(service.vehicleId, deliveryDate);
    }

    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
    
    for (const payment of paymentDetails.payments) {
        if (payment.method === 'Efectivo') {
            const cashTransactionRef = doc(collection(db, 'cashDrawerTransactions'));
            batch.set(cashTransactionRef, {
                date: new Date().toISOString(),
                type: 'Entrada' as const,
                amount: payment.amount,
                description: `Servicio #${service.id.slice(-6)}`,
                fullDescription: `Pago de servicio ${service.vehicleDescription}`,
                userId: currentUser?.id || 'system',
                userName: currentUser?.name || 'Sistema',
                relatedType: 'Servicio' as const,
                relatedId: service.id,
            });
        }
    }
};


export const serviceService = {
    getDocById,
    onServicesUpdate,
    onAgendaUpdate,
    onQuotesUpdate,
    onHistoryUpdate,
    onServicesUpdatePromise,
    getServicesForVehicle,
    addService,
    updateService,
    saveService,
    saveIndividualMigratedService,
    saveMigratedServices,
    cancelService,
    deleteService,
    completeService,
};
