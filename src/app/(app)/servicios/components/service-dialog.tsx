

"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { operationsService } from '@/lib/services';
import { Button } from '@/components/ui/button';
import { Ban, Eye } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { CompleteServiceDialog } from './CompleteServiceDialog';


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
  onComplete?: (service: ServiceRecord, paymentDetails: any, nextServiceInfo?: any) => void;
}

export function ServiceDialog({ 
  trigger, 
  service: initialService, 
  vehicles, 
  technicians, 
  inventoryItems, 
  serviceTypes,
  onSave,
  onComplete,
  isReadOnly = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  mode = 'service',
  onCancelService,
}: ServiceDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();
  
  const [localService, setLocalService] = useState(initialService);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [fullFormDataForCompletion, setFullFormDataForCompletion] = useState<any>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  useEffect(() => {
    setLocalService(initialService);
  }, [initialService]);

  useEffect(() => {
    if (open) {
      const syncSignatures = async () => {
        if (initialService && initialService.id && initialService.publicId && db) {
          try {
            const publicDocRef = doc(db, 'publicServices', initialService.publicId);
            const publicDocSnap = await getDoc(publicDocRef);
            
            if (publicDocSnap.exists()) {
              const publicData = publicDocSnap.data() as ServiceRecord;
              const updates: Partial<ServiceRecord> = {};
              let needsUpdate = false;

              if (publicData.customerSignatureReception && !initialService.customerSignatureReception) {
                updates.customerSignatureReception = publicData.customerSignatureReception;
                needsUpdate = true;
              }
              if (publicData.customerSignatureDelivery && !initialService.customerSignatureDelivery) {
                updates.customerSignatureDelivery = publicData.customerSignatureDelivery;
                needsUpdate = true;
              }

              if (needsUpdate) {
                const mainServiceRef = doc(db, 'serviceRecords', initialService.id);
                await updateDoc(mainServiceRef, updates);
                
                setLocalService(prev => ({ ...prev, ...updates } as ServiceRecord));
                
                toast({ title: "Firmas sincronizadas", description: "Se han cargado nuevas firmas del cliente." });
              }
            }
          } catch (e) {
            console.error("Failed to sync signatures from public doc:", e);
          }
        }
      };

      setLocalService(initialService);
      syncSignatures();
    }
  }, [open, initialService, toast]);

  const handleInternalCompletion = async (service: ServiceRecord, paymentDetails: any, nextServiceInfo?: any) => {
    if (onComplete) {
      await onComplete(service, paymentDetails, nextServiceInfo);
    }
    // Update local state to reflect completion, which will cause the form to re-render
    setLocalService(prev => ({ ...prev, ...paymentDetails, status: 'Entregado', nextServiceInfo } as ServiceRecord));
    setIsCompleteDialogOpen(false);
  };

  const internalOnSave = async (formData: ServiceRecord | QuoteRecord) => {
    if (isReadOnly) { onOpenChange(false); return; }

    if ('status' in formData && formData.status === 'Entregado' && localService?.status !== 'Entregado') {
        setFullFormDataForCompletion(formData);
        setServiceToComplete(formData as ServiceRecord);
        setIsCompleteDialogOpen(true);
        return;
    }

    try {
        const savedRecord = await operationsService.saveService(formData);
        toast({ title: 'Registro ' + (formData.id ? 'actualizado' : 'creado') + ' con éxito.' });
        if (onSave) { await onSave(savedRecord); }
        onOpenChange(false);
    } catch (error) {
        console.error(`Error saving ${mode} from dialog:`, error);
        toast({ title: `Error al Guardar ${mode === 'quote' ? 'Cotización' : 'Servicio'}`, description: `Ocurrió un problema.`, variant: "destructive" });
    }
  };
  
  const getDynamicTitles = () => {
    const status = localService?.status;
    if (isReadOnly) {
        switch (status) {
            case 'Cotizacion': return { title: "Detalles de la Cotización", description: "Visualizando los detalles de la cotización." };
            case 'Agendado': return { title: "Detalles de la Cita", description: "Visualizando los detalles de la cita agendada." };
            default: return { title: "Detalles del Servicio", description: "Visualizando los detalles de la orden de servicio." };
        }
    }
    if (localService?.id) {
        switch (status) {
            case 'Cotizacion': return { title: "Editar Cotización", description: "Actualiza los detalles de la cotización." };
            case 'Agendado': return { title: "Editar Cita", description: "Actualiza los detalles de la cita." };
            default: return { title: "Editar Servicio", description: "Actualiza los detalles de la orden de servicio." };
        }
    }
    return { title: "Nuevo Registro", description: "Completa la información para un nuevo registro." };
  };

  const { title: dialogTitle, description: dialogDescription } = getDynamicTitles();
  const canBeCancelled = localService?.id && localService.status !== 'Cancelado' && localService.status !== 'Entregado';
  
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
            </DialogHeader>
            <ServiceForm
              initialDataService={localService}
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
                                {localService?.id ? 'Actualizar' : 'Crear'}
                            </Button>
                        </>
                        )}
                    </div>
                </div>
            </ServiceForm>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>¿Está seguro de cancelar este servicio?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. El estado se cambiará a "Cancelado".</AlertDialogDescription></AlertDialogHeader>
              <Textarea placeholder="Motivo de la cancelación (opcional)..." value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} />
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setCancellationReason('')}>Cerrar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { if(localService?.id && onCancelService) { onCancelService(localService.id, cancellationReason); onOpenChange(false); } }} className="bg-destructive hover:bg-destructive/90">
                      Sí, Cancelar Servicio
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {serviceToComplete && (
        <CompleteServiceDialog
          open={isCompleteDialogOpen}
          onOpenChange={setIsCompleteDialogOpen}
          service={serviceToComplete}
          onConfirm={handleInternalCompletion}
          inventoryItems={inventoryItems}
          fullFormData={fullFormDataForCompletion}
        />
      )}
    </>
  );
}
