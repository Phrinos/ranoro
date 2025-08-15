// src/app/(app)/servicios/components/ServiceForm.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Loader2, Save, X, Ban, Trash2, BrainCircuit, LogIn, Calendar, Plus } from 'lucide-react';
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
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format as formatDate, addDays, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Lazy load complex components
const ServiceItemsList = lazy(() => import('./ServiceItemsList').then(module => ({ default: module.ServiceItemsList })));
const VehicleSelectionCard = lazy(() => import('./VehicleSelectionCard').then(module => ({ default: module.VehicleSelectionCard })));
const SafetyChecklist = lazy(() => import('./SafetyChecklist').then(module => ({ default: module.SafetyChecklist })));
const PhotoReportTab = lazy(() => import('./PhotoReportTab'));
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
      nextServiceInfo: initialData?.nextServiceInfo ? {
        ...initialData.nextServiceInfo,
        date: initialData.nextServiceInfo.date ? new Date(initialData.nextServiceInfo.date).toISOString() : undefined,
      } : { date: undefined, mileage: undefined },
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
        mode={mode}
        onVehicleCreated={onVehicleCreated}
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
  mode: 'service' | 'quote';
  onVehicleCreated?: (newVehicle: VehicleFormValues) => Promise<void>;
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
  mode,
  onVehicleCreated,
}: ServiceFormContentProps) {
  const { toast } = useToast();
  const methods = useFormContext<ServiceFormValues>();
  
  const [activeTab, setActiveTab] = useState('servicio');
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false);
  const [newVehicleInitialPlate, setNewVehicleInitialPlate] = useState<string | undefined>(undefined);
  
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<'reception' | 'delivery' | null>(null);

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
  const watchedTechnicianId = watch('technicianId');
  const watchedStatus = watch('status');


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
  
  const technicianInfo = useMemo(() => {
    const techId = getValues('technicianId');
    if (!techId) return null;
    return technicians.find(t => t.id === techId);
  }, [getValues, technicians]);
  
  useEffect(() => {
    // Automatically set the technician's signature if a technician is assigned
    if (technicianInfo?.signatureDataUrl) {
      setValue('safetyInspection.technicianSignature', technicianInfo.signatureDataUrl, { shouldDirty: true });
    }
  }, [technicianInfo, setValue]);

  const isEditing = !!initialData?.id;
  
  const isQuote = watchedStatus === 'Cotizacion' || (mode === 'quote' && !isEditing);

  const isReadOnly = originalLockedStatus !== null && currentUser?.role !== 'Superadministrador'; 

  const handleFormSubmit = async (values: ServiceFormValues) => {
    const finalValues: any = { ...values };

    // This is the key change to prevent saving the vehicle list to the DB.
    delete finalValues.allVehiclesForDialog;
    
    if (finalValues.status === 'Entregado' && !finalValues.deliveryDateTime) {
      finalValues.deliveryDateTime = new Date();
    }
    
    if (finalValues.nextServiceInfo?.date) {
      finalValues.nextServiceInfo.date = new Date(finalValues.nextServiceInfo.date).toISOString();
    }
    
    // This is the important part: Handle the case where the inputs might be empty strings
    if (finalValues.nextServiceInfo?.mileage === '' || finalValues.nextServiceInfo?.mileage === null) {
      finalValues.nextServiceInfo.mileage = undefined;
    }


    if (originalLockedStatus) {
        const allowedUpdate = {
          notes: finalValues.notes,
          vehicleConditions: finalValues.vehicleConditions,
          customerItems: finalValues.customerItems,
          payments: finalValues.payments,
          deliveryDateTime: finalValues.deliveryDateTime,
          status: originalLockedStatus,
          nextServiceInfo: finalValues.nextServiceInfo,
        };
        const updatedData = { ...initialData, ...allowedUpdate };
        await onSubmit(updatedData as ServiceFormValues);
        return;
    }
  
    await onSubmit(finalValues);
  };
  
  const onValidationErrors = (errors: any) => {
    toast({
        title: "Error de Validación",
        description: "Por favor, corrija los errores antes de guardar.",
        variant: "destructive",
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

  const handleOpenSignature = (type: 'reception' | 'delivery') => {
    setSignatureTarget(type);
    setIsSignatureDialogOpen(true);
  };
  
  const handleSaveSignature = (signatureDataUrl: string) => {
    if (signatureTarget) {
      const fieldToUpdate: any = signatureTarget === 'delivery' ? "customerSignatureDelivery" : "customerSignatureReception";
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

  return (
    <form id="service-form" onSubmit={handleSubmit(handleFormSubmit, onValidationErrors)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <ServiceDetailsCard isReadOnly={isReadOnly} users={technicians} serviceTypes={serviceTypes} />
            <Suspense fallback={<Loader2 className="animate-spin" />}><VehicleSelectionCard isReadOnly={isReadOnly} localVehicles={vehicles} serviceHistory={serviceHistory} onVehicleSelected={(v) => setValue('vehicleId', v?.id || '')} onOpenNewVehicleDialog={handleOpenNewVehicleDialog}/></Suspense>
        </div>
        
        {originalLockedStatus && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
            Estás editando un servicio marcado como <b>{originalLockedStatus}</b>. Solo se habilitó la edición para corregir insumos/notas.
            Al guardar se conservará el estado original.
          </div>
        )}

        {showTabs ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
                 <div className="overflow-x-auto scrollbar-hide pb-2">
                    <TabsList className="relative w-max">
                        <TabsTrigger value="servicio">Detalles del Servicio</TabsTrigger>
                        <TabsTrigger value="recepcion">Recepción</TabsTrigger>
                        <TabsTrigger value="revision">Puntos Seguridad</TabsTrigger>
                        <TabsTrigger value="entrega">Entrega</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="servicio" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                        <div className="lg:col-span-3"><Suspense fallback={<Loader2 className="animate-spin" />}><ServiceItemsList isReadOnly={isReadOnly} inventoryItems={inventoryItems} mode={mode} onNewInventoryItemCreated={handleVehicleCreated as any} categories={categories} suppliers={suppliers} serviceTypes={serviceTypes} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any}/></Suspense></div>
                        <div className="lg:col-span-2 space-y-6"><Suspense fallback={<Loader2 className="animate-spin" />}><ServiceSummary onOpenValidateDialog={handleOpenValidateDialog} validatedFolios={validatedFolios} /></Suspense>
                        {watchedStatus === 'Entregado' && (
                            <Card>
                                <CardHeader><CardTitle>Programar Próximo Servicio (Opcional)</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={control}
                                            name="nextServiceInfo.date"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Próxima Fecha</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4 opacity-50"/>{field.value && isValid(new Date(field.value)) ? formatDate(new Date(field.value), "PPP", { locale: es }) : <span>Seleccione fecha</span>}</Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date?.toISOString())} initialFocus locale={es}/>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Select onValueChange={(v) => {
                                                        const days = parseInt(v);
                                                        const deliveryDate = getValues('deliveryDateTime') || new Date();
                                                        setValue('nextServiceInfo.date', addDays(deliveryDate, days).toISOString());
                                                    }}>
                                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Añadir tiempo..."/></SelectTrigger>
                                                        <SelectContent><SelectItem value="183">+6 meses</SelectItem><SelectItem value="365">+12 meses</SelectItem></SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={control}
                                            name="nextServiceInfo.mileage"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Próximo KM</FormLabel>
                                                    <FormControl><Input type="number" placeholder="Ej: 85000" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} value={field.value ?? ''}/></FormControl>
                                                    <Select onValueChange={(v) => {
                                                        const kmToAdd = parseInt(v);
                                                        const currentKm = getValues('mileage') || 0;
                                                        setValue('nextServiceInfo.mileage', Number(currentKm) + kmToAdd);
                                                    }}>
                                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Añadir KM..."/></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="5000">+5,000 km</SelectItem>
                                                            <SelectItem value="10000">+10,000 km</SelectItem>
                                                            <SelectItem value="12500">+12,500 km</SelectItem>
                                                            <SelectItem value="15000">+15,000 km</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                         )}
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="recepcion" className="mt-6 space-y-6">
                    <Suspense fallback={<Loader2 className="animate-spin" />}><PhotoReportTab isReadOnly={isReadOnly} serviceId={initialData?.id || 'new'} onPhotoUploaded={handlePhotoUploaded} onViewImage={handleViewImage} reportType="Recepción" /></Suspense>
                    <Suspense fallback={<Loader2 className="animate-spin" />}><ReceptionAndDelivery isReadOnly={isReadOnly} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} onOpenSignature={handleOpenSignature} part="reception"/></Suspense>
                </TabsContent>
                <TabsContent value="revision" className="mt-6"><Suspense fallback={<Loader2 className="animate-spin" />}><SafetyChecklist isReadOnly={isReadOnly} signatureDataUrl={watch('safetyInspection.technicianSignature')} technicianName={technicianInfo?.name} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} serviceId={initialData?.id || 'new'} onPhotoUploaded={handleChecklistPhotoUploaded} onViewImage={handleViewImage}/></Suspense></TabsContent>
                <TabsContent value="entrega" className="mt-6 space-y-6">
                    <Suspense fallback={<Loader2 className="animate-spin" />}><PhotoReportTab isReadOnly={isReadOnly} serviceId={initialData?.id || 'new'} onPhotoUploaded={handlePhotoUploaded} onViewImage={handleViewImage} reportType="Entrega" /></Suspense>
                    <Suspense fallback={<Loader2 className="animate-spin" />}><ReceptionAndDelivery isReadOnly={isReadOnly} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} onOpenSignature={handleOpenSignature} part="delivery"/></Suspense>
                </TabsContent>
            </Tabs>
        ) : (
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start mt-6">
                <div className="lg:col-span-3"><Suspense fallback={<Loader2 className="animate-spin" />}><ServiceItemsList isReadOnly={isReadOnly} inventoryItems={inventoryItems} mode={mode} onNewInventoryItemCreated={handleVehicleCreated as any} categories={categories} suppliers={suppliers} serviceTypes={serviceTypes} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any}/></Suspense></div>
                <div className="lg:col-span-2 space-y-6"><Suspense fallback={<Loader2 className="animate-spin" />}><ServiceSummary onOpenValidateDialog={handleOpenValidateDialog} validatedFolios={validatedFolios} /></Suspense></div>
             </div>
        )}

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
