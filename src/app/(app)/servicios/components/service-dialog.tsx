

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
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, User, ServiceTypeRecord } from "@/types";
import { useToast } from "@/hooks/use-toast"; 
import { db } from '@/lib/firebaseClient.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { operationsService } from '@/lib/services';
import { CompleteServiceDialog } from './CompleteServiceDialog';


interface ServiceDialogProps {
  trigger?: React.ReactNode;
  service?: ServiceRecord | null; 
  quote?: Partial<QuoteRecord> | null; // For quote mode initialization
  vehicles: Vehicle[]; 
  technicians: Technician[]; 
  inventoryItems: InventoryItem[]; 
  serviceTypes: ServiceTypeRecord[];
  onSave?: (data: ServiceRecord | QuoteRecord) => Promise<void>; 
  isReadOnly?: boolean; 
  open?: boolean; 
  onOpenChange?: (isOpen: boolean) => void; 
  onVehicleCreated?: (newVehicle: Omit<Vehicle, 'id'>) => void; 
  mode?: 'service' | 'quote'; // New mode prop
  onDelete?: (id: string) => void; // For quote deletion
  onCancelService?: (serviceId: string, reason: string) => void;
  onViewQuoteRequest?: (serviceId: string) => void;
  onComplete?: (service: ServiceRecord, paymentDetails: any, nextServiceInfo?: any) => void;
  children?: React.ReactNode;
}

export function ServiceDialog({ 
  trigger, 
  service, 
  quote,
  vehicles, 
  technicians, 
  inventoryItems, 
  serviceTypes,
  onSave, 
  onComplete,
  isReadOnly = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onVehicleCreated,
  mode = 'service', // Default to service mode
  onDelete,
  onCancelService,
  onViewQuoteRequest,
  children,
}: ServiceDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();

  const [formStatus, setFormStatus] = useState<ServiceRecord['status'] | undefined>(service?.status || quote?.status);

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;
  
  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [fullFormDataForCompletion, setFullFormDataForCompletion] = useState<any>(null);


  useEffect(() => {
    if(open) {
      setFormStatus(service?.status || quote?.status);
    }
  }, [open, service, quote]);

  useEffect(() => {
    const syncAndMarkAsViewed = async () => {
      if (open && service?.id && mode === 'service') { // Only run if service exists
        let changed = false;
        const serviceDocRef = doc(db, "serviceRecords", service.id);
        const currentDocSnap = await getDoc(serviceDocRef);

        if (!currentDocSnap.exists()) return; // Don't try to update a non-existent doc

        let serviceToUpdate = { ...currentDocSnap.data() } as ServiceRecord;

        if (service.publicId) {
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

        if (serviceToUpdate.customerSignatureReception && !serviceToUpdate.receptionSignatureViewed) {
          serviceToUpdate.receptionSignatureViewed = true;
          changed = true;
        }
        if (serviceToUpdate.customerSignatureDelivery && !serviceToUpdate.deliverySignatureViewed) {
          serviceToUpdate.deliverySignatureViewed = true;
          changed = true;
        }
        
        if (changed) {
          // Use setDoc with merge to safely update or create fields
          await setDoc(serviceDocRef, { 
              customerSignatureReception: serviceToUpdate.customerSignatureReception,
              customerSignatureDelivery: serviceToUpdate.customerSignatureDelivery,
              receptionSignatureViewed: serviceToUpdate.receptionSignatureViewed,
              deliverySignatureViewed: serviceToUpdate.deliverySignatureViewed,
           }, { merge: true });
        }
      }
    };
    if (open) {
      syncAndMarkAsViewed();
    }
  }, [open, service, mode]);
  
  const handleInternalCompletion = async (service: ServiceRecord, paymentDetails: any, nextServiceInfo?: any) => {
    if (onComplete) {
      const serviceWithAllData = { ...service, ...fullFormDataForCompletion, nextServiceInfo };
      await onComplete(serviceWithAllData, paymentDetails, nextServiceInfo);
    }
    onOpenChange(false);
    setIsCompleteDialogOpen(false);
  };


  const internalOnSave = async (formData: ServiceRecord | QuoteRecord) => {
    if (isReadOnly) {
      onOpenChange(false);
      return;
    }

    if ('status' in formData && formData.status === 'Entregado' && service?.status !== 'Entregado') {
        setFullFormDataForCompletion(formData);
        setServiceToComplete(formData as ServiceRecord);
        setIsCompleteDialogOpen(true);
        return;
    }

    try {
        const savedRecord = await operationsService.saveService(formData);
        toast({ title: 'Registro ' + (formData.id ? 'actualizado' : 'creado') + ' con éxito.' });
        if (onSave) {
            await onSave(savedRecord);
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
    const status = formStatus || currentRecord?.status;

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
    switch (status) {
        case 'Cotizacion': return { title: "Nueva Cotización", description: "Completa la información para una nueva cotización." };
        case 'Agendado': return { title: "Nueva Cita", description: "Completa la información para una nueva cita." };
        case 'En Taller': return { title: "Nuevo Servicio", description: "Completa la información para una nueva orden de servicio." };
        default: return { title: "Nuevo Registro", description: "Selecciona un estado para continuar." };
    }
  };


  const { title: dialogTitle, description: dialogDescription } = getDynamicTitles();
      
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[900px] xl:max-w-6xl flex flex-col max-h-[90vh] print:hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <ServiceForm
          initialDataService={service}
          vehicles={vehicles} 
          technicians={technicians}
          inventoryItems={inventoryItems}
          serviceTypes={serviceTypes}
          onSubmit={internalOnSave}
          onClose={() => onOpenChange(false)}
          isReadOnly={isReadOnly}
          onVehicleCreated={onVehicleCreated} 
          mode={mode}
          onStatusChange={setFormStatus}
        >
             {children}
        </ServiceForm>
      </DialogContent>
    </Dialog>

    {serviceToComplete && (
        <CompleteServiceDialog
            open={isCompleteDialogOpen}
            onOpenChange={setIsCompleteDialogOpen}
            service={serviceToComplete}
            onConfirm={handleInternalCompletion}
            inventoryItems={inventoryItems}
        />
      )}
    </>
  );
}
