

import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, QuoteRecord, User } from "@/types";
import { cleanObjectForFirestore } from '../forms';
import { inventoryService } from './inventory.service';
import { savePublicDocument } from '../public-document';
import { adminService } from './admin.service';
import { nanoid } from 'nanoid';

// --- Service Records ---

const onServicesUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "serviceRecords"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord)));
    });
};

const onServicesByStatusUpdate = (
    statuses: ServiceRecord['status'][],
    callback: (services: ServiceRecord[]) => void
): (() => void) => {
    if (!db || statuses.length === 0) return () => {};

    if (statuses.length > 10) {
        console.warn("Firestore 'in' query has a limit of 10 items. Consider multiple queries.");
    }

    const q = query(
        collection(db, "serviceRecords"),
        where("status", "in", statuses)
    );

    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord)));
    });
};


const onServicesForVehicleUpdate = (vehicleId: string, callback: (services: ServiceRecord[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(
        collection(db, "serviceRecords"), 
        where("vehicleId", "==", vehicleId),
        orderBy("serviceDate", "desc")
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord)));
    });
};


const onServicesUpdatePromise = async (): Promise<ServiceRecord[]> => {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, "serviceRecords")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
};

const getDocById = async (collectionName: 'serviceRecords', id: string): Promise<any> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

const saveService = async (data: ServiceRecord): Promise<ServiceRecord> => {
    if (!db) throw new Error("Database not initialized.");
    const collectionName = 'serviceRecords';
    
    const docRef = doc(db, collectionName, data.id);
    await setDoc(docRef, cleanObjectForFirestore(data), { merge: true });

    const savedDoc = await getDoc(docRef);
    if (!savedDoc.exists()) {
        throw new Error("Failed to save or retrieve the document.");
    }
    const finalData = { ...savedDoc.data(), id: data.id } as ServiceRecord;
    return finalData;
};

const completeService = async (service: ServiceRecord, paymentDetails: any, batch: any): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const serviceRef = doc(db, 'serviceRecords', service.id);
    
    const users: User[] = await adminService.onUsersUpdatePromise();
    const usersMap = new Map(users.map(u => [u.id, u]));

    let totalTechnicianCommission = 0;
    let serviceAdvisorCommission = 0;

    const serviceItemsWithCommission = service.serviceItems?.map(item => {
        let commissionForItem = 0;
        if (item.technicianId) {
            const technician = usersMap.get(item.technicianId);
            if (technician && typeof technician.commissionRate === 'number' && technician.commissionRate > 0) {
                commissionForItem = (item.sellingPrice || 0) * (technician.commissionRate / 100);
                totalTechnicianCommission += commissionForItem;
            }
        }
        return { ...item, technicianCommission: commissionForItem };
    }) || [];
    
    // RE-CÁLCULO DEL TOTAL BASADO EN PAGOS
    const finalTotalFromPayments = paymentDetails.payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    if (service.serviceAdvisorId) {
        const advisor = usersMap.get(service.serviceAdvisorId);
        if (advisor && typeof advisor.commissionRate === 'number' && advisor.commissionRate > 0) {
            // Usamos el total final de los pagos para el cálculo
            serviceAdvisorCommission = finalTotalFromPayments * (advisor.commissionRate / 100);
        }
    }

    const updatedServiceData = {
        ...service,
        total: finalTotalFromPayments, // Aseguramos que el total refleje la suma de los pagos
        serviceItems: serviceItemsWithCommission,
        totalCommission: totalTechnicianCommission,
        serviceAdvisorCommission: serviceAdvisorCommission,
        status: 'Entregado',
        deliveryDateTime: new Date(), // Usamos un Timestamp de Firestore para máxima consistencia
        payments: paymentDetails.payments,
        ...(paymentDetails.nextServiceInfo && { nextServiceInfo: paymentDetails.nextServiceInfo }),
    };

    batch.update(serviceRef, cleanObjectForFirestore(updatedServiceData));

    if (service.serviceItems && service.serviceItems.length > 0) {
        const suppliesToSubtract = service.serviceItems.flatMap(item => 
            item.suppliesUsed?.map(supply => ({ id: supply.supplyId, quantity: supply.quantity })) || []
        ).filter(supply => supply.id && supply.quantity > 0);

        if (suppliesToSubtract.length > 0) {
            await inventoryService.updateInventoryStock(batch, suppliesToSubtract, 'subtract');
        }
    }
};

const cancelService = async (id: string, reason: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    
    const batch = writeBatch(db);
    const serviceRef = doc(db, 'serviceRecords', id);
    const serviceDoc = await getDoc(serviceRef);

    if (serviceDoc.exists()) {
        const service = serviceDoc.data() as ServiceRecord;
        
        if (service.status === 'Agendado') {
            batch.update(serviceRef, { 
                status: 'Cotizacion', 
                subStatus: null,
                appointmentDateTime: null,
                cancellationReason: reason 
            });
        } else {
            batch.update(serviceRef, { 
                status: 'Cancelado', 
                cancellationReason: reason 
            });

            if (service.items && service.items.length > 0) {
                await inventoryService.updateInventoryStock(batch, service.items, 'add');
            }
        }
    }

    await batch.commit();
};

const deleteService = async (id: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await deleteDoc(doc(db, 'serviceRecords', id));
};

const updateService = async (id: string, data: Partial<ServiceRecord>): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const serviceRef = doc(db, 'serviceRecords', id);
    await updateDoc(serviceRef, data);
};

const createOrUpdatePublicService = async (service: ServiceRecord): Promise<ServiceRecord> => {
    let serviceToUpdate = { ...service };

    // 1. Generate Public ID if it doesn't exist
    if (!serviceToUpdate.publicId) {
        serviceToUpdate.publicId = nanoid(16);
        await updateDoc(doc(db, 'serviceRecords', serviceToUpdate.id), { publicId: serviceToUpdate.publicId });
    }

    // 2. Get vehicle data
    const vehicle = await inventoryService.getVehicleById(serviceToUpdate.vehicleId);

    // 3. Save to the public collection
    await savePublicDocument('service', serviceToUpdate, vehicle);

    // 4. Return the updated service record
    return serviceToUpdate;
};


export const serviceService = {
    onServicesUpdate,
    onServicesByStatusUpdate,
    onServicesForVehicleUpdate,
    onServicesUpdatePromise,
    getDocById,
    saveService,
    completeService,
    cancelService,
    deleteService,
    updateService,
    createOrUpdatePublicService,
};
