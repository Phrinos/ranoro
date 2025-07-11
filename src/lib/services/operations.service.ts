

import type { ServiceRecord, QuoteRecord, SaleReceipt } from "@/types";
import { logAudit } from "../placeholder-data";
import { savePublicDocument } from '@/lib/public-document';
import { inventoryService } from './inventory.service';
import { db } from '@/lib/firebaseClient.js';
import { collection, onSnapshot, doc, setDoc, addDoc, getDoc } from 'firebase/firestore';


const onServicesUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'serviceRecords'), snapshot => {
        const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
        callback(services);
    });
};

const onSalesUpdate = (callback: (sales: SaleReceipt[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'sales'), snapshot => {
        const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleReceipt));
        callback(sales);
    });
};

const updateService = async (serviceId: string, data: ServiceRecord | QuoteRecord): Promise<ServiceRecord> => {
    const serviceToSave = data as ServiceRecord;
    await setDoc(doc(db, "serviceRecords", serviceId), serviceToSave, { merge: true });

    const vehicle = await getDoc(doc(db, "vehicles", serviceToSave.vehicleId));
    await savePublicDocument('service', serviceToSave, vehicle.data(), {});
    
    return serviceToSave;
};

const cancelService = async (serviceId: string, reason: string): Promise<void> => {
    await setDoc(doc(db, "serviceRecords", serviceId), {
        status: 'Cancelado',
        cancellationReason: reason,
    }, { merge: true });
    
    const newLog = logAudit('Cancelar', `Canceló el servicio #${serviceId} por: ${reason}`, { entityType: 'Servicio', entityId: serviceId });
    await addDoc(collection(db, 'auditLogs'), newLog);
};

const completeService = async (serviceId: string, paymentDetails: { paymentMethod: any, cardFolio?: string, transferFolio?: string }): Promise<ServiceRecord> => {
    const serviceRef = doc(db, 'serviceRecords', serviceId);
    const serviceSnap = await getDoc(serviceRef);
    if (!serviceSnap.exists()) throw new Error("Service not found");

    const updatedServiceData: Partial<ServiceRecord> = {
      status: 'Entregado',
      deliveryDateTime: new Date().toISOString(),
      ...paymentDetails,
    };
    
    await setDoc(serviceRef, updatedServiceData, { merge: true });

    // Update inventory stock
    const service = serviceSnap.data() as ServiceRecord;
    for (const item of service.serviceItems || []) {
      for (const supply of item.suppliesUsed || []) {
        const inventoryItemRef = doc(db, 'inventory', supply.supplyId);
        const invSnap = await getDoc(inventoryItemRef);
        if (invSnap.exists() && !invSnap.data().isService) {
            const currentQuantity = invSnap.data().quantity || 0;
            await setDoc(inventoryItemRef, { quantity: currentQuantity - supply.quantity }, { merge: true });
        }
      }
    }
    
    return { ...service, ...updatedServiceData } as ServiceRecord;
};

export const operationsService = {
    onServicesUpdate,
    onSalesUpdate,
    updateService,
    cancelService,
    completeService,
};
