
import type { ServiceRecord, QuoteRecord, SaleReceipt } from "@/types";
import { placeholderServiceRecords, placeholderSales, persistToFirestore, logAudit, placeholderInventory } from "@/lib/placeholder-data";
import { savePublicDocument } from '@/lib/public-document';
import { inventoryService } from './inventory.service';
import { personnelService } from './personnel.service';


const getServices = async (): Promise<ServiceRecord[]> => {
    return [...placeholderServiceRecords];
};

const getSales = async (): Promise<SaleReceipt[]> => {
    return [...placeholderSales];
};

const updateService = async (serviceId: string, data: ServiceRecord | QuoteRecord): Promise<ServiceRecord> => {
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (pIndex === -1) throw new Error("Service not found");
    
    const serviceToSave = data as ServiceRecord;
    placeholderServiceRecords[pIndex] = serviceToSave;

    await savePublicDocument('service', serviceToSave, await inventoryService.getVehicleById(serviceToSave.vehicleId), {});
    await persistToFirestore(['serviceRecords']);
    
    return serviceToSave;
};

const cancelService = async (serviceId: string, reason: string): Promise<void> => {
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (pIndex !== -1) {
        placeholderServiceRecords[pIndex].status = 'Cancelado';
        placeholderServiceRecords[pIndex].cancellationReason = reason;
        await logAudit('Cancelar', `Canceló el servicio #${serviceId} por: ${reason}`, { entityType: 'Servicio', entityId: serviceId });
        await persistToFirestore(['serviceRecords', 'auditLogs']);
    }
};

const completeService = async (serviceId: string, paymentDetails: { paymentMethod: any, cardFolio?: string, transferFolio?: string }): Promise<ServiceRecord> => {
    const serviceIndex = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (serviceIndex === -1) throw new Error("Service not found");

    const updatedService: ServiceRecord = {
      ...placeholderServiceRecords[serviceIndex],
      status: 'Entregado',
      deliveryDateTime: new Date().toISOString(),
      ...paymentDetails,
    };
    
    (updatedService.serviceItems || []).forEach(item => {
      (item.suppliesUsed || []).forEach(supply => {
        const inventoryItemIndex = placeholderInventory.findIndex(invItem => invItem.id === supply.supplyId);
        if (inventoryItemIndex !== -1 && !placeholderInventory[inventoryItemIndex].isService) {
          placeholderInventory[inventoryItemIndex].quantity -= supply.quantity;
        }
      });
    });

    placeholderServiceRecords[serviceIndex] = updatedService;
    await persistToFirestore(['serviceRecords', 'inventory']);
    return updatedService;
};

export const operationsService = {
    getServices,
    getSales,
    updateService,
    cancelService,
    completeService,
};
