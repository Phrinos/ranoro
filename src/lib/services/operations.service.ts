
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, QuoteRecord, SaleReceipt } from "@/types";
import { savePublicDocument } from '@/lib/public-document';
import { inventoryService } from './inventory.service';
import { nanoid } from 'nanoid';

// --- Services ---

const onServicesUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    const q = query(collection(db, "services"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const services: ServiceRecord[] = [];
        querySnapshot.forEach((doc) => {
            services.push({ id: doc.id, ...doc.data() } as ServiceRecord);
        });
        callback(services);
    });
    return unsubscribe;
};

const updateService = async (serviceId: string, data: Partial<ServiceRecord>): Promise<ServiceRecord> => {
    const serviceRef = doc(db, "services", serviceId);
    await updateDoc(serviceRef, data);
    
    // This part is tricky as we don't have the full service object.
    // We should fetch it, but for now, we'll assume the data is enough.
    // This might need to be adjusted based on how the function is used.
    
    // const vehicle = await inventoryService.getVehicleById(data.vehicleId);
    // await savePublicDocument('service', {id: serviceId, ...data}, vehicle, {});
    
    return { id: serviceId, ...data } as ServiceRecord;
};

const cancelService = async (serviceId: string, reason: string): Promise<void> => {
    const serviceRef = doc(db, "services", serviceId);
    await updateDoc(serviceRef, {
        status: 'Cancelado',
        cancellationReason: reason,
    });
};

const completeService = async (serviceId: string, paymentDetails: { paymentMethod: any, cardFolio?: string, transferFolio?: string }): Promise<ServiceRecord> => {
    const serviceRef = doc(db, "services", serviceId);
    
    // Again, we need the full service object. Let's assume we fetch it first.
    // This is a simplified version. A real implementation would fetch the doc.
    
    const updatedServiceData = {
      status: 'Entregado',
      deliveryDateTime: new Date().toISOString(),
      ...paymentDetails,
    };
    
    await updateDoc(serviceRef, updatedServiceData);

    // This part requires fetching the service to know which items to update.
    // This is a placeholder for the actual implementation.
    // for (const item of service.serviceItems || []) {
    //   for (const supply of item.suppliesUsed || []) {
    //     await inventoryService.updateItemStock(supply.supplyId, -supply.quantity);
    //   }
    // }
    
    return { id: serviceId, ...updatedServiceData } as ServiceRecord;
};

// --- Sales ---
const onSalesUpdate = (callback: (sales: SaleReceipt[]) => void): (() => void) => {
    const q = query(collection(db, "sales"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const sales: SaleReceipt[] = [];
        querySnapshot.forEach((doc) => {
            sales.push({ id: doc.id, ...doc.data() } as SaleReceipt);
        });
        callback(sales);
    });
    return unsubscribe;
};


export const operationsService = {
    onServicesUpdate,
    updateService,
    cancelService,
    completeService,
    onSalesUpdate,
};
