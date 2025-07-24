"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ServiceForm } from "./service-form";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, User, ServiceTypeRecord, Personnel } from "@/types";
import { useToast } from "@/hooks/use-toast"; 
import { db } from '@/lib/firebaseClient.js';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { operationsService } from '@/lib/services';
import { CompleteServiceDialog } from './CompleteServiceDialog';
import { Button } from '@/components/ui/button';
import { Ban, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { useServiceTotals } from '@/hooks/use-service-form-hooks'


interface ServiceDialogProps {
  trigger?: React.ReactNode;
  service?: ServiceRecord | null; 
  quote?: Partial<QuoteRecord> | null; // For quote mode initialization
  vehicles: Vehicle[]; 
  technicians: Personnel[]; 
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
  const [cancellationReason, setCancellationReason] = useState("");
  const [totalCost, setTotalCost] = useState(0);


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

  
  const handleInternalCompletion = async (paymentDetails: any, nextServiceInfo?: any) => {
    if (onComplete && serviceToComplete) {
      await onComplete(serviceToComplete, paymentDetails, nextServiceInfo);
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
  const showCancelButton = !isReadOnly && service?.id && service.status !== 'Entregado' && service.status !== 'Cancelado';
      
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 flex-shrink-0 grid grid-cols-2">
            <div>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Costo Total del Servicio</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totalCost)}</p>
            </div>
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
          onTotalCostChange={setTotalCost}
        />
        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 bg-background flex flex-row justify-between items-center w-full gap-2">
            <div>
                {showCancelButton && onCancelService && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" title="Cancelar Servicio">
                                <Ban className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro de cancelar este servicio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción es permanente. Por favor, especifica un motivo para la cancelación.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Textarea 
                                placeholder="Motivo de la cancelación..."
                                value={cancellationReason}
                                onChange={(e) => setCancellationReason(e.target.value)}
                            />
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setCancellationReason('')}>Cerrar</AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={!cancellationReason.trim()}
                                    onClick={() => onCancelService?.(service!.id, cancellationReason)}
                                >
                                    Confirmar Cancelación
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
            <div className="flex flex-row gap-2 items-center">
               <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-initial">Cerrar</Button>
               {!isReadOnly && (
                   <Button 
                       type="submit" 
                       form="service-form" 
                       className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700"
                   >
                       {service?.id ? 'Guardar' : 'Crear Registro'}
                   </Button>
               )}
            </div>
        </DialogFooter>
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