
// src/app/(app)/servicios/components/ServiceForm.tsx
"use client";

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Loader2, Save, X, Ban, Trash2, BrainCircuit } from 'lucide-react';
import { serviceFormSchema, ServiceFormValues } from '@/schemas/service-form';
import { ServiceRecord, Vehicle, User, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier, QuoteRecord } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Image from 'next/image';
import { ServiceDetailsCard } from './ServiceDetailsCard';
import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';
import { useToast } from '@/hooks/use-toast';
import { enhanceText } from '@/ai/flows/text-enhancement-flow';
import { SignatureDialog } from './signature-dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { serviceService } from '@/lib/services';
import { db } from '@/lib/firebaseClient';
import { writeBatch } from 'firebase/firestore';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { PaymentDetailsFormValues } from '@/schemas/payment-details-form-schema';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ServiceSummary } from './ServiceSummary';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';


// Lazy load complex components
const ServiceItemsList = lazy(() => import('./ServiceItemsList').then(module => ({ default: module.ServiceItemsList })));
const VehicleSelectionCard = lazy(() => import('./VehicleSelectionCard').then(module => ({ default: module.VehicleSelectionCard })));
const SafetyChecklist = lazy(() => import('./SafetyChecklist').then(module => ({ default: module.SafetyChecklist })));
const PhotoReportTab = lazy(() => import('./PhotoReportTab').then(module => ({ default: module.PhotoReportTab })));
const ReceptionAndDelivery = lazy(() => import('./ReceptionAndDelivery').then(module => ({ default: module.ReceptionAndDelivery })));


interface ServiceFormWrapperProps {
  initialData: ServiceRecord | null;
  vehicles: Vehicle[];
  technicians: User[];
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  serviceHistory: ServiceRecord[];
  onSave: (data: ServiceFormValues) => Promise<void>;
  onDelete?: (id: string) => void;
  onCancelService?: (id: string, reason: string) => void;
  onVehicleCreated?: (newVehicle: VehicleFormValues) => Promise<void>;
  mode: 'service' | 'quote';
}

const COMMISSION_ITEM_ID = 'COMMISSION_FEE_SERVICE';

export function ServiceForm({
  initialData,
  vehicles,
  technicians,
  inventoryItems,
  serviceTypes,
  categories,
  suppliers,
  serviceHistory,
  onSave,
  onDelete,
  onCancelService,
  onVehicleCreated,
  mode,
}: ServiceFormWrapperProps) {
  const router = useRouter();

  const methods = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      ...initialData,
      notes: initialData?.notes ?? '',
      serviceDate: initialData?.serviceDate ? new Date(initialData.serviceDate) : new Date(),
      appointmentDateTime: initialData?.appointmentDateTime ? new Date(initialData.appointmentDateTime) : undefined,
      receptionDateTime: initialData?.receptionDateTime ? new Date(initialData.receptionDateTime) : undefined,
      deliveryDateTime: initialData?.deliveryDateTime ? new Date(initialData.deliveryDateTime) : undefined,
      allVehiclesForDialog: vehicles, 
    },
  });

  return (
    <FormProvider {...methods}>
      <ServiceFormContent
        initialData={initialData}
        vehicles={vehicles}
        technicians={technicians}
        inventoryItems={inventoryItems}
        serviceTypes={serviceTypes}
        categories={categories}
        suppliers={suppliers}
        serviceHistory={serviceHistory}
        onSubmit={onSave}
        onClose={() => router.back()}
        mode={mode}
        onVehicleCreated={onVehicleCreated}
        onDelete={onDelete}
        onCancelService={onCancelService}
      />
    </FormProvider>
  );
}

interface ServiceFormContentProps {
  initialData: ServiceRecord | null;
  vehicles: Vehicle[];
  technicians: User[];
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  serviceHistory: ServiceRecord[];
  onSubmit: (data: ServiceFormValues) => Promise<void>;
  onClose: () => void;
  mode: 'service' | 'quote';
  onVehicleCreated?: (newVehicle: VehicleFormValues) => Promise<void>;
  onDelete?: (id: string) => void;
  onCancelService?: (id: string, reason: string) => void;
}

function ServiceFormContent({
  initialData,
  vehicles,
  technicians,
  inventoryItems,
  serviceTypes,
  categories,
  suppliers,
  serviceHistory,
  onSubmit,
  onClose,
  mode,
  onVehicleCreated,
  onDelete,
  onCancelService,
}: ServiceFormContentProps) {
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [validationIndex, setValidationIndex] = useState<number | null>(null);
  const [validationFolio, setValidationFolio] = useState('');
  const [validatedFolios, setValidatedFolios] = useState<Record<number, boolean>>({});
  
  const { control, handleSubmit, getValues, setValue, watch, formState: { errors }, reset } = methods;

  const [originalLockedStatus, setOriginalLockedStatus] = useState<'Completado' | 'Entregado' | null>(null);

  const watchedPayments = watch('payments');
  const watchedServiceItems = watch('serviceItems');


   useEffect(() => {
    const allItems = getValues('serviceItems') || [];
    const totalAmount = (allItems || [])
        .filter((item: any) => item.id !== COMMISSION_ITEM_ID)
        .reduce((sum, item) => sum + (item.price || 0), 0) || 0;

    const hasCardPayment = watchedPayments?.some((p: any) => p.method === 'Tarjeta');
    const hasMSIPayment = watchedPayments?.some((p: any) => p.method === 'Tarjeta MSI');
    
    let commissionAmount = 0;
    if (hasCardPayment) commissionAmount += totalAmount * 0.041;
    if (hasMSIPayment) commissionAmount += totalAmount * 0.12;
    
    setValue('cardCommission', commissionAmount, { shouldDirty: true });
    
  }, [watchedPayments, watchedServiceItems, setValue, getValues]);


  useEffect(() => {
    const currentStatus = getValues('status') ?? initialData?.status;
    if (currentStatus === 'Completado' || currentStatus === 'Entregado') {
      setOriginalLockedStatus(currentStatus);
    } else {
      setOriginalLockedStatus(null);
    }
  }, [initialData?.id, getValues]);


  useEffect(() => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if(authUserString) {
      setCurrentUser(JSON.parse(authUserString));
    }
  }, []);

  const isEditing = !!initialData?.id;
  const watchedStatus = watch('status');
  const isQuote = watchedStatus === 'Cotizacion' || (mode === 'quote' && !isEditing);

  const isReadOnly = originalLockedStatus !== null && currentUser?.role !== 'Superadministrador'; 

  const handleFormSubmit = async (values: ServiceFormValues) => {
    if (isReadOnly && originalLockedStatus) {
      const allowedUpdate = {
        notes: values.notes,
        vehicleConditions: values.vehicleConditions,
        customerItems: values.customerItems,
        payments: values.payments, // Allow updating payments
        deliveryDateTime: values.deliveryDateTime,
      };
      
      const updatedData = {
          ...initialData,
          ...allowedUpdate,
          status: originalLockedStatus,
      } as ServiceFormValues;

      await onSubmit(updatedData);
      return;
    }
  
    const finalValues = { ...values };
    
    if (originalLockedStatus) {
      finalValues.status = originalLockedStatus;
    }
  
    await onSubmit(finalValues);
  };
  
  const onValidationErrors = (errors: any) => {
    toast({
        title: "Error de Validación",
        description: "Por favor, corrija los errores antes de guardar.",
        variant: "destructive",
    });

    const getErrorMessages = (errorObject: any): string[] => {
        let messages: string[] = [];
        if (!errorObject) return messages;

        for (const key in errorObject) {
            if (key === 'message') {
                messages.push(errorObject[key]);
            } else if (typeof errorObject[key] === 'object') {
                messages = messages.concat(getErrorMessages(errorObject[key]));
            }
        }
        return messages;
    };
    
    const errorMessages = getErrorMessages(errors);
    errorMessages.forEach((msg, index) => {
        toast({
            title: `Error ${index + 1}`,
            description: msg,
            variant: "destructive",
        });
    });
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
  
    const handleOpenValidateDialog = (index: number) => {
        setValidationIndex(index);
        setValidationFolio('');
        setIsValidationDialogOpen(true);
    };

    const handleConfirmValidation = () => {
        if (validationIndex === null) return;
        const originalFolio = watch(`payments.${validationIndex}.folio`);
        
        if (validationFolio === originalFolio) {
        setValidatedFolios(prev => ({ ...prev, [validationIndex]: true }));
        toast({ title: "Folio Validado", description: "El folio coincide correctamente." });
        } else {
        setValidatedFolios(prev => {
            const newValidated = { ...prev };
            delete newValidated[validationIndex];
            return newValidated;
        });
        toast({ title: "Error de Validación", description: "Los folios no coinciden. Por favor, verifique.", variant: "destructive" });
        }
        setIsValidationDialogOpen(false);
    };

  const showTabs = !isQuote && watchedStatus !== 'Agendado';
  const isSubmitDisabled = methods.formState.isSubmitting;

  return (
    <form id="service-form" onSubmit={handleSubmit(handleFormSubmit, onValidationErrors)} className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto px-6 py-4 space-y-6">
        <ServiceDetailsCard isReadOnly={isReadOnly} users={technicians} serviceTypes={serviceTypes} />
        <Suspense fallback={<Loader2 className="animate-spin" />}><VehicleSelectionCard isReadOnly={isReadOnly} localVehicles={vehicles} serviceHistory={serviceHistory} onVehicleSelected={(v) => setValue('vehicleId', v?.id || '')} onOpenNewVehicleDialog={handleOpenNewVehicleDialog}/></Suspense>
        {originalLockedStatus && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
            Estás editando un servicio marcado como <b>{originalLockedStatus}</b>. Solo se habilitó la edición para corregir insumos/notas.
            Al guardar se conservará el estado original.
          </div>
        )}

        {showTabs ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="h-auto flex flex-wrap w-full gap-2 sm:gap-4 p-0 bg-transparent">
                    <button type="button" onClick={() => setActiveTab('servicio')} className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80" data-state={activeTab === 'servicio' ? 'active' : 'inactive'}>Detalles del Servicio</button>
                    <button type="button" onClick={() => setActiveTab('entrega')} className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80" data-state={activeTab === 'entrega' ? 'active' : 'inactive'}>Recepción/Entrega</button>
                    <button type="button" onClick={() => setActiveTab('fotos')} className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80" data-state={activeTab === 'fotos' ? 'active' : 'inactive'}>Reporte Fotográfico</button>
                    <button type="button" onClick={() => setActiveTab('revision')} className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80" data-state={activeTab === 'revision' ? 'active' : 'inactive'}>Puntos Seguridad</button>
                </TabsList>
                <TabsContent value="servicio" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                        <div className="lg:col-span-3"><Suspense fallback={<Loader2 className="animate-spin" />}><ServiceItemsList isReadOnly={isReadOnly} inventoryItems={inventoryItems} mode={mode} onNewInventoryItemCreated={handleVehicleCreated as any} categories={categories} suppliers={suppliers} serviceTypes={serviceTypes} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any}/></Suspense></div>
                        <div className="lg:col-span-2 space-y-6"><Suspense fallback={<Loader2 className="animate-spin" />}><ServiceSummary onOpenValidateDialog={handleOpenValidateDialog} validatedFolios={validatedFolios} /></Suspense></div>
                    </div>
                </TabsContent>
                <TabsContent value="entrega" className="mt-6"><Suspense fallback={<Loader2 className="animate-spin" />}><ReceptionAndDelivery isReadOnly={isReadOnly} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} onOpenSignature={handleOpenSignature}/></Suspense></TabsContent>
                <TabsContent value="fotos" className="mt-6"><Suspense fallback={<Loader2 className="animate-spin" />}><PhotoReportTab isReadOnly={isReadOnly} serviceId={initialData?.id || 'new'} onPhotoUploaded={handlePhotoUploaded} onViewImage={handleViewImage}/></Suspense></TabsContent>
                <TabsContent value="revision" className="mt-6"><Suspense fallback={<Loader2 className="animate-spin" />}><SafetyChecklist isReadOnly={isReadOnly} onSignatureClick={() => handleOpenSignature('technician')} signatureDataUrl={watch('safetyInspection.technicianSignature')} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} serviceId={initialData?.id || 'new'} onPhotoUploaded={handleChecklistPhotoUploaded} onViewImage={handleViewImage}/></Suspense></TabsContent>
            </Tabs>
        ) : (
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start mt-6">
                <div className="lg:col-span-3"><Suspense fallback={<Loader2 className="animate-spin" />}><ServiceItemsList isReadOnly={isReadOnly} inventoryItems={inventoryItems} mode={mode} onNewInventoryItemCreated={handleVehicleCreated as any} categories={categories} suppliers={suppliers} serviceTypes={serviceTypes} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any}/></Suspense></div>
                <div className="lg:col-span-2 space-y-6"><Suspense fallback={<Loader2 className="animate-spin" />}><ServiceSummary onOpenValidateDialog={handleOpenValidateDialog} validatedFolios={validatedFolios} /></Suspense></div>
             </div>
        )}
      </div>

      <div className="flex-shrink-0 flex justify-between items-center mt-6 pt-4 border-t px-6 pb-6 bg-background sticky bottom-0 z-10">
        <div>
          {(onDelete || onCancelService) && initialData?.id && (
            <ConfirmDialog
                triggerButton={
                    <Button variant="destructive" type="button" disabled={isReadOnly}>
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
          <Button type="submit" disabled={isSubmitDisabled}>
            {methods.formState.isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>}
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
      
      <AlertDialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validar Folio</AlertDialogTitle>
            <AlertDialogDescription>
              Para evitar errores, por favor ingrese nuevamente el folio del voucher o referencia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="folio-validation-input">Reingresar Folio</Label>
            <Input
              id="folio-validation-input"
              value={validationFolio}
              onChange={(e) => setValidationFolio(e.target.value)}
              className="mt-2"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmValidation}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
