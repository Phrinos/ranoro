
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
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, User } from "@/types";
import { useToast } from "@/hooks/use-toast"; 
import { persistToFirestore, placeholderServiceRecords, logAudit, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { db } from '@/lib/firebaseClient.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';


interface ServiceDialogProps {
  trigger?: React.ReactNode;
  service?: ServiceRecord | null; 
  quote?: Partial<QuoteRecord> | null; // For quote mode initialization
  vehicles: Vehicle[]; 
  technicians: Technician[]; 
  inventoryItems: InventoryItem[]; 
  onSave?: (data: ServiceRecord | QuoteRecord) => Promise<void>; 
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
    const syncAndMarkAsViewed = async () => {
      if (open && service && service.id && mode === 'service') {
        let changed = false;
        let serviceToUpdate = { ...service };

        // Sync from public document first
        if (service.publicId && db) {
          try {
            const publicDocRef = doc(db, 'publicServices', service.publicId);
            const publicDocSnap = await getDoc(publicDocRef);

            if (publicDocSnap.exists()) {
              const publicData = publicDocSnap.data() as ServiceRecord;
              if (publicData.customerSignatureReception && !serviceToUpdate.customerSignatureReception) {
                serviceToUpdate.customerSignatureReception = publicData.customerSignatureReception;
                changed = true;
              }
              if (publicData.customerSignatureDelivery && !serviceToUpdate.customerSignatureDelivery) {
                serviceToUpdate.customerSignatureDelivery = publicData.customerSignatureDelivery;
                changed = true;
              }
            }
          } catch (e) {
            console.error("Failed to sync signatures from public doc:", e);
          }
        }

        // Now, mark as viewed
        if (serviceToUpdate.customerSignatureReception && !serviceToUpdate.receptionSignatureViewed) {
          serviceToUpdate.receptionSignatureViewed = true;
          changed = true;
        }
        if (serviceToUpdate.customerSignatureDelivery && !serviceToUpdate.deliverySignatureViewed) {
          serviceToUpdate.deliverySignatureViewed = true;
          changed = true;
        }
        
        if (changed) {
          // This should now trigger a re-render in the parent through the onSave prop if available
          // or directly update firestore
          const serviceDocRef = doc(db, "serviceRecords", service.id);
          await setDoc(serviceDocRef, { 
              customerSignatureReception: serviceToUpdate.customerSignatureReception,
              customerSignatureDelivery: serviceToUpdate.customerSignatureDelivery,
              receptionSignatureViewed: serviceToUpdate.receptionSignatureViewed,
              deliverySignatureViewed: serviceToUpdate.deliverySignatureViewed,
           }, { merge: true });
        }
      }
    };
    syncAndMarkAsViewed();
  }, [open, service, mode]);

  const internalOnSave = async (formData: ServiceRecord | QuoteRecord) => {
    if (isReadOnly) {
      onOpenChange(false);
      return;
    }

    try {
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
  
  const getDynamicTitles = () => {
    const currentRecord = service || quote;
    const status = currentRecord?.status;

    if (isReadOnly) {
        switch (status) {
            case 'Cotizacion': return { title: "Detalles de la Cotización", description: "Visualizando los detalles de la cotización." };
            case 'Agendado': return { title: "Detalles de la Cita", description: "Visualizando los detalles de la cita agendada." };
            default: return { title: "Detalles del Servicio", description: "Visualizando los detalles de la orden de servicio." };
        }
    }

    if (currentRecord?.id) { // Editing existing record
        switch (status) {
            case 'Cotizacion': return { title: "Editar Cotización", description: "Actualiza los detalles de la cotización." };
            case 'Agendado': return { title: "Editar Cita", description: "Actualiza los detalles de la cita." };
            default: return { title: "Editar Servicio", description: "Actualiza los detalles de la orden de servicio." };
        }
    }
    
    // Creating new record
    return { 
        title: mode === 'quote' ? "Nueva Cotización" : "Nuevo Servicio", 
        description: mode === 'quote' ? "Completa la información para una nueva cotización." : "Completa la información para una nueva orden de servicio." 
    };
  };

  const { title: dialogTitle, description: dialogDescription } = getDynamicTitles();
      
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
