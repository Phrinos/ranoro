

import type { ServiceRecord, QuoteRecord, SaleReceipt } from "@/types";
import { 
  logAudit,
  placeholderServiceRecords,
  placeholderSales,
  placeholderInventory,
  persistToFirestore,
} from "../placeholder-data";
import { savePublicDocument } from '@/lib/public-document';
import { inventoryService } from './inventory.service';
import { nanoid } from 'nanoid';

// --- Services ---

const onServicesUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    callback([...placeholderServiceRecords]);
    return () => {};
};

const updateService = async (serviceId: string, data: Partial<ServiceRecord>): Promise<ServiceRecord> => {
    const index = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (index === -1) throw new Error("Service not found");
    
    placeholderServiceRecords[index] = { ...placeholderServiceRecords[index], ...data };
    
    const serviceToSave = placeholderServiceRecords[index];

    // Simulate public doc save
    const vehicle = await inventoryService.getVehicleById(serviceToSave.vehicleId);
    await savePublicDocument('service', serviceToSave, vehicle, {});
    
    await persistToFirestore(['serviceRecords']);
    return serviceToSave;
};

const cancelService = async (serviceId: string, reason: string): Promise<void> => {
    const index = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (index === -1) throw new Error("Service not found");

    placeholderServiceRecords[index].status = 'Cancelado';
    placeholderServiceRecords[index].cancellationReason = reason;
    
    await logAudit('Cancelar', `Canceló el servicio #${serviceId} por: ${reason}`, { entityType: 'Servicio', entityId: serviceId });
    await persistToFirestore(['serviceRecords', 'auditLogs']);
};

const completeService = async (serviceId: string, paymentDetails: { paymentMethod: any, cardFolio?: string, transferFolio?: string }): Promise<ServiceRecord> => {
    const index = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (index === -1) throw new Error("Service not found");
    
    const service = placeholderServiceRecords[index];
    
    const updatedService: ServiceRecord = {
      ...service,
      status: 'Entregado',
      deliveryDateTime: new Date().toISOString(),
      ...paymentDetails,
    };
    
    placeholderServiceRecords[index] = updatedService;

    // Update inventory stock
    for (const item of service.serviceItems || []) {
      for (const supply of item.suppliesUsed || []) {
        const invIndex = placeholderInventory.findIndex(i => i.id === supply.supplyId);
        if (invIndex !== -1 && !placeholderInventory[invIndex].isService) {
            placeholderInventory[invIndex].quantity -= supply.quantity;
        }
      }
    }
    
    await persistToFirestore(['serviceRecords', 'inventory']);
    return updatedService;
};

// --- Sales ---
const onSalesUpdate = (callback: (sales: SaleReceipt[]) => void): (() => void) => {
    callback([...placeholderSales]);
    return () => {};
};


export const operationsService = {
    onServicesUpdate,
    updateService,
    cancelService,
    completeService,
    onSalesUpdate,
};
