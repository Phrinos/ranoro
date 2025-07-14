

/* app/(app)/servicios/components/service-form.tsx */
'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch, Controller, useFieldArray, FormProvider, useFormContext } from "react-hook-form"
import * as z from 'zod'

import Image from 'next/image'
import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'
import {
  Ban, Camera, CheckCircle, Download, Eye, ShieldCheck, Trash2, Wrench, BrainCircuit, Loader2, PlusCircle, Signature,
  CalendarIcon, Wallet, DollarSign, CalendarCheck, Edit
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { format, setHours, setMinutes, isValid, addDays, addMonths, addYears } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent as UiDialogContent,
  DialogFooter as UiDialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
} from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data'

import type {
  ServiceRecord, Vehicle, Technician, InventoryItem,
  QuoteRecord, User, ServiceTypeRecord, SafetyInspection, PhotoReportGroup, ServiceItem as ServiceItemType, SafetyCheckValue, InventoryCategory, Supplier, PaymentMethod
} from '@/types'

import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog'
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form'
import { ServiceDetailsCard } from './ServiceDetailsCard'
import { VehicleSelectionCard } from './VehicleSelectionCard'
import { ReceptionAndDelivery } from './ReceptionAndDelivery'
import { SafetyChecklist } from './SafetyChecklist'
import { SignatureDialog } from './signature-dialog'
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog'
import { suggestQuote } from '@/ai/flows/quote-suggestion-flow'
import { enhanceText } from '@/ai/flows/text-enhancement-flow'
import { PhotoUploader } from './PhotoUploader';
import { serviceFormSchema } from '@/schemas/service-form';
import { parseDate } from '@/lib/forms';
import { useServiceTotals } from '@/hooks/use-service-form-hooks'
import { inventoryService } from "@/lib/services";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { PaymentSection } from '../../pos/components/payment-section';
import Link from 'next/link';

/* ░░░░░░  COMPONENTE  ░░░░░░ */
interface Props {
  initialDataService?: ServiceRecord|null
  children?: React.ReactNode;
  vehicles:Vehicle[]; technicians:Technician[]; inventoryItems:InventoryItem[]
  serviceTypes:ServiceTypeRecord[]
  onSubmit:(d:ServiceRecord|QuoteRecord)=>Promise<void>
  onClose:()=>void
  isReadOnly?:boolean
  mode?:'service'|'quote'
}

export function ServiceForm(props:Props){
  const {
    initialDataService,
    serviceTypes,
    vehicles:parentVehicles,
    technicians,
    inventoryItems:invItems,
    onSubmit,
    children,
    onClose,
    isReadOnly = false,
    mode = 'service'
  } = props;

  const { toast } = useToast();
  
  const defaultValues = useMemo<ServiceFormValues>(() => {
    const firstType = serviceTypes[0]?.name ?? 'Servicio General';
    const now = new Date();
    const status = initialDataService?.status ?? 'Cotizacion';

    if (initialDataService) {
      return {
        ...initialDataService,
        status: status,
        serviceType: initialDataService.serviceType ?? firstType,
        serviceDate: initialDataService.serviceDate ? parseDate(initialDataService.serviceDate) : undefined,
        quoteDate: initialDataService.quoteDate ? parseDate(initialDataService.quoteDate) : (status === 'Cotizacion' ? now : undefined),
        receptionDateTime: initialDataService.receptionDateTime ? parseDate(initialDataService.receptionDateTime) : undefined,
        deliveryDateTime: initialDataService.deliveryDateTime ? parseDate(initialDataService.deliveryDateTime) : undefined,
        customerSignatureReception: initialDataService.customerSignatureReception || null,
        customerSignatureDelivery: initialDataService.customerSignatureDelivery || null,
        technicianName: initialDataService.technicianName || null, 
        serviceAdvisorSignatureDataUrl: initialDataService.serviceAdvisorSignatureDataUrl || '',
        paymentMethod: initialDataService.paymentMethod || 'Efectivo',
        cardFolio: initialDataService.cardFolio || '',
        transferFolio: initialDataService.transferFolio || '',
        nextServiceInfo: initialDataService.nextServiceInfo || undefined,
        serviceItems:
          initialDataService.serviceItems?.length
            ? initialDataService.serviceItems
            : [
                {
                  id: nanoid(),
                  name: initialDataService.serviceType ?? firstType,
                  price: initialDataService.totalCost ?? undefined,
                  suppliesUsed: [],
                },
              ],
        photoReports:
          initialDataService.photoReports?.length
            ? initialDataService.photoReports
            : [
                {
                  id: `rep_recepcion_${Date.now()}`,
                  date: now.toISOString(),
                  description: 'Fotografias de la recepcion del vehiculo',
                  photos: [],
                },
              ],
      } as ServiceFormValues;
    }

    const authUser = (() => {
        try { return JSON.parse(localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) ?? 'null') as User | null }
        catch { return null }
    })();

    return {
      status: 'Cotizacion',
      serviceType: firstType,
      quoteDate: now,
      technicianName: null, 
      customerSignatureReception: null,
      customerSignatureDelivery: null,
      serviceAdvisorSignatureDataUrl: authUser?.signatureDataUrl || '',
      paymentMethod: 'Efectivo',
      cardFolio: '',
      transferFolio: '',
      nextServiceInfo: undefined,
      serviceItems: [{
        id: nanoid(),
        name: firstType,
        price: undefined,
        suppliesUsed: [],
      }],
      photoReports: [{
        id: `rep_recepcion_${Date.now()}`,
        date: new Date().toISOString(),
        description: 'Fotografias de la recepcion del vehiculo',
        photos: [],
      }],
      serviceAdvisorId: authUser?.id,
      serviceAdvisorName: authUser?.name,
    } as ServiceFormValues;
  }, [initialDataService, serviceTypes]);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues,
  });
  
  const { control, setValue, watch, formState, handleSubmit, reset, getValues } = form;
  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useServiceTotals(form);
  
  const watchedStatus = watch('status');
  const watchedVehicleId = watch('vehicleId');
  
  useEffect(() => {
    reset(defaultValues);
  }, [initialDataService, reset, defaultValues]);
  
  useEffect(() => {
    const currentStatus = watch('status');
    // Set appointment date automatically if status changes to Agendado and no date is set
    if (currentStatus === 'Agendado' && !watch('serviceDate')) {
        setValue('serviceDate', new Date());
        setValue('appointmentStatus', 'Creada');
    }
    // Set reception date automatically if status changes to En Taller and no date is set
    if (currentStatus === 'En Taller' && !watch('receptionDateTime')) {
        setValue('receptionDateTime', new Date());
    }
    // If status is changed to Entregado, set the delivery time
    if (currentStatus === 'Entregado' && !watch('deliveryDateTime')) {
        setValue('deliveryDateTime', new Date());
    }
}, [watchedStatus, watch, setValue]);

  
  useEffect(() => {
    if (watchedVehicleId) {
      const selectedVehicle = parentVehicles.find(v => v.id === watchedVehicleId);
      if (selectedVehicle) {
        setValue('customerName', selectedVehicle.ownerName);
      }
    }
  }, [watchedVehicleId, parentVehicles, setValue]);
  
  const [activeTab, setActiveTab] = useState('details')
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false)
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false)
  const [signatureType, setSignatureType] = useState<'advisor' | 'reception' | 'delivery' | null>(null)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null)
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false)
  const [isEnhancingText, setIsEnhancingText] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    inventoryService.onCategoriesUpdate(setAllCategories);
    inventoryService.onSuppliersUpdate(setAllSuppliers);
  }, []);

  const handleEnhanceText = useCallback(async (fieldName: any) => {
    setIsEnhancingText(fieldName);
    const textToEnhance = getValues(fieldName);
    const contextMap: { [key: string]: string } = {
        notes: "Notas Generales del Servicio",
        vehicleConditions: "Condiciones del Vehículo",
        customerItems: "Pertenencias del Cliente",
        'safetyInspection.inspectionNotes': "Observaciones de Inspección",
    };
    
    let context = "Descripción de Reporte Fotográfico";
    if (typeof fieldName === 'string') {
        context = contextMap[fieldName] || (fieldName.includes('safetyInspection') ? 'Notas de Punto de Revisión' : context);
    }

    try {
        const enhancedText = await enhanceText({ text: textToEnhance, context });
        setValue(fieldName, enhancedText, { shouldDirty: true });
    } catch (e) {
        toast({ title: 'Error de IA', description: 'No se pudo mejorar el texto.', variant: 'destructive' });
    } finally {
        setIsEnhancingText(null);
    }
  }, [getValues, setValue, toast]);

  const handleGenerateQuote = useCallback(async () => {
    setIsGeneratingQuote(true)
    const values = getValues()
    const vehicle = parentVehicles.find(v => v.id === values.vehicleId)
    if (!vehicle) {
      toast({ title: "Vehículo no seleccionado", variant: "destructive" })
      setIsGeneratingQuote(false)
      return
    }
    try {
      const result = await suggestQuote({
        vehicleInfo: { make: vehicle.make, model: vehicle.model, year: vehicle.year },
        serviceDescription: values.serviceItems[0]?.name || '',
        serviceHistory: [],
        inventory: invItems,
      })
      
      const newServiceItems = [{
        id: nanoid(),
        name: values.serviceItems[0]?.name,
        price: result.estimatedTotalCost,
        suppliesUsed: result.suppliesProposed.map(sp => {
          const invItem = invItems.find(i => i.id === sp.supplyId)
          return {
            supplyId: sp.supplyId,
            supplyName: invItem?.name || 'Desconocido',
            quantity: sp.quantity,
            unitPrice: invItem?.unitPrice || 0,
            sellingPrice: invItem?.sellingPrice || 0,
            isService: invItem?.isService,
            unitType: invItem?.unitType,
          }
        }),
      }]
      setValue('serviceItems', newServiceItems)
      setValue('notes', result.reasoning)
      toast({ title: "Cotización Sugerida", description: "La IA ha generado una sugerencia." })
    } catch (e) {
      toast({ title: "Error de IA", variant: "destructive" })
    } finally {
      setIsGeneratingQuote(false)
    }
  }, [getValues, setValue, parentVehicles, invItems, toast])

  const onVehicleCreated = useCallback(async (newVehicleData: VehicleFormValues) => {
    console.log("Creating vehicle:", newVehicleData);
  }, [])

  const handleNewInventoryItemCreated = useCallback(async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    toast({ title: "Producto Creado", description: `"${newItem.name}" ha sido agregado al inventario.` });
    return newItem;
  }, [toast]);
  
  const handlePhotoUploaded = useCallback((reportIndex: number, url: string) => {
    const currentPhotos = getValues(`photoReports.${reportIndex}.photos`) || [];
    setValue(`photoReports.${reportIndex}.photos`, [...currentPhotos, url]);
  }, [getValues, setValue]);

  const handleChecklistPhotoUploaded = useCallback((itemName: string, url: string) => {
      const fieldName: `safetyInspection.${keyof SafetyInspection}` = `safetyInspection.${itemName as keyof SafetyInspection}`;
      const currentCheckValue = getValues(fieldName) as SafetyCheckValue || { status: 'na', photos: [] };
      const updatedPhotos = [...(currentCheckValue.photos || []), url];
      setValue(fieldName, { ...currentCheckValue, photos: updatedPhotos });
  }, [getValues, setValue]);

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  const handleSignatureSave = (signatureDataUrl: string) => {
    if (signatureType) {
        const fieldName: 'serviceAdvisorSignatureDataUrl' | 'customerSignatureReception' | 'customerSignatureDelivery' =
            signatureType === 'advisor' ? 'serviceAdvisorSignatureDataUrl' :
            signatureType === 'reception' ? 'customerSignatureReception' :
            'customerSignatureDelivery';
        
        const safeValue = signatureDataUrl?.trim() ? signatureDataUrl : null;
        setValue(fieldName, safeValue, { shouldDirty: true });
        setIsSignatureDialogOpen(false);
        setSignatureType(null);
        toast({ title: "Firma capturada correctamente." });
    }
};

  const formSubmitWrapper = (values: ServiceFormValues) => {
    const dataToSubmit: any = { ...values };
    
    dataToSubmit.totalCost = totalCost;
    dataToSubmit.totalSuppliesWorkshopCost = totalSuppliesWorkshopCost;
    dataToSubmit.serviceProfit = serviceProfit;
    
    const IVA = 0.16;
    dataToSubmit.subTotal = totalCost / (1 + IVA);
    dataToSubmit.taxAmount = totalCost - (totalCost / (1 + IVA));

    onSubmit(dataToSubmit);
  };
  
  const nextServiceInfo = watch('nextServiceInfo');
  const customerName = watch('customerName');

  return (
    <>
      <FormProvider {...form}>
        <form id="service-form" onSubmit={handleSubmit(formSubmitWrapper)} className="flex-grow flex flex-col overflow-hidden">
            <div className="flex-grow overflow-y-auto px-6 space-y-6">
                <VehicleSelectionCard
                    isReadOnly={props.isReadOnly}
                    localVehicles={parentVehicles}
                    onVehicleSelected={(v) => setValue('vehicleIdentifier', v?.licensePlate)}
                    onOpenNewVehicleDialog={() => setIsNewVehicleDialogOpen(true)}
                />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex justify-between items-center mb-4 sticky top-0 z-10 bg-background py-2">
                        <TabsList className={cn("grid w-full", "grid-cols-4")}>
                            <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Detalles</TabsTrigger>
                            <TabsTrigger value="reception" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Recepción/Entrega</TabsTrigger>
                            <TabsTrigger value="photoreport" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Fotos</TabsTrigger>
                            <TabsTrigger value="checklist" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Revisión</TabsTrigger>
                        </TabsList>
                        {initialDataService && (
                            <Button variant="outline" size="icon" className="ml-2" onClick={() => setIsPreviewOpen(true)}>
                                <Eye className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <TabsContent value="details" className="mt-0">
                        <ServiceDetailsCard
                            isReadOnly={props.isReadOnly}
                            technicians={technicians}
                            inventoryItems={invItems}
                            serviceTypes={serviceTypes}
                            mode={props.mode || 'service'}
                            onGenerateQuoteWithAI={handleGenerateQuote}
                            isGeneratingQuote={isGeneratingQuote}
                            isEnhancingText={isEnhancingText}
                            handleEnhanceText={handleEnhanceText as any}
                            onNewInventoryItemCreated={handleNewInventoryItemCreated}
                            categories={allCategories}
                            suppliers={allSuppliers}
                        />
                    </TabsContent>
                    <TabsContent value="reception" className="mt-0">
                       <ReceptionAndDelivery 
                         control={control}
                         isReadOnly={props.isReadOnly}
                         isEnhancingText={isEnhancingText}
                         handleEnhanceText={handleEnhanceText as any}
                         onOpenSignature={(kind) => { setSignatureType(kind); setIsSignatureDialogOpen(true); }}
                       />
                    </TabsContent>
                    <TabsContent value="photoreport" className="mt-0">
                         <PhotoReportTab
                            control={control}
                            isReadOnly={props.isReadOnly}
                            serviceId={initialDataService?.id || 'new'}
                            onPhotoUploaded={handlePhotoUploaded}
                            onViewImage={handleViewImage}
                         />
                    </TabsContent>
                    <TabsContent value="checklist" className="mt-0">
                        <SafetyChecklist
                            control={control}
                            isReadOnly={props.isReadOnly}
                            onSignatureClick={() => { setSignatureType('advisor'); setIsSignatureDialogOpen(true); }}
                            signatureDataUrl={watch('serviceAdvisorSignatureDataUrl')}
                            isEnhancingText={isEnhancingText}
                            handleEnhanceText={handleEnhanceText as any}
                            serviceId={initialDataService?.id || 'new'}
                            onPhotoUploaded={handleChecklistPhotoUploaded}
                            onViewImage={handleViewImage}
                        />
                    </TabsContent>
                </Tabs>
                 {watchedStatus === 'Entregado' && (
                    <div className="grid md:grid-cols-2 gap-6 mt-6">
                        {nextServiceInfo && isValid(parseDate(nextServiceInfo.date)!) && (
                            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/30">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="flex items-center gap-2 text-lg text-blue-800 dark:text-blue-300">
                                        <CalendarCheck className="h-5 w-5" />Próximo Servicio
                                    </CardTitle>
                                    <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                                        <Link href={`/vehiculos/${watchedVehicleId}`}>
                                            <Edit className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">Lo que ocurra primero:</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                        <div>
                                            <p className="font-semibold">Fecha:</p>
                                            <p>{format(parseDate(nextServiceInfo.date)!, "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
                                        </div>
                                        {nextServiceInfo.mileage && (
                                            <div>
                                                <p className="font-semibold">Kilometraje:</p>
                                                <p>{nextServiceInfo.mileage.toLocaleString("es-MX")} km</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        <PaymentSection isReadOnly={isReadOnly} customerName={customerName}/>
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign/>Resumen de Costos</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between font-bold text-lg text-primary"><span>Total (IVA Inc.):</span><span>{formatCurrency(totalCost)}</span></div>
                                    <div className="flex justify-between text-xs"><span>(-) Costo Insumos:</span><span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(totalSuppliesWorkshopCost)}</span></div>
                                    <hr className="my-1 border-dashed"/>
                                    <div className="flex justify-between font-bold text-green-700 dark:text-green-400"><span>(=) Ganancia:</span><span>{formatCurrency(serviceProfit)}</span></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
            
            <div className="p-6 pt-4 border-t flex-shrink-0 bg-background">
                {children}
            </div>
        </form>
      </FormProvider>

      <VehicleDialog
        open={isNewVehicleDialogOpen}
        onOpenChange={setIsNewVehicleDialogOpen}
        onSave={onVehicleCreated}
      />
      
      <SignatureDialog
        open={isSignatureDialogOpen}
        onOpenChange={setIsSignatureDialogOpen}
        onSave={handleSignatureSave}
      />

       {isPreviewOpen && initialDataService && (
        <UnifiedPreviewDialog
            open={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
            service={initialDataService}
        />
      )}

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <UiDialogContent className="max-w-4xl p-2">
            <UiDialogHeader className="print:hidden"><UiDialogTitle>Vista Previa de Imagen</UiDialogTitle></UiDialogHeader>
            <div className="relative aspect-video w-full">
                {viewingImageUrl && (<Image src={viewingImageUrl} alt="Vista ampliada" fill className="object-contain" />)}
            </div>
        </UiDialogContent>
      </Dialog>
    </>
  );
}

const PhotoReportTab = ({ control, isReadOnly, serviceId, onPhotoUploaded, onViewImage }: any) => {
    const { fields, append, remove } = useFieldArray({ control, name: 'photoReports' });
    const { watch } = useFormContext();
    return (
        <Card>
            <CardHeader><CardTitle>Reporte Fotográfico</CardTitle><CardDescription>Documenta el proceso con imágenes. Puedes crear varios reportes.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                {fields.map((field, index) => (
                     <Card key={field.id} className="p-4 bg-muted/30">
                         <div className="flex justify-between items-start mb-4">
                            <h4 className="text-base font-semibold">Reporte #{index + 1}</h4>
                            {!isReadOnly && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button>}
                        </div>
                        <div className="space-y-4">
                            <FormField control={control} name={`photoReports.${index}.description`} render={({ field }) => (
                                <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea placeholder="Describa el propósito de estas fotos..." {...field} disabled={isReadOnly}/></FormControl></FormItem>
                            )}/>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {(watch(`photoReports.${index}.photos`) || []).map((photoUrl: string, pIndex: number) => (
                                    <button type="button" key={pIndex} className="relative aspect-video w-full bg-muted rounded-md overflow-hidden group" onClick={() => onViewImage(photoUrl)}>
                                        <Image src={photoUrl} alt={`Foto ${pIndex + 1}`} fill objectFit="cover" className="transition-transform duration-300 group-hover:scale-105" data-ai-hint="car damage photo"/>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"><Eye className="h-6 w-6 text-white" /></div>
                                    </button>
                                ))}
                            </div>
                            {!isReadOnly && <PhotoUploader reportIndex={index} serviceId={serviceId} onUploadComplete={onPhotoUploaded} photosLength={(watch(`photoReports.${index}.photos`) || []).length} maxPhotos={10} />}
                        </div>
                     </Card>
                ))}
                {!isReadOnly && <Button type="button" variant="outline" onClick={() => append({ id: `rep_${Date.now()}`, date: new Date().toISOString(), description: '', photos: []})}><PlusCircle className="mr-2 h-4 w-4"/>Nuevo Reporte</Button>}
            </CardContent>
        </Card>
    );
};
