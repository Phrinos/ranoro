
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
  CalendarIcon
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { format, setHours, setMinutes, isValid, addDays } from 'date-fns';
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
import { cn } from '@/lib/utils'
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data'

import type {
  ServiceRecord, Vehicle, Technician, InventoryItem,
  QuoteRecord, User, ServiceTypeRecord, SafetyInspection, PhotoReportGroup, ServiceItem as ServiceItemType, SafetyCheckValue
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
  onDelete?:(id:string)=>void
  onCancelService?:(id:string,r:string)=>void
  onStatusChange?:(s?:ServiceRecord['status'])=>void
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

  const initData = initialDataService ?? null;
  const { toast } = useToast();
  
  const defaultValues = useMemo<ServiceFormValues>(() => {
    const firstType = serviceTypes[0]?.name ?? 'Servicio General';
    const now = new Date();

    const getInitialStatus = (): ServiceRecord['status'] => {
      if (initData) return initData.status ?? 'Cotizacion';
      if (mode === 'quote') return 'Cotizacion';
      return 'En Taller';
    };

    if (initData) {
      return {
        ...initData,
        status: getInitialStatus(),
        serviceType: initData.serviceType ?? firstType,
        serviceDate: initData.serviceDate ? parseDate(initData.serviceDate) : undefined,
        quoteDate: initData.quoteDate ? parseDate(initData.quoteDate) : (getInitialStatus() === 'Cotizacion' ? now : undefined),
        receptionDateTime: initData.receptionDateTime ? parseDate(initData.receptionDateTime) : undefined,
        deliveryDateTime: initData.deliveryDateTime ? parseDate(initData.deliveryDateTime) : undefined,
        serviceItems:
          initData.serviceItems?.length
            ? initData.serviceItems
            : [
                {
                  id: nanoid(),
                  name: initData.serviceType ?? firstType,
                  price: initData.totalCost ?? undefined,
                  suppliesUsed: [],
                },
              ],
        photoReports:
          initData.photoReports?.length
            ? initData.photoReports
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
    
    const initialStatus = getInitialStatus();

    return {
      status: initialStatus,
      serviceType: firstType,
      serviceDate: initialStatus === 'Agendado' ? new Date() : undefined,
      quoteDate: initialStatus === 'Cotizacion' ? now : undefined,
      serviceItems: [{
        id: nanoid(),
        name: firstType,
        price: undefined,
        suppliesUsed: [],
      }],
      photoReports: [{
        id: `rep_recepcion_${Date.now()}`,
        date: now.toISOString(),
        description: 'Fotografias de la recepcion del vehiculo',
        photos: [],
      }],
      serviceAdvisorId: authUser?.id,
      serviceAdvisorName: authUser?.name,
      serviceAdvisorSignatureDataUrl: authUser?.signatureDataUrl ?? '',
    } as ServiceFormValues;
  }, [initData, serviceTypes, mode]);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues,
    values: defaultValues,
  });
  
  const { control, setValue, watch, formState, handleSubmit } = form;
  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useServiceTotals(form);
  
  const watchedStatus = watch('status');

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
        if (name === 'status') {
            const currentStatus = value.status;
            // From Quote to Scheduled
            if (currentStatus === 'Agendado' && !value.serviceDate) {
                setValue('serviceDate', new Date());
                setValue('appointmentStatus', 'Creada'); // Default to not confirmed
            }
            // Entering Workshop
            if (currentStatus === 'En Taller' && !value.receptionDateTime) {
                setValue('receptionDateTime', new Date());
            }
        }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);
  
  const [activeTab, setActiveTab] = useState('details')
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false)
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false)
  const [signatureType, setSignatureType] = useState<'advisor' | 'reception' | 'delivery' | null>(null)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null)
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false)
  const [isEnhancingText, setIsEnhancingText] = useState<string | null>(null)

  const handleEnhanceText = useCallback(async (fieldName: keyof ServiceFormValues | `photoReports.${number}.description` | `safetyInspection.${keyof SafetyInspection}.notes` | `safetyInspection.inspectionNotes`) => {
    setIsEnhancingText(fieldName);
    const textToEnhance = form.getValues(fieldName as any);
    const contextMap = {
        notes: "Notas Generales del Servicio",
        vehicleConditions: "Condiciones del Vehículo",
        customerItems: "Pertenencias del Cliente",
        'safetyInspection.inspectionNotes': "Observaciones de Inspección",
    };
    const context = (contextMap as any)[fieldName] || 'Descripción de Reporte Fotográfico';
    
    try {
        const enhancedText = await enhanceText({ text: textToEnhance, context });
        form.setValue(fieldName as any, enhancedText, { shouldDirty: true });
    } catch (e) {
        toast({ title: 'Error de IA', description: 'No se pudo mejorar el texto.', variant: 'destructive' });
    } finally {
        setIsEnhancingText(null);
    }
  }, [form, toast]);

  const handleGenerateQuote = useCallback(async () => {
    setIsGeneratingQuote(true)
    const values = form.getValues()
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
        serviceHistory: [], // Pasar historial si está disponible
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
      form.setValue('serviceItems', newServiceItems)
      form.setValue('notes', result.reasoning)
      toast({ title: "Cotización Sugerida", description: "La IA ha generado una sugerencia." })
    } catch (e) {
      toast({ title: "Error de IA", variant: "destructive" })
    } finally {
      setIsGeneratingQuote(false)
    }
  }, [form, parentVehicles, invItems, toast])

  const onVehicleCreated = useCallback(async (newVehicleData: VehicleFormValues) => {
    console.log("Creating vehicle:", newVehicleData);
    // This part should be handled by the parent page now.
  }, [])
  
  const handlePhotoUploaded = useCallback((reportIndex: number, url: string) => {
    const currentPhotos = form.getValues(`photoReports.${reportIndex}.photos`) || [];
    form.setValue(`photoReports.${reportIndex}.photos`, [...currentPhotos, url]);
  }, [form]);

  const handleChecklistPhotoUploaded = useCallback((itemName: string, url: string) => {
      const fieldName: `safetyInspection.${keyof SafetyInspection}` = `safetyInspection.${itemName as keyof SafetyInspection}`;
      const currentCheckValue = form.getValues(fieldName) as SafetyCheckValue || { status: 'na', photos: [] };
      const updatedPhotos = [...(currentCheckValue.photos || []), url];
      form.setValue(fieldName, { ...currentCheckValue, photos: updatedPhotos });
  }, [form]);

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };
  
  const IVA = 0.16;
  const formSubmitWrapper = (values: ServiceFormValues) => {
    // Clone and convert dates to ISO strings for Firestore
    const dataToSubmit: any = { ...values };
    if (dataToSubmit.serviceDate instanceof Date) {
      dataToSubmit.serviceDate = dataToSubmit.serviceDate.toISOString();
    }
    if (dataToSubmit.quoteDate instanceof Date) {
      dataToSubmit.quoteDate = dataToSubmit.quoteDate.toISOString();
    }
    if (dataToSubmit.receptionDateTime instanceof Date) {
      dataToSubmit.receptionDateTime = dataToSubmit.receptionDateTime.toISOString();
    }
    if (dataToSubmit.deliveryDateTime instanceof Date) {
      dataToSubmit.deliveryDateTime = dataToSubmit.deliveryDateTime.toISOString();
    }
    
    // Add calculated totals
    dataToSubmit.totalCost = totalCost;
    dataToSubmit.totalSuppliesWorkshopCost = totalSuppliesWorkshopCost;
    dataToSubmit.serviceProfit = serviceProfit;
    dataToSubmit.subTotal = totalCost / (1 + IVA);
    dataToSubmit.taxAmount = totalCost - (totalCost / (1 + IVA));
    
    onSubmit(cleanObjectForFirestore(dataToSubmit));
  };
  
  const cleanObjectForFirestore = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj === undefined ? null : obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(cleanObjectForFirestore).filter(v => v !== null); // Filter out nulls from arrays too
    }
    return Object.entries(obj).reduce((acc, [key, value]) => {
        if (value !== undefined) {
            acc[key] = cleanObjectForFirestore(value);
        }
        return acc;
    }, {} as any);
  };

  return (
    <>
      <FormProvider {...form}>
        <form id="service-form" onSubmit={handleSubmit(formSubmitWrapper)} className="flex-grow flex flex-col overflow-hidden">
            <div className="flex-grow overflow-y-auto px-6 space-y-6">
                <VehicleSelectionCard
                    isReadOnly={props.isReadOnly}
                    localVehicles={parentVehicles}
                    serviceHistory={[]}
                    onVehicleSelected={(v) => form.setValue('vehicleIdentifier', v?.licensePlate)}
                    onOpenNewVehicleDialog={() => setIsNewVehicleDialogOpen(true)}
                />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className={cn("grid w-full mb-4 sticky top-0 z-10 bg-background py-2", "grid-cols-4")}>
                        <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Detalles</TabsTrigger>
                        <TabsTrigger value="reception" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Recepción/Entrega</TabsTrigger>
                        <TabsTrigger value="photoreport" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Fotos</TabsTrigger>
                        <TabsTrigger value="checklist" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Revisión</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details" className="mt-0">
                        <ServiceDetailsCard
                            isReadOnly={props.isReadOnly}
                            technicians={technicians}
                            inventoryItems={invItems}
                            serviceTypes={serviceTypes}
                            mode={props.mode || 'service'}
                            totalCost={totalCost}
                            totalSuppliesWorkshopCost={totalSuppliesWorkshopCost}
                            serviceProfit={serviceProfit}
                            onGenerateQuoteWithAI={handleGenerateQuote}
                            isGeneratingQuote={isGeneratingQuote}
                        />
                    </TabsContent>
                    <TabsContent value="reception" className="mt-0">
                       <ReceptionAndDelivery 
                         control={control}
                         isReadOnly={props.isReadOnly}
                         isEnhancingText={isEnhancingText}
                         handleEnhanceText={handleEnhanceText as any}
                       />
                    </TabsContent>
                    <TabsContent value="photoreport" className="mt-0">
                         <PhotoReportTab
                            control={control}
                            isReadOnly={props.isReadOnly}
                            serviceId={initData?.id || 'new'}
                            onPhotoUploaded={handlePhotoUploaded}
                            onViewImage={handleViewImage}
                         />
                    </TabsContent>
                    <TabsContent value="checklist" className="mt-0">
                        <SafetyChecklist
                            control={control}
                            isReadOnly={props.isReadOnly}
                            onSignatureClick={() => setSignatureType('advisor')}
                            signatureDataUrl={watch('serviceAdvisorSignatureDataUrl')}
                            isEnhancingText={isEnhancingText}
                            handleEnhanceText={handleEnhanceText as any}
                            serviceId={initData?.id || 'new'}
                            onPhotoUploaded={handleChecklistPhotoUploaded}
                            onViewImage={handleViewImage}
                        />
                    </TabsContent>
                </Tabs>
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

// Photo Report Tab Component
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
                                        <Image src={photoUrl} alt={`Foto ${pIndex + 1}`} fill objectFit="cover" className="transition-transform duration-300 group-hover:scale-105" data-ai-hint="car service photo"/>
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
