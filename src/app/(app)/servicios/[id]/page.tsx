
// src/app/(app)/servicios/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from "@/components/page-header";
import type { ServiceRecord, QuoteRecord, Vehicle, User, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier, Payment } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { serviceService, inventoryService, adminService, operationsService } from '@/lib/services';
import { Loader2, Save, X, Ban, DollarSign, Wrench, ShieldCheck, Camera, FileText, Eye, Trash2 } from 'lucide-react';
import { serviceFormSchema } from '@/schemas/service-form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PaymentDetailsDialog, type PaymentDetailsFormValues } from '../components/PaymentDetailsDialog';
import { writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';
import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SignatureDialog } from '../components/signature-dialog';
import { normalizeDataUrl } from '@/lib/utils';
import { enhanceText } from '@/ai/flows/text-enhancement-flow';
import Image from 'next/image';
import { ServiceDetailsCard } from '../components/ServiceDetailsCard';

const ServiceItemsList = lazy(() => import('../components/ServiceItemsList').then(module => ({ default: module.ServiceItemsList })));
const PaymentSection = lazy(() => import('../components/PaymentSection').then(module => ({ default: module.PaymentSection })));
const VehicleSelectionCard = lazy(() => import('../components/VehicleSelectionCard').then(module => ({ default: module.VehicleSelectionCard })));
const SafetyChecklist = lazy(() => import('../components/SafetyChecklist').then(module => ({ default: module.SafetyChecklist })));
const PhotoReportTab = lazy(() => import('../components/PhotoReportTab').then(module => ({ default: module.PhotoReportTab })));
const ReceptionAndDelivery = lazy(() => import('../components/ReceptionAndDelivery').then(module => ({ default: module.ReceptionAndDelivery })));


export default function EditarServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;
  
  const [initialData, setInitialData] = useState<ServiceRecord | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);

  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false);
  const [newVehicleInitialPlate, setNewVehicleInitialPlate] = useState<string | undefined>(undefined);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<'reception' | 'delivery' | 'technician' | null>(null);
  const [isEnhancingText, setIsEnhancingText] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('servicio');


  const methods = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
  });

  const { reset, handleSubmit, getValues, setValue, watch } = methods;

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [
              serviceData, vehiclesData, usersData, inventoryData,
              serviceTypesData, categoriesData, suppliersData, allServicesData
            ] = await Promise.all([
              serviceService.getDocById('serviceRecords', serviceId),
              inventoryService.onVehiclesUpdatePromise(),
              adminService.onUsersUpdatePromise(),
              inventoryService.onItemsUpdatePromise(),
              inventoryService.onServiceTypesUpdatePromise(),
              inventoryService.onCategoriesUpdatePromise(),
              inventoryService.onSuppliersUpdatePromise(),
              serviceService.onServicesUpdatePromise(),
            ]);

            if (!serviceData) {
              toast({ title: 'Error', description: 'Servicio no encontrado.', variant: 'destructive' });
              router.push('/servicios/historial');
              return;
            }

            setInitialData(serviceData);
            setVehicles(vehiclesData);
            setUsers(usersData);
            setInventoryItems(inventoryData);
            setServiceTypes(serviceTypesData);
            setCategories(categoriesData);
            setSuppliers(suppliersData);
            setServiceHistory(allServicesData);
            
            reset({
                ...serviceData,
                initialStatus: serviceData.status,
                allVehiclesForDialog: vehiclesData,
            });

        } catch (error) {
            console.error("Error fetching data for edit page:", error);
            toast({ title: 'Error', description: 'No se pudieron cargar los datos del servicio.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [serviceId, router, toast, reset]);
  
  const handleOpenNewVehicleDialog = useCallback((plate?: string) => {
    setNewVehicleInitialPlate(plate);
    setIsNewVehicleDialogOpen(true);
  }, []);
  
  const handleVehicleCreated = async (newVehicleData: VehicleFormValues) => {
      const newVehicle = await inventoryService.addVehicle(newVehicleData);
      toast({ title: "Vehículo Creado" });
      methods.setValue('vehicleId', newVehicle.id);
      setIsNewVehicleDialogOpen(false);
  };
  
  const handleNewInventoryItemCreated = async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    toast({ title: "Producto Creado", description: `"${newItem.name}" ha sido agregado al inventario.` });
    return newItem;
  };

  const handleUpdateService = async (values: z.infer<typeof serviceFormSchema>) => {
    if (!initialData) return;

    const serviceRecordValues = values as ServiceRecord;

    if (serviceRecordValues.status === 'Entregado' && initialData.status !== 'Entregado') {
        setServiceToComplete({ ...initialData, ...serviceRecordValues });
        setIsPaymentDialogOpen(true);
        return;
    }

    try {
      await serviceService.saveService({ ...serviceRecordValues, id: serviceId });
      toast({ title: 'Servicio Actualizado', description: `El registro #${serviceId.slice(-6)} ha sido actualizado.` });
      router.push('/servicios/historial');
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Actualizar', variant: 'destructive'});
    }
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
        router.push('/servicios/historial');
    } catch(e) {
        toast({ title: "Error al completar", variant: "destructive"});
    }
  };

  const handleCancelService = async () => {
    const reason = prompt("Por favor, ingrese un motivo para la cancelación:");
    if (reason && initialData) {
      try {
        await serviceService.cancelService(initialData.id, reason);
        toast({ title: "Servicio Cancelado" });
        router.push('/servicios/historial');
      } catch (error) {
        toast({ title: "Error", description: "No se pudo cancelar el servicio.", variant: "destructive"});
      }
    }
  };
  
  const handleDeleteQuote = async () => {
    if (!initialData) return;
    try {
      await serviceService.deleteService(initialData.id);
      toast({ title: "Cotización Eliminada", variant: "destructive" });
      router.push('/servicios?tab=cotizaciones');
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar la cotización.", variant: "destructive"});
    }
  };

  const handleOpenSignature = (type: 'reception' | 'delivery' | 'technician') => {
    setSignatureTarget(type);
    setIsSignatureDialogOpen(true);
  };
  
  const handleSaveSignature = (signatureDataUrl: string) => {
    if (signatureTarget) {
      let fieldToUpdate: keyof ServiceRecord | `safetyInspection.technicianSignature` = "customerSignatureReception";
      if(signatureTarget === 'delivery') fieldToUpdate = "customerSignatureDelivery";
      if(signatureTarget === 'technician') fieldToUpdate = "safetyInspection.technicianSignature";
      setValue(fieldToUpdate as any, signatureDataUrl, { shouldDirty: true });
    }
    setIsSignatureDialogOpen(false);
    setSignatureTarget(null);
  };

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


  if (isLoading || !initialData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        Cargando servicio...
      </div>
    );
  }

  const showTabs = initialData.status === 'En Taller' || initialData.status === 'Entregado' || initialData.status === 'Cancelado' || watch('status') === 'En Taller' || watch('status') === 'Entregado';
  const isQuote = initialData.status === 'Cotizacion';


  return (
    <FormProvider {...methods}>
        <form id="service-form" onSubmit={handleSubmit(handleUpdateService)} className="space-y-6">
            <PageHeader
                title={`Editar ${isQuote ? 'Cotización' : 'Servicio'} #${initialData.id.slice(-6)}`}
                description={`Modifica los detalles para el vehículo ${initialData.vehicleIdentifier || ''}.`}
            />
            
            <ServiceDetailsCard
              isReadOnly={false}
              users={users}
              serviceTypes={serviceTypes}
            />

            <VehicleSelectionCard 
              isReadOnly={false} 
              localVehicles={vehicles} 
              serviceHistory={serviceHistory}
              onVehicleSelected={(v) => methods.setValue('vehicleIdentifier', v?.licensePlate)} 
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
                          <Suspense fallback={<Loader2 className="animate-spin" />}>
                            <ServiceItemsList isReadOnly={false} inventoryItems={inventoryItems} mode={'service'} onNewInventoryItemCreated={handleVehicleCreated as any} categories={categories} suppliers={suppliers} serviceTypes={serviceTypes} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any}/>
                          </Suspense>
                        </div>
                        <div className="lg:col-span-2 space-y-6">
                          <Suspense fallback={<Loader2 className="animate-spin" />}>
                            <PaymentSection />
                          </Suspense>
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
                      <PhotoReportTab isReadOnly={false} serviceId={serviceId} onPhotoUploaded={handlePhotoUploaded} onViewImage={handleViewImage}/>
                   </Suspense>
                </TabsContent>
                <TabsContent value="revision" className="mt-6">
                  <Suspense fallback={<Loader2 className="animate-spin" />}>
                     <SafetyChecklist isReadOnly={false} onSignatureClick={() => handleOpenSignature('technician')} signatureDataUrl={watch('safetyInspection.technicianSignature')} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} serviceId={serviceId} onPhotoUploaded={handleChecklistPhotoUploaded} onViewImage={handleViewImage}/>
                  </Suspense>
                </TabsContent>
              </Tabs>
            ) : (
              // Vista sin pestañas para Cotizacion/Agendado
              <>
                 <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start mt-6">
                    <div className="lg:col-span-3">
                      <Suspense fallback={<Loader2 className="animate-spin" />}><ServiceItemsList isReadOnly={false} inventoryItems={inventoryItems} mode={initialData.status === 'Cotizacion' ? 'quote' : 'service'} onNewInventoryItemCreated={handleVehicleCreated as any} categories={categories} suppliers={suppliers} serviceTypes={serviceTypes} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any}/></Suspense>
                    </div>
                    <div className="lg:col-span-2 space-y-6"><Suspense fallback={<Loader2 className="animate-spin" />}><PaymentSection /></Suspense></div>
                 </div>
              </>
            )}

            <div className="mt-6 flex justify-between items-center">
                <ConfirmDialog
                    triggerButton={
                        <Button variant="destructive" type="button" disabled={initialData.status === 'Cancelado'}>
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
                    onConfirm={isQuote ? handleDeleteQuote : handleCancelService}
                />
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => router.back()}>
                        <X className="mr-2 h-4 w-4" />
                        Cerrar
                    </Button>
                    <Button type="submit" form="service-form">
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Cambios
                    </Button>
                </div>
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
            onConfirm={(id, details) => handleCompleteService(details)}
            isCompletionFlow={true}
            />
        )}
        
        <SignatureDialog
            open={isSignatureDialogOpen}
            onOpenChange={setIsSignatureDialogOpen}
            onSave={handleSaveSignature}
        />
        
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="max-w-4xl p-2 bg-transparent border-none shadow-none">
            {viewingImageUrl && (
              <div className="relative aspect-video w-full">
                <Image
                  src={viewingImageUrl}
                  alt="Vista ampliada"
                  fill
                  style={{ objectFit: 'contain' }}
                  sizes="(max-width: 768px) 100vw, 1024px"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
    </FormProvider>
  );
}
