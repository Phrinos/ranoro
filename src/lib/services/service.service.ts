

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
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, QuoteRecord } from "@/types";
import { cleanObjectForFirestore } from '../forms';
import { inventoryService } from './inventory.service';

// --- Service Records ---

const onServicesUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "serviceRecords"));
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

const getDocById = async (collectionName: 'serviceRecords' | 'quotes', id: string): Promise<any> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

const saveService = async (data: ServiceRecord): Promise<ServiceRecord> => {
    if (!db) throw new Error("Database not initialized.");
    const collectionName = data.status === 'Cotizacion' ? 'quotes' : 'serviceRecords';
    
    const docRef = doc(db, collectionName, data.id);
    await updateDoc(docRef, cleanObjectForFirestore(data), { merge: true });

    return { ...(await getDoc(docRef)).data(), id: data.id } as ServiceRecord;
};

const completeService = async (service: ServiceRecord, paymentDetails: any, batch: any): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const serviceRef = doc(db, 'serviceRecords', service.id);
    const updatedService = { 
        ...service, 
        status: 'Entregado', 
        deliveryDateTime: new Date().toISOString(),
        paymentDetails 
    };
    batch.update(serviceRef, cleanObjectForFirestore(updatedService));

    if (service.items && service.items.length > 0) {
        await inventoryService.updateInventoryStock(batch, service.items, 'subtract');
    }
};

const cancelService = async (id: string, reason: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    
    const batch = writeBatch(db);
    const serviceRef = doc(db, 'serviceRecords', id);
    const serviceDoc = await getDoc(serviceRef);

    if (serviceDoc.exists()) {
        const service = serviceDoc.data() as ServiceRecord;
        batch.update(serviceRef, { status: 'Cancelado', cancellationReason: reason });

        if (service.items && service.items.length > 0) {
            await inventoryService.updateInventoryStock(batch, service.items, 'add');
        }
    }

    await batch.commit();
};

const deleteService = async (id: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await deleteDoc(doc(db, 'serviceRecords', id));
};


export const serviceService = {
    onServicesUpdate,
    onServicesForVehicleUpdate,
    onServicesUpdatePromise,
    getDocById,
    saveService,
    completeService,
    cancelService,
    deleteService,
};
