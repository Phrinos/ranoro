

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
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, User, ServiceTypeRecord } from "@/types";
import { useToast } from "@/hooks/use-toast"; 
import { db } from '@/lib/firebaseClient.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { operationsService } from '@/lib/services';
import { Button } from '@/components/ui/button';
import { Ban, Eye } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';


interface ServiceDialogProps {
  trigger?: React.ReactNode;
  service?: ServiceRecord | null; 
  vehicles: Vehicle[]; 
  technicians: Technician[]; 
  inventoryItems: InventoryItem[]; 
  serviceTypes: ServiceTypeRecord[];
  onSave?: (data: ServiceRecord | QuoteRecord) => Promise<void>; 
  isReadOnly?: boolean; 
  open?: boolean; 
  onOpenChange?: (isOpen: boolean) => void; 
  mode?: 'service' | 'quote';
  onDelete?: (id: string) => void;
  onCancelService?: (serviceId: string, reason: string) => void;
  onViewQuoteRequest?: (serviceId: string) => void;
}

export function ServiceDialog({ 
  trigger, 
  service, 
  vehicles, 
  technicians, 
  inventoryItems, 
  serviceTypes,
  onSave, 
  isReadOnly = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  mode = 'service',
  onCancelService,
}: ServiceDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();
  
  const [currentService, setCurrentService] = useState(service);

  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;
  
   // Sync signatures and update local state when dialog opens or service prop changes
  useEffect(() => {
    const syncAndMarkAsViewed = async () => {
      if (open && service && service.id && db) {
        let serviceToUpdate = { ...service };
        let changed = false;

        // Sync from public document first
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

        // Now, check if signatures need to be marked as viewed
        if (serviceToUpdate.customerSignatureReception && !serviceToUpdate.receptionSignatureViewed) {
          serviceToUpdate.receptionSignatureViewed = true;
          changed = true;
        }
        if (serviceToUpdate.customerSignatureDelivery && !serviceToUpdate.deliverySignatureViewed) {
          serviceToUpdate.deliverySignatureViewed = true;
          changed = true;
        }
        
        // If there were any changes, update the main document in Firestore
        if (changed) {
          const serviceDocRef = doc(db, "serviceRecords", service.id);
          await setDoc(serviceDocRef, {
            customerSignatureReception: serviceToUpdate.customerSignatureReception,
            customerSignatureDelivery: serviceToUpdate.customerSignatureDelivery,
            receptionSignatureViewed: serviceToUpdate.receptionSignatureViewed,
            deliverySignatureViewed: serviceToUpdate.deliverySignatureViewed,
          }, { merge: true });
        }
        
        // Update the local state to reflect the changes immediately in the dialog
        setCurrentService(serviceToUpdate);
      } else {
        setCurrentService(service);
      }
    };
    syncAndMarkAsViewed();
  }, [open, service]);


  const internalOnSave = async (formData: ServiceRecord | QuoteRecord) => {
    if (isReadOnly) { onOpenChange(false); return; }
    try {
        const savedRecord = await operationsService.saveService(formData);
        toast({ title: `Registro ${formData.id ? 'actualizado' : 'creado'} con éxito.` });
        if (onSave) { await onSave(savedRecord); }
        onOpenChange(false);
    } catch (error) {
        console.error(`Error saving ${mode} from dialog:`, error);
        toast({ title: `Error al Guardar ${mode === 'quote' ? 'Cotización' : 'Servicio'}`, description: `Ocurrió un problema.`, variant: "destructive" });
    }
  };
  
  const getDynamicTitles = () => {
    const status = currentService?.status;
    if (isReadOnly) {
        switch (status) {
            case 'Cotizacion': return { title: "Detalles de la Cotización", description: "Visualizando los detalles de la cotización." };
            case 'Agendado': return { title: "Detalles de la Cita", description: "Visualizando los detalles de la cita agendada." };
            default: return { title: "Detalles del Servicio", description: "Visualizando los detalles de la orden de servicio." };
        }
    }
    if (currentService?.id) {
        switch (status) {
            case 'Cotizacion': return { title: "Editar Cotización", description: "Actualiza los detalles de la cotización." };
            case 'Agendado': return { title: "Editar Cita", description: "Actualiza los detalles de la cita." };
            default: return { title: "Editar Servicio", description: "Actualiza los detalles de la orden de servicio." };
        }
    }
    return { title: "Nuevo Registro", description: "Completa la información para un nuevo registro." };
  };

  const { title: dialogTitle, description: dialogDescription } = getDynamicTitles();
  const canBeCancelled = currentService?.id && currentService.status !== 'Cancelado' && currentService.status !== 'Entregado';
  
  // Create a dynamic key for the form that changes when a signature is added.
  const formKey = `${currentService?.id}-${currentService?.customerSignatureReception}-${currentService?.customerSignatureDelivery}`;


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
        <DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[900px] xl:max-w-6xl flex flex-col max-h-[90vh] print:hidden p-0">
            <DialogHeader className="p-6 pb-2 flex-shrink-0 flex flex-row justify-between items-start">
              <div>
                  <DialogTitle>{dialogTitle}</DialogTitle>
                  <DialogDescription>{dialogDescription}</DialogDescription>
              </div>
              {currentService && (
                  <Button variant="outline" size="icon" onClick={() => setIsPreviewOpen(true)}>
                      <Eye className="h-4 w-4" />
                  </Button>
              )}
            </DialogHeader>
            <ServiceForm
            key={formKey} // Force re-mount of the form when signatures change
            initialDataService={currentService}
            vehicles={vehicles} 
            technicians={technicians}
            inventoryItems={inventoryItems}
            serviceTypes={serviceTypes}
            onSubmit={internalOnSave}
            onClose={() => onOpenChange(false)}
            isReadOnly={isReadOnly}
            mode={mode}
            >
                <div className="flex justify-between items-center w-full">
                    <div>
                    {canBeCancelled && onCancelService && (
                        <Button variant="outline" type="button" onClick={() => setIsCancelAlertOpen(true)} className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive">
                            <Ban className="mr-2 h-4 w-4" /> Cancelar Servicio
                        </Button>
                    )}
                    </div>
                    <div className="flex gap-2">
                        {isReadOnly ? (
                        <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cerrar</Button>
                        ) : (
                        <>
                            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit" form="service-form">
                                {currentService?.id ? 'Actualizar' : 'Crear'}
                            </Button>
                        </>
                        )}
                    </div>
                </div>
            </ServiceForm>
        </DialogContent>
      </Dialog>
      
      {isPreviewOpen && currentService && (
        <UnifiedPreviewDialog
            open={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
            service={currentService}
        />
      )}

      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>¿Está seguro de cancelar este servicio?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. El estado se cambiará a "Cancelado".</AlertDialogDescription></AlertDialogHeader>
              <Textarea placeholder="Motivo de la cancelación (opcional)..." value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} />
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setCancellationReason('')}>Cerrar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { if(currentService?.id && onCancelService) { onCancelService(currentService.id, cancellationReason); onOpenChange(false); } }} className="bg-destructive hover:bg-destructive/90">
                      Sí, Cancelar Servicio
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
