// src/app/(app)/servicios/nuevo/page.tsx

"use client";

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { SaleReceipt, InventoryItem, PaymentMethod, InventoryCategory, Supplier, WorkshopInfo, ServiceRecord, Vehicle, Technician, ServiceTypeRecord, QuoteRecord, User, Payment } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { inventoryService, serviceService, adminService, operationsService } from '@/lib/services';
import { Loader2, Copy, Printer, MessageSquare, Save, X, Share2, CalendarIcon as CalendarDateIcon, BrainCircuit, Wrench, ShieldCheck, Camera, FileText, Eye } from 'lucide-react';
import type { InventoryItemFormValues } from '../../inventario/components/inventory-item-form';
import { db } from '@/lib/firebaseClient';
import { writeBatch, doc } from 'firebase/firestore';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { nanoid } from 'nanoid';
import html2canvas from 'html2canvas';
import { serviceFormSchema } from '@/schemas/service-form';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';
import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog';
import { PaymentDetailsDialog, type PaymentDetailsFormValues } from '../components/PaymentDetailsDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VehicleSelectionCard } from '../components/VehicleSelectionCard';
import { ServiceItemsList } from '../components/ServiceItemsList';
import { PaymentSection } from '../components/PaymentSection';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { format, setHours, setMinutes, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { enhanceText } from '@/ai/flows/text-enhancement-flow';
import { ServiceDetailsCard } from '../components/ServiceDetailsCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignatureDialog } from '../components/signature-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Image from 'next/image';
import { useServiceTotals } from '@/hooks/use-service-form-hooks';

// Lazy loading for tab content
const SafetyChecklist = lazy(() => import('../components/SafetyChecklist').then(module => ({ default: module.SafetyChecklist })));
const PhotoReportTab = lazy(() => import('../components/PhotoReportTab').then(module => ({ default: module.PhotoReportTab })));
const ReceptionAndDelivery = lazy(() => import('../components/ReceptionAndDelivery').then(module => ({ default: module.ReceptionAndDelivery })));


type ServiceCreationFormValues = z.infer<typeof serviceFormSchema>;

export default function NuevoServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>([]);
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [serviceForPreview, setServiceForPreview] = useState<ServiceRecord | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);

  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false)
  const [newVehicleInitialPlate, setNewVehicleInitialPlate] = useState<string | undefined>(undefined);
  
  const [isEnhancingText, setIsEnhancingText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('servicio');
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<'reception' | 'delivery' | 'technician' | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);


  const methods = useForm<ServiceCreationFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      serviceItems: [],
      payments: [{ method: 'Efectivo', amount: undefined }],
      status: 'Cotizacion', // Default status
    },
  });

  const { control, watch, formState, handleSubmit, setValue, getValues } = methods;
  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useServiceTotals(methods);


  useEffect(() => {
    const unsubs = [
      inventoryService.onItemsUpdate((items) => {
        setCurrentInventoryItems(items);
        setIsLoading(false);
      }),
      inventoryService.onCategoriesUpdate(setAllCategories),
      inventoryService.onSuppliersUpdate(setAllSuppliers),
      inventoryService.onVehiclesUpdate(setVehicles),
      serviceService.onServicesUpdate(setAllServices),
      adminService.onUsersUpdate(setUsers),
      inventoryService.onServiceTypesUpdate((data) => {
        setServiceTypes(data);
        setIsLoading(false);
      }),
    ];
    
    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }
    
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
    if (currentUser) {
      setValue('serviceAdvisorId', currentUser.id);
      setValue('serviceAdvisorName', currentUser.name);
      setValue('serviceAdvisorSignatureDataUrl', currentUser.signatureDataUrl || '');
    }


    return () => unsubs.forEach(unsub => unsub());
  }, [setValue]);
  
  const handleSaleCompletion = async (values: ServiceCreationFormValues) => {
    if (!db) return toast({ title: 'Error de base de datos', variant: 'destructive'});
    
    const now = new Date();
    const serviceDataWithTotals = {
        ...values,
        totalCost,
        totalSuppliesWorkshopCost,
        serviceProfit,
        quoteDate: values.status === 'Cotizacion' ? now.toISOString() : undefined,
        serviceDate: values.status !== 'Cotizacion' ? (values.serviceDate || now) : (values.serviceDate || now),
    };

    if (values.status === 'Entregado') {
        const tempService = { ...serviceDataWithTotals, id: 'new_service_temp' } as ServiceRecord;
        setServiceToComplete(tempService);
        setIsPaymentDialogOpen(true);
        return;
    }

    try {
        const savedRecord = await serviceService.saveService(serviceDataWithTotals as ServiceRecord);
        toast({ title: 'Registro Creado', description: `El registro #${savedRecord.id} se ha guardado.` });
        setServiceForPreview(savedRecord);
        setIsPreviewOpen(true);
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Registrar', variant: 'destructive'});
    }
  };

  const handleCompleteNewService = async (paymentDetails: PaymentDetailsFormValues) => {
    if (!serviceToComplete) return;

    try {
      const { id: _, ...serviceData } = serviceToComplete;
      const savedService = await serviceService.saveService(serviceData as ServiceRecord);

      const batch = writeBatch(db);
      await serviceService.completeService(savedService, paymentDetails, batch);
      await batch.commit();

      const finalServiceRecord = { ...savedService, ...paymentDetails, status: 'Entregado', deliveryDateTime: new Date().toISOString() } as ServiceRecord;

      toast({ title: 'Servicio Completado', description: `El servicio #${finalServiceRecord.id} ha sido creado y completado.` });
      setServiceForPreview(finalServiceRecord);
      setIsPreviewOpen(true);

    } catch(e) {
       console.error(e);
       toast({ title: 'Error al Completar', variant: 'destructive'});
    } finally {
        setIsPaymentDialogOpen(false);
        setServiceToComplete(null);
    }
  };
  
  const handleNewInventoryItemCreated = async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    return newItem;
  };
  
  const handleDialogClose = () => {
    setIsPreviewOpen(false);
    setServiceForPreview(null);
    methods.reset();
    const targetPath = serviceForPreview?.status === 'Cotizacion' 
                      ? '/servicios?tab=cotizaciones'
                      : '/servicios?tab=historial';
    router.push(targetPath);
  };
  
  const handleVehicleCreated = async (newVehicleData: VehicleFormValues) => {
      const newVehicle = await inventoryService.addVehicle(newVehicleData);
      toast({ title: "Vehículo Creado" });
      setValue('vehicleId', newVehicle.id); // Set the newly created vehicle in the form
      setIsNewVehicleDialogOpen(false);
  };

  const handleOpenNewVehicleDialog = useCallback((plate?: string) => {
    setNewVehicleInitialPlate(plate);
    setIsNewVehicleDialogOpen(true);
  }, []);

  const handleEnhanceText = useCallback(async (fieldName: any) => {
      const currentValue = getValues(fieldName);
      if (typeof currentValue !== 'string' || !currentValue) return;
  
      setIsEnhancingText(fieldName);
      try {
        let context = 'Notas del Servicio'; // default
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
  }, [getValues, setValue, toast]);
  
  const handleOpenSignature = (type: 'reception' | 'delivery' | 'technician') => {
    setSignatureTarget(type);
    setIsSignatureDialogOpen(true);
  };
  
  const handleSaveSignature = (signatureDataUrl: string) => {
    if (signatureTarget) {
      let fieldToUpdate: keyof ServiceCreationFormValues | `safetyInspection.technicianSignature` = "customerSignatureReception";
      if(signatureTarget === 'delivery') fieldToUpdate = "customerSignatureDelivery";
      if(signatureTarget === 'technician') fieldToUpdate = "safetyInspection.technicianSignature";
      setValue(fieldToUpdate as any, signatureDataUrl, { shouldDirty: true });
    }
    setIsSignatureDialogOpen(false);
    setSignatureTarget(null);
  };

  const handlePhotoUploaded = (reportIndex: number, url: string) => {
    const currentPhotos = getValues(`photoReports.${reportIndex}.photos`) || [];
    setValue(`photoReports.${reportIndex}.photos`, [...currentPhotos, url], { shouldDirty: true });
  };
  
  const handleChecklistPhotoUploaded = (itemName: `safetyInspection.${string}`, url: string) => {
    const currentItemValue = getValues(itemName) || { photos: [] };
    setValue(itemName, { ...currentItemValue, photos: [...currentItemValue.photos, url] }, { shouldDirty: true });
  };
  
  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  const watchedStatus = watch('status');
  const showTabs = watchedStatus === 'En Taller' || watchedStatus === 'Entregado';


  if (isLoading) {
      return <div className="text-center p-8 text-muted-foreground flex justify-center items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando...</div>;
  }

  return (
    <FormProvider {...methods}>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Servicio / Cotización</h1>
        <p className="text-primary-foreground/80 mt-1">Completa la información para crear un nuevo registro.</p>
      </div>

      <form id="service-form" onSubmit={handleSubmit(handleSaleCompletion)} className="space-y-6">
        <ServiceDetailsCard
          isReadOnly={false}
          users={users}
          serviceTypes={serviceTypes}
        />
        
        <VehicleSelectionCard
          isReadOnly={false}
          localVehicles={vehicles}
          serviceHistory={allServices}
          onVehicleSelected={(v) => setValue('vehicleIdentifier', v?.licensePlate)}
          onOpenNewVehicleDialog={handleOpenNewVehicleDialog}
        />

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
                      <div className="lg:col-span-3">
                          <ServiceItemsList isReadOnly={false} inventoryItems={currentInventoryItems} mode={'service'} onNewInventoryItemCreated={handleNewInventoryItemCreated} categories={allCategories} suppliers={allSuppliers} serviceTypes={serviceTypes} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any}/>
                      </div>
                      <div className="lg:col-span-2 space-y-6">
                          <PaymentSection />
                      </div>
                  </div>
              </TabsContent>
               <TabsContent value="entrega" className="mt-6">
                <Suspense fallback={<Loader2 className="animate-spin" />}>
                    <ReceptionAndDelivery isReadOnly={false} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} onOpenSignature={handleOpenSignature}/>
                </Suspense>
              </TabsContent>
              <TabsContent value="fotos" className="mt-6">
                <Suspense fallback={<Loader2 className="animate-spin" />}>
                    <PhotoReportTab isReadOnly={false} serviceId={getValues('id') || 'new'} onPhotoUploaded={handlePhotoUploaded} onViewImage={handleViewImage}/>
                </Suspense>
              </TabsContent>
              <TabsContent value="revision" className="mt-6">
                <Suspense fallback={<Loader2 className="animate-spin" />}>
                    <SafetyChecklist isReadOnly={false} onSignatureClick={() => handleOpenSignature('technician')} signatureDataUrl={watch('safetyInspection.technicianSignature')} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} serviceId={getValues('id') || 'new'} onPhotoUploaded={handleChecklistPhotoUploaded} onViewImage={handleViewImage}/>
                </Suspense>
              </TabsContent>
            </Tabs>
        ) : (
           <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
              <div className="lg:col-span-3">
                <ServiceItemsList
                  isReadOnly={false}
                  inventoryItems={currentInventoryItems}
                  mode={watch('status') === 'Cotizacion' ? 'quote' : 'service'}
                  onNewInventoryItemCreated={handleNewInventoryItemCreated}
                  categories={allCategories}
                  suppliers={allSuppliers}
                  serviceTypes={serviceTypes}
                  isEnhancingText={isEnhancingText}
                  handleEnhanceText={handleEnhanceText as any}
                />
              </div>
              <div className="lg:col-span-2 space-y-6">
                <PaymentSection />
              </div>
            </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={formState.isSubmitting}
          >
            {formState.isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {"Crear Registro"}
          </Button>
        </div>
      </form>

      <VehicleDialog
        open={isNewVehicleDialogOpen}
        onOpenChange={setIsNewVehicleDialogOpen}
        onSave={handleVehicleCreated}
        vehicle={{ licensePlate: newVehicleInitialPlate }}
      />
      {serviceToComplete && (
        <PaymentDetailsDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          record={serviceToComplete}
          onConfirm={(id, paymentDetails) => handleCompleteNewService(paymentDetails)}
          isCompletionFlow={true}
        />
      )}
      {serviceForPreview && (
        <UnifiedPreviewDialog
          open={isPreviewOpen}
          onOpenChange={handleDialogClose}
          service={serviceForPreview}
          vehicle={vehicles.find(v => v.id === serviceForPreview.vehicleId)}
          title="Registro Creado con Éxito"
        />
      )}
      
      <SignatureDialog 
        open={!!signatureTarget} 
        onOpenChange={(isOpen) => !isOpen && setSignatureTarget(null)} 
        onSave={handleSaveSignature}
      />
      
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl p-2 bg-transparent border-none shadow-none">
            {viewingImageUrl && (
              <div className="relative aspect-video w-full">
                <Image
                  src={viewingImageUrl}
                  alt="Vista ampliada de evidencia"
                  fill
                  style={{ objectFit: 'contain' }}
                  sizes="(max-width: 768px) 100vw, 1024px"
                  crossOrigin="anonymous"
                />
              </div>
            )}
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
