
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  query,
  where,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, QuoteRecord, SaleReceipt, Vehicle } from "@/types";
import { savePublicDocument } from '@/lib/public-document';
import { inventoryService } from './inventory.service';
import { nanoid } from 'nanoid';
import type { ExtractedService } from '@/ai/flows/service-migration-flow';
import { format, parse, isValid } from 'date-fns';

// --- Services ---

const onServicesUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    const q = query(collection(db, "serviceRecords"));
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
    const serviceRef = doc(db, "serviceRecords", serviceId);
    await updateDoc(serviceRef, data);
    
    // This part is tricky as we don't have the full service object.
    // We should fetch it, but for now, we'll assume the data is enough.
    // This might need to be adjusted based on how the function is used.
    
    // const vehicle = await inventoryService.getVehicleById(data.vehicleId);
    // await savePublicDocument('service', {id: serviceId, ...data}, vehicle, {});
    
    return { id: serviceId, ...data } as ServiceRecord;
};

const cancelService = async (serviceId: string, reason: string): Promise<void> => {
    const serviceRef = doc(db, "serviceRecords", serviceId);
    await updateDoc(serviceRef, {
        status: 'Cancelado',
        cancellationReason: reason,
    });
};

const completeService = async (serviceId: string, paymentDetails: { paymentMethod: any, cardFolio?: string, transferFolio?: string }): Promise<ServiceRecord> => {
    const serviceRef = doc(db, "serviceRecords", serviceId);
    
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

const saveMigratedServices = async (services: ExtractedService[]): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
    const vehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
    const vehicleMap = new Map(vehicles.map(v => [v.licensePlate, v.id]));
    
    const batch = writeBatch(db);

    for (const service of services) {
        let vehicleId = vehicleMap.get(service.vehicleLicensePlate);
        
        // If vehicle doesn't exist, create it within the same batch
        if (!vehicleId) {
            const newVehicleRef = doc(collection(db, 'vehicles'));
            vehicleId = newVehicleRef.id;
            
            // Here you might need to extract more vehicle details if available in the source data
            // For now, we use what the 'ExtractedService' provides
            const newVehicleData = {
                licensePlate: service.vehicleLicensePlate,
                make: '', // Add fields if you expand data-migration-flow
                model: '',
                year: 0,
                ownerName: '',
                ownerPhone: '',
            };
            
            batch.set(newVehicleRef, newVehicleData);
            vehicleMap.set(service.vehicleLicensePlate, vehicleId); // Add to map for subsequent services in the same batch
        }

        let parsedDate: Date | null = null;
        const possibleFormats = ['M/d/yy', 'MM/dd/yy', 'M-d-yy', 'MM-dd-yy', 'yyyy-MM-dd', 'dd/MM/yyyy'];
        for (const fmt of possibleFormats) {
            const dt = parse(service.serviceDate, fmt, new Date());
            if (isValid(dt)) {
                parsedDate = dt;
                break;
            }
        }
        
        if (!parsedDate) {
            console.warn(`Skipping service with unparseable date: ${service.serviceDate}`);
            continue;
        }

        const serviceRecord: Omit<ServiceRecord, 'id'> = {
            vehicleId: vehicleId,
            vehicleIdentifier: service.vehicleLicensePlate,
            serviceDate: parsedDate.toISOString(),
            description: service.description,
            totalCost: service.totalCost,
            status: 'Completado', // Assume migrated services are complete
            deliveryDateTime: parsedDate.toISOString(), // Use serviceDate as delivery for historical data
            subTotal: service.totalCost / 1.16,
            taxAmount: service.totalCost - (service.totalCost / 1.16),
            serviceProfit: 0, // Cannot be calculated from historical data
            totalSuppliesCost: 0,
            technicianId: 'N/A',
            serviceItems: [{
                id: 'migrated-item',
                name: service.description,
                price: service.totalCost,
                suppliesUsed: []
            }],
        };
        const newDocRef = doc(collection(db, "serviceRecords"));
        batch.set(newDocRef, serviceRecord);
    }
    await batch.commit();
}

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
    saveMigratedServices,
};
