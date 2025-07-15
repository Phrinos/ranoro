
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
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
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
  onComplete?: (service: ServiceRecord, paymentDetails: any, nextServiceInfo?: any) => void;
  isReadOnly?: boolean; 
  open?: boolean; 
  onOpenChange?: (isOpen: boolean) => void; 
  onVehicleCreated?: (newVehicle: Omit<Vehicle, 'id'>) => void; 
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
      setFormStatus(service?.status);
    }
  }, [open, service]);

  useEffect(() => {
    if (!open || !service?.id || mode !== 'service' || !db) return;

    // Listen for real-time signature updates from the public document
    const publicDocRef = doc(db, 'publicServices', service.publicId || service.id);
    const unsubscribe = onSnapshot(publicDocRef, async (publicDocSnap) => {
        if (!publicDocSnap.exists()) return;

        const publicData = publicDocSnap.data() as ServiceRecord;
        const serviceDocRef = doc(db, 'serviceRecords', service.id);
        const currentServiceSnap = await getDoc(serviceDocRef);
        
        if (!currentServiceSnap.exists()) return;
        const currentServiceData = currentServiceSnap.data() as ServiceRecord;
        
        let changed = false;
        const updates: Partial<ServiceRecord> = {};

        if (publicData.customerSignatureReception && !currentServiceData.customerSignatureReception) {
            updates.customerSignatureReception = publicData.customerSignatureReception;
            changed = true;
        }
        if (publicData.customerSignatureDelivery && !currentServiceData.customerSignatureDelivery) {
            updates.customerSignatureDelivery = publicData.customerSignatureDelivery;
            changed = true;
        }

        if (updates.customerSignatureReception && !currentServiceData.receptionSignatureViewed) {
            updates.receptionSignatureViewed = true;
            changed = true;
        }
        if (updates.customerSignatureDelivery && !currentServiceData.deliverySignatureViewed) {
            updates.deliverySignatureViewed = true;
            changed = true;
        }
        
        if (changed) {
            await setDoc(serviceDocRef, updates, { merge: true });
        }
    }, (error) => {
        console.error("Error listening to public service document:", error);
    });

    return () => unsubscribe(); // Cleanup the listener when the dialog closes or dependencies change
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
            case 'Cotizacion': return { title: 'Detalles de la Cotización', description: 'Visualizando los detalles de la cotización.' };
            case 'Agendado': return { title: 'Detalles de la Cita', description: 'Visualizando los detalles de la cita agendada.' };
            default: return { title: 'Detalles del Servicio', description: 'Visualizando los detalles de la orden de servicio.' };
        }
    }

    if (currentRecord?.id) { // Editing existing record
        switch (status) {
            case 'Cotizacion': return { title: 'Editar Cotización', description: 'Actualiza los detalles de la cotización.' };
            case 'Agendado': return { title: 'Editar Cita', description: 'Actualiza los detalles de la cita.' };
            default: return { title: 'Editar Servicio', description: 'Actualiza los detalles de la orden de servicio.' };
        }
    }
    
    // Creating new record
    switch (status) {
        case 'Cotizacion': return { title: 'Nueva Cotización', description: 'Completa la información para una nueva cotización.' };
        case 'Agendado': return { title: 'Nueva Cita', description: 'Completa la información para una nueva cita.' };
        case 'En Taller': return { title: 'Nuevo Servicio', description: 'Completa la información para una nueva orden de servicio.' };
        default: return { title: 'Nuevo Registro', description: 'Selecciona un estado para continuar.' };
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
          onCancelService={onCancelService}
          isReadOnly={isReadOnly}
          mode={mode}
          onStatusChange={setFormStatus}
          onVehicleCreated={onVehicleCreated}
        />
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
