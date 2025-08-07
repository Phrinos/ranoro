

// src/app/(app)/servicios/components/service-form.tsx
"use client";

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Loader2, Save, X, Ban, Wrench, ShieldCheck, Camera, FileText, Eye, Trash2 } from 'lucide-react';
import type { ServiceFormValues } from '@/schemas/service-form';
import type { ServiceRecord, Vehicle, User, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier, QuoteRecord } from '@/types'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Image from 'next/image';
import { ServiceDetailsCard } from './ServiceDetailsCard';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';
import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog';
import { useToast } from '@/hooks/use-toast';
import { normalizeDataUrl } from '@/lib/utils';
import { enhanceText } from '@/ai/flows/text-enhancement-flow';
import { SignatureDialog } from './signature-dialog';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PaymentDetailsDialog } from './PaymentDetailsDialog';
import { serviceService } from '@/lib/services';
import { db } from '@/lib/firebaseClient';
import { writeBatch } from 'firebase/firestore';


// Lazy load complex components
const ServiceItemsList = lazy(() => import('./ServiceItemsList').then(module => ({ default: module.ServiceItemsList })));
const PaymentSection = lazy(() => import('./PaymentSection').then(module => ({ default: module.PaymentSection })));
const VehicleSelectionCard = lazy(() => import('./VehicleSelectionCard').then(module => ({ default: module.VehicleSelectionCard })));
const SafetyChecklist = lazy(() => import('./SafetyChecklist').then(module => ({ default: module.SafetyChecklist })));
const PhotoReportTab = lazy(() => import('./PhotoReportTab').then(module => ({ default: module.PhotoReportTab })));
const ReceptionAndDelivery = lazy(() => import('./ReceptionAndDelivery').then(module => ({ default: module.ReceptionAndDelivery })));


interface ServiceFormProps {
  vehicles: Vehicle[];
  technicians: User[];
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  serviceHistory: ServiceRecord[];
  onSubmit: (data: ServiceFormValues) => Promise<void>;
  onClose: () => void;
  isReadOnly?: boolean;
  mode: 'service' | 'quote';
  onVehicleCreated?: (newVehicle: VehicleFormValues) => Promise<void>;
  onDelete?: (id: string) => void;
  onCancelService?: (id: string, reason: string) => void;
}

export function ServiceForm({
  vehicles,
  technicians,
  inventoryItems,
  serviceTypes,
  categories,
  suppliers,
  serviceHistory,
  onSubmit,
  onClose,
  isReadOnly,
  mode,
  onVehicleCreated,
  onDelete,
  onCancelService,
}: ServiceFormProps) {
  const { toast } = useToast();
  const methods = useFormContext<ServiceFormValues>();
  
  const [activeTab, setActiveTab] = useState('servicio');
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false);
  const [newVehicleInitialPlate, setNewVehicleInitialPlate] = useState<string | undefined>(undefined);
  
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<'reception' | 'delivery' | 'technician' | null>(null);

  const [isEnhancingText, setIsEnhancingText] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const { reset, handleSubmit, getValues, setValue, watch, formState } = methods;

  const initialData = watch();
  const isEditing = !!initialData?.id;
  const isQuote = initialData?.status === 'Cotizacion' || mode === 'quote';

  const handleFormSubmit = async (values: ServiceFormValues) => {
    if (isReadOnly) return;
    
    const serviceRecordValues = values as ServiceRecord;

    if (serviceRecordValues.status === 'Entregado' && initialData?.status !== 'Entregado') {
        setServiceToComplete({ ...(initialData || {}), ...serviceRecordValues } as ServiceRecord);
        setIsPaymentDialogOpen(true);
        return;
    }
    
    await onSubmit(values);
  };
  
  const handleCompleteService = async (paymentDetails: PaymentDetailsFormValues) => {
    if (!serviceToComplete || !db) return;
    try {
        const batch = writeBatch(db);
        await serviceService.completeService(serviceToComplete, { ...paymentDetails, nextServiceInfo: serviceToComplete.nextServiceInfo }, batch);
        await batch.commit();
        toast({ title: "Servicio Completado" });
        setIsPaymentDialogOpen(false);
        setServiceToComplete(null);
        onClose(); // Close the main dialog
    } catch(e) {
        toast({ title: "Error al completar", variant: "destructive"});
    }
  };

  const handleOpenNewVehicleDialog = (plate?: string) => {
    setNewVehicleInitialPlate(plate);
    setIsNewVehicleDialogOpen(true);
  };
  
  const handleVehicleCreated = async (data: VehicleFormValues) => {
    if (onVehicleCreated) {
        await onVehicleCreated(data);
    }
    setIsNewVehicleDialogOpen(false);
  };

  const handleOpenSignature = (type: 'reception' | 'delivery' | 'technician') => {
    setSignatureTarget(type);
    setIsSignatureDialogOpen(true);
  };
  
  const handleSaveSignature = (signatureDataUrl: string) => {
    if (signatureTarget) {
      const fieldToUpdate: any = signatureTarget === 'technician' 
        ? `safetyInspection.technicianSignature` 
        : signatureTarget === 'delivery' 
        ? "customerSignatureDelivery" 
        : "customerSignatureReception";
      setValue(fieldToUpdate, signatureDataUrl, { shouldDirty: true });
    }
    setIsSignatureDialogOpen(false);
    setSignatureTarget(null);
  };

  const handleEnhanceText = async (fieldName: any) => {
    const currentValue = getValues(fieldName);
    if (typeof currentValue !== 'string' || !currentValue) return;

    setIsEnhancingText(fieldName);
    try {
      let context = 'Notas del Servicio';
      if (fieldName.includes('vehicleConditions')) context = 'Condiciones del Vehículo';
      if (fieldName.includes('customerItems')) context = 'Pertenencias del Cliente';
      if (fieldName.includes('safetyInspection.inspectionNotes')) context = 'Observaciones de Inspección';
      if (fieldName.includes('notes')) context = 'Notas Adicionales';
      const result = await enhanceText({ text: currentValue, context });
      setValue(fieldName, result, { shouldDirty: true });
      toast({ title: "Texto Mejorado", description: "La IA ha optimizado la redacción." });
    } catch (error) {
      toast({ title: "Error de IA", description: "No se pudo mejorar el texto.", variant: "destructive" });
    } finally {
      setIsEnhancingText(null);
    }
  };
  
  const handlePhotoUploaded = (reportIndex: number, url: string) => {
    const currentPhotos = getValues(`photoReports.${reportIndex}.photos`) || [];
    setValue(`photoReports.${reportIndex}.photos`, [...currentPhotos, url], { shouldDirty: true });
  };
  
  const handleChecklistPhotoUploaded = (itemName: `safetyInspection.${string}`, url: string) => {
    const currentItemValue = getValues(itemName) || { photos: [] };
    setValue(itemName, { ...currentItemValue, photos: [...(currentItemValue.photos || []), url] }, { shouldDirty: true });
  };
  
  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };
  
  const watchedStatus = watch('status');
  const showTabs = !isQuote && watchedStatus !== 'Agendado';

  return (
      <form id="service-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 flex-grow overflow-y-auto px-6 py-4">
        <div className="space-y-4">
          <ServiceDetailsCard isReadOnly={isReadOnly} users={technicians} serviceTypes={serviceTypes} />
          <VehicleSelectionCard 
            isReadOnly={isReadOnly} 
            localVehicles={vehicles} 
            serviceHistory={serviceHistory}
            onVehicleSelected={(v) => setValue('vehicleIdentifier', v?.licensePlate)} 
            onOpenNewVehicleDialog={handleOpenNewVehicleDialog}
          />
        </div>

        {showTabs ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="h-auto flex flex-wrap w-full gap-2 sm:gap-4 p-0 bg-transparent">
                    <button type="button" onClick={() => setActiveTab('servicio')} className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80" data-state={activeTab === 'servicio' ? 'active' : 'inactive'}>Servicio</button>
                    <button type="button" onClick={() => setActiveTab('entrega')} className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80" data-state={activeTab === 'entrega' ? 'active' : 'inactive'}>Recepción/Entrega</button>
                    <button type="button" onClick={() => setActiveTab('fotos')} className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80" data-state={activeTab === 'fotos' ? 'active' : 'inactive'}>Reporte Fotográfico</button>
                    <button type="button" onClick={() => setActiveTab('revision')} className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80" data-state={activeTab === 'revision' ? 'active' : 'inactive'}>Puntos Seguridad</button>
                </TabsList>
                <TabsContent value="servicio" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                        <div className="lg:col-span-3"><Suspense fallback={<Loader2 className="animate-spin" />}><ServiceItemsList isReadOnly={isReadOnly} inventoryItems={inventoryItems} mode={mode} onNewInventoryItemCreated={handleVehicleCreated as any} categories={categories} suppliers={suppliers} serviceTypes={serviceTypes} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any}/></Suspense></div>
                        <div className="lg:col-span-2 space-y-6"><Suspense fallback={<Loader2 className="animate-spin" />}><PaymentSection isReadOnly={isReadOnly}/></Suspense></div>
                    </div>
                </TabsContent>
                <TabsContent value="entrega" className="mt-6"><Suspense fallback={<Loader2 className="animate-spin" />}><ReceptionAndDelivery isReadOnly={isReadOnly} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} onOpenSignature={handleOpenSignature}/></Suspense></TabsContent>
                <TabsContent value="fotos" className="mt-6"><Suspense fallback={<Loader2 className="animate-spin" />}><PhotoReportTab isReadOnly={isReadOnly} serviceId={initialData?.id || 'new'} onPhotoUploaded={handlePhotoUploaded} onViewImage={handleViewImage}/></Suspense></TabsContent>
                <TabsContent value="revision" className="mt-6"><Suspense fallback={<Loader2 className="animate-spin" />}><SafetyChecklist isReadOnly={isReadOnly} onSignatureClick={() => handleOpenSignature('technician')} signatureDataUrl={watch('safetyInspection.technicianSignature')} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} serviceId={initialData?.id || 'new'} onPhotoUploaded={handleChecklistPhotoUploaded} onViewImage={handleViewImage}/></Suspense></TabsContent>
            </Tabs>
        ) : (
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start mt-6">
                <div className="lg:col-span-3"><Suspense fallback={<Loader2 className="animate-spin" />}><ServiceItemsList isReadOnly={isReadOnly} inventoryItems={inventoryItems} mode={mode} onNewInventoryItemCreated={handleVehicleCreated as any} categories={categories} suppliers={suppliers} serviceTypes={serviceTypes} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any}/></Suspense></div>
                <div className="lg:col-span-2 space-y-6"><Suspense fallback={<Loader2 className="animate-spin" />}><PaymentSection isReadOnly={isReadOnly}/></Suspense></div>
             </div>
        )}

        <div className="flex-shrink-0 flex justify-between items-center mt-6 pt-4 border-t px-6 pb-6 -mx-6 -mb-6 bg-background sticky bottom-0 z-10">
          <div>
            {(onDelete || onCancelService) && (
              <ConfirmDialog
                  triggerButton={
                      <Button variant="destructive" type="button" disabled={isReadOnly || initialData?.status === 'Cancelado'}>
                          {isQuote ? <Trash2 className="mr-2 h-4 w-4"/> : <Ban className="mr-2 h-4 w-4"/>}
                          {isQuote ? 'Eliminar Cotización' : 'Cancelar Servicio'}
                      </Button>
                  }
                  title={isQuote ? '¿Eliminar esta cotización?' : '¿Cancelar este servicio?'}
                  description={
                      isQuote 
                      ? 'Esta acción eliminará permanentemente el registro de la cotización. No se puede deshacer.'
                      : 'Esta acción marcará el servicio como cancelado, pero no se eliminará del historial. No se puede deshacer.'
                  }
                  onConfirm={() => {
                      if (isQuote && onDelete && initialData?.id) {
                          onDelete(initialData.id);
                      } else if (!isQuote && onCancelService && initialData?.id) {
                          const reason = prompt("Motivo de la cancelación:");
                          if(reason) onCancelService(initialData.id, reason);
                      }
                  }}
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" form="service-form" disabled={isReadOnly || formState.isSubmitting}>
              {formState.isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>}
              {initialData?.id ? 'Guardar Cambios' : 'Crear Registro'}
            </Button>
          </div>
        </div>

        <VehicleDialog
            open={isNewVehicleDialogOpen}
            onOpenChange={setIsNewVehicleDialogOpen}
            onSave={handleVehicleCreated}
            vehicle={{ licensePlate: newVehicleInitialPlate }}
        />
        <SignatureDialog
            open={isSignatureDialogOpen}
            onOpenChange={setIsSignatureDialogOpen}
            onSave={handleSaveSignature}
        />
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="max-w-4xl p-2 bg-transparent border-none shadow-none">
            {viewingImageUrl && (
              <div className="relative aspect-video w-full">
                <Image src={viewingImageUrl} alt="Vista ampliada" fill style={{ objectFit: 'contain' }} sizes="(max-width: 768px) 100vw, 1024px" />
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {serviceToComplete && (
            <PaymentDetailsDialog
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            record={serviceToComplete}
            onConfirm={handleCompleteService as any}
            isCompletionFlow={true}
            />
        )}
      </form>
  );
}
