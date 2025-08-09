

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
import type { ServiceRecord, QuoteRecord, Vehicle, User, Payment, PayableAccount, InventoryItem } from "@/types";
import { cleanObjectForFirestore, IVA_RATE, parseDate } from '../forms';
import { logAudit } from '../placeholder-data';
import { nanoid } from 'nanoid';
import { savePublicDocument } from '../public-document';
import { cashService } from './cash.service';
import type { PaymentDetailsFormValues } from '@/schemas/payment-details-form-schema';
import { inventoryService } from './inventory.service';
import { format, isValid, compareDesc, parse } from 'date-fns';

// --- Generic Document Getter ---
const getDocById = async (collectionName: string, id: string): Promise<any> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};


// --- Service Listeners ---

const onServicesUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    if (!db) return () => {};
    // Remove the orderBy clause to ensure all documents are fetched, even if they lack a serviceDate.
    // Client-side components will handle sorting.
    const q = query(collection(db, "serviceRecords"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord)));
    }, (error) => console.error("Error listening to services:", error.message));
};

const onServicesUpdatePromise = async (): Promise<ServiceRecord[]> => {
    if (!db) return [];
    // Remove the orderBy clause here as well for consistency.
    const q = query(collection(db, "serviceRecords"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
};

const getServicesForVehicle = async (vehicleId: string): Promise<ServiceRecord[]> => {
    if (!db) return [];
    
    // Simplified query: only filter by vehicleId. Sorting will be done on the client.
    const q = query(
        collection(db, "serviceRecords"), 
        where("vehicleId", "==", vehicleId)
    );
    const snapshot = await getDocs(q);
    const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
    
    // Sort on the client side to avoid needing the composite index immediately.
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
            // Only update if the new service is more recent
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
    
    const serviceData = {
        ...data,
        id: newId,
        publicId: newId, 
        receptionDateTime: new Date().toISOString(),
    };
    
    const cleanedData = cleanObjectForFirestore(serviceData);
    await setDoc(doc(db, 'serviceRecords', newId), cleanedData);
    
    if (data.vehicleId && data.serviceDate) {
      await updateVehicleOnServiceChange(data.vehicleId, data.serviceDate);
    }
    
    // Save to public collection
    const vehicle = await getDoc(doc(db, 'vehicles', data.vehicleId));
    if (vehicle.exists()) {
        await savePublicDocument('service', cleanedData, vehicle.data() as Vehicle);
    }

    return serviceData as ServiceRecord;
};

const updateService = async (id: string, data: Partial<ServiceRecord>): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'serviceRecords', id);
    const cleanedData = cleanObjectForFirestore(data);
    await updateDoc(docRef, cleanedData);

    const updatedDoc = await getDoc(docRef);
    if (updatedDoc.exists()) {
        const updatedData = updatedDoc.data() as ServiceRecord;
        if (updatedData.vehicleId && updatedData.serviceDate) {
            await updateVehicleOnServiceChange(updatedData.vehicleId, updatedData.serviceDate);
        }
    }
};

const saveService = async (data: Partial<ServiceRecord | QuoteRecord>): Promise<ServiceRecord> => {
    if (!db) throw new Error("Database not initialized.");

    // Recalculate totals before saving
    const serviceItems = data.serviceItems || [];
    const totalCost = serviceItems.reduce((acc, item) => acc + (item.price || 0), 0);
    const totalSuppliesWorkshopCost = serviceItems.flatMap(item => item.suppliesUsed || []).reduce((acc, supply) => acc + (supply.unitPrice || 0) * (supply.quantity || 0), 0);
    const serviceProfit = totalCost - totalSuppliesWorkshopCost;
    const subTotal = totalCost / (1 + IVA_RATE);
    const taxAmount = totalCost - subTotal;

    const dataWithCalculatedTotals = {
        ...data,
        totalCost,
        totalSuppliesWorkshopCost,
        serviceProfit,
        subTotal,
        taxAmount,
    };

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

    // Save new vehicles
    for (const vehicleData of vehicles) {
      const vehicleRef = doc(collection(db, "vehicles"));
      batch.set(vehicleRef, cleanObjectForFirestore(vehicleData));
    }

    // Save new services
    for (const serviceData of services) {
        const serviceRef = doc(collection(db, 'serviceRecords'));
        const { vehicleLicensePlate, serviceDate, description, totalCost } = serviceData;

        // Find the vehicle to link
        const vehicleSnapshot = await getDocs(query(collection(db, "vehicles"), where("licensePlate", "==", vehicleLicensePlate), limit(1)));
        const vehicleId = vehicleSnapshot.empty ? null : vehicleSnapshot.docs[0].id;
        
        // Try to parse the flexible date format
        const parsedDate = parse(serviceDate, 'M/d/yy', new Date());

        const newService = {
            vehicleId,
            vehicleIdentifier: vehicleLicensePlate,
            serviceDate: isValid(parsedDate) ? parsedDate.toISOString() : new Date().toISOString(),
            description,
            totalCost,
            status: 'Entregado',
            paymentMethod: 'Efectivo',
            // Add other required fields with default values
            receptionDateTime: isValid(parsedDate) ? parsedDate.toISOString() : new Date().toISOString(),
            deliveryDateTime: isValid(parsedDate) ? parsedDate.toISOString() : new Date().toISOString(),
        };

        batch.set(serviceRef, cleanObjectForFirestore(newService));
    }
    await batch.commit();
};


const cancelService = async (serviceId: string, reason: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await updateDoc(doc(db, 'serviceRecords', serviceId), {
        status: 'Cancelado',
        cancellationReason: reason,
        deliveryDateTime: new Date().toISOString(),
    });
};

const deleteService = async (serviceId: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await deleteDoc(doc(db, 'serviceRecords', serviceId));
};

const completeService = async (
    service: ServiceRecord, 
    paymentDetails: PaymentDetailsFormValues & { nextServiceInfo?: ServiceRecord['nextServiceInfo'] },
    batch: any // Firebase WriteBatch
): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    
    const serviceRef = doc(db, 'serviceRecords', service.id);
    const deliveryDate = new Date().toISOString();
    
    // 1. Update service record status, payment details, and delivery time
    const updateData = {
        status: 'Entregado' as const,
        deliveryDateTime: deliveryDate,
        payments: paymentDetails.payments,
        nextServiceInfo: paymentDetails.nextServiceInfo,
    };
    batch.update(serviceRef, cleanObjectForFirestore(updateData));
    
    // 2. Update vehicle's last service date
    if (service.vehicleId) {
        await updateVehicleOnServiceChange(service.vehicleId, deliveryDate);
    }

    // 3. Register cash transactions if applicable
    const authUserString = localStorage.getItem('authUser');
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
    
    for (const payment of paymentDetails.payments) {
        if (payment.method === 'Efectivo') {
            const cashTransactionRef = doc(collection(db, 'cashDrawerTransactions'));
            batch.set(cashTransactionRef, {
                date: new Date().toISOString(),
                type: 'Entrada' as const,
                amount: payment.amount,
                concept: `Servicio #${service.id.slice(-6)}`,
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
