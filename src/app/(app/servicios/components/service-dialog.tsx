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
import { persistToFirestore, placeholderServiceRecords } from '@/lib/placeholder-data';
import { db } from '@/lib/firebaseClient.js';
import { doc, getDoc } from 'firebase/firestore';


interface ServiceDialogProps {
  trigger?: React.ReactNode;
  service?: ServiceRecord | null; 
  quote?: Partial<QuoteRecord> | null; // For quote mode initialization
  vehicles: Vehicle[]; 
  technicians: Technician[]; 
  inventoryItems: InventoryItem[]; 
  onSave: (data: ServiceRecord | QuoteRecord) => Promise<void>; 
  isReadOnly?: boolean; 
  open?: boolean; 
  onOpenChange?: (isOpen: boolean) => void; 
  onVehicleCreated?: (newVehicle: Vehicle) => void; 
  mode?: 'service' | 'quote'; // New mode prop
  onDelete?: (id: string) => void; // For quote deletion
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
  mode = 'service', // Default to service mode
  onDelete,
  onCancelService,
  onViewQuoteRequest,
}: ServiceDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  // Mark signatures as "viewed" when the dialog opens
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

  const handleSubmit = async (formData: ServiceRecord | QuoteRecord) => { 
    if (isReadOnly) {
      if (onOpenChange) onOpenChange(false);
      else setUncontrolledOpen(false);
      return;
    }
    try {
      await onSave(formData); 
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
            onSubmit={handleSubmit}
            onClose={() => { if (onOpenChange) onOpenChange(false); else setUncontrolledOpen(false); }}
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
