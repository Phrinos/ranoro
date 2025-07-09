
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ServiceForm } from "./service-form";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord } from "@/types";
import { useToast } from "@/hooks/use-toast"; 
import { persistToFirestore, placeholderServiceRecords, logAudit } from '@/lib/placeholder-data';

interface ServiceDialogProps {
  trigger?: React.ReactNode;
  service?: ServiceRecord | null; 
  quote?: Partial<QuoteRecord> | null;
  vehicles: Vehicle[]; 
  technicians: Technician[]; 
  inventoryItems: InventoryItem[]; 
  onSave?: (data: ServiceRecord | QuoteRecord) => Promise<void>; 
  isReadOnly?: boolean; 
  open?: boolean; 
  onOpenChange?: (isOpen: boolean) => void; 
  onVehicleCreated?: (newVehicle: Vehicle) => void; 
  mode?: 'service' | 'quote';
  onDelete?: (id: string) => void; 
  onCancelService?: (serviceId: string, reason: string) => void;
  onViewQuoteRequest?: (serviceId: string) => void;
}

export function ServiceDialog({ 
  trigger, 
  service, 
  quote,
  vehicles, 
  technicians, 
  inventoryItems, 
  onSave, 
  isReadOnly = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onVehicleCreated,
  mode = 'service', 
  onDelete,
  onCancelService,
  onViewQuoteRequest,
}: ServiceDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  useEffect(() => {
    if (open && service && mode === 'service') {
      let changed = false;
      if (service.customerSignatureReception && !service.receptionSignatureViewed) {
        service.receptionSignatureViewed = true;
        changed = true;
      }
      if (service.customerSignatureDelivery && !service.deliverySignatureViewed) {
        service.deliverySignatureViewed = true;
        changed = true;
      }
      
      if (changed) {
        const serviceIndex = placeholderServiceRecords.findIndex(s => s.id === service.id);
        if (serviceIndex > -1) {
          placeholderServiceRecords[serviceIndex] = { ...service };
          persistToFirestore(['serviceRecords']).catch(err => console.error("Failed to mark signature as viewed", err));
        }
      }
    }
  }, [open, service, mode]);

  const internalOnSave = async (formData: ServiceRecord | QuoteRecord) => {
    if (isReadOnly) {
      onOpenChange(false);
      return;
    }

    try {
      const isNew = !formData.id;
      const recordId = formData.id || `doc_${Date.now().toString(36)}`;
      
      const recordToSave: ServiceRecord = { 
        ...formData,
        id: recordId,
        quoteDate: formData.status === 'Cotizacion' ? (formData.quoteDate || new Date()).toISOString() : formData.quoteDate?.toISOString(),
        serviceDate: formData.status !== 'Cotizacion' ? (formData.serviceDate || new Date()).toISOString() : formData.serviceDate?.toISOString(),
      } as ServiceRecord;

      const recordIndex = placeholderServiceRecords.findIndex(q => q.id === recordId);
      
      if (recordIndex > -1) {
        placeholderServiceRecords[recordIndex] = recordToSave;
      } else {
        placeholderServiceRecords.push(recordToSave);
      }
      
      const actionType = isNew ? 'Crear' : 'Editar';
      const entityType = recordToSave.status === 'Cotizacion' ? 'Cotización' : 'Servicio';
      const description = `${isNew ? 'Creó' : 'Actualizó'} la ${entityType.toLowerCase()} #${recordId} para el vehículo ${recordToSave.vehicleIdentifier}.`;
      
      await logAudit(actionType, description, { entityType, entityId: recordId });
      await persistToFirestore(['serviceRecords', 'auditLogs']);

      toast({
        title: `${entityType} ${isNew ? 'creada' : 'actualizada'}`,
        description: `Se han guardado los cambios para ${recordId}.`,
      });

      if (onSave) {
        await onSave(formData);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error(`Error saving ${mode} from dialog:`, error);
      toast({
        title: `Error al Guardar ${mode === 'quote' ? 'Cotización' : 'Servicio'}`,
        description: `Ocurrió un problema al intentar guardar desde el diálogo.`,
        variant: "destructive",
      });
    }
  };
  
  const dialogTitle = isReadOnly 
    ? (mode === 'quote' ? "Detalles de la Cotización" : "Detalles del Servicio")
    : (service || quote 
      ? (mode === 'quote' ? "Editar Cotización" : "Editar Servicio") 
      : (mode === 'quote' ? "Nueva Cotización" : "Nuevo Servicio"));

  const dialogDescription = isReadOnly
    ? (mode === 'quote' ? "Visualizando los detalles de la cotización." : "Visualizando los detalles de la orden de servicio.")
    : (service || quote
      ? (mode === 'quote' ? "Actualiza los detalles de la cotización." : "Actualiza los detalles de la orden de servicio.")
      : (mode === 'quote' ? "Completa la información para una nueva cotización." : "Completa la información para una nueva orden de servicio."));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[900px] xl:max-w-6xl flex flex-col max-h-[90vh] print:hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto -mx-6 px-6 print:overflow-visible">
          <ServiceForm
            initialDataService={mode === 'service' ? service : null}
            initialDataQuote={quote || (mode === 'quote' ? (service as any) : null)}
            vehicles={vehicles} 
            technicians={technicians}
            inventoryItems={inventoryItems}
            onSubmit={internalOnSave}
            onClose={() => onOpenChange(false)}
            isReadOnly={isReadOnly}
            onVehicleCreated={onVehicleCreated} 
            mode={mode}
            onDelete={onDelete}
            onCancelService={onCancelService}
            onViewQuoteRequest={onViewQuoteRequest}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
