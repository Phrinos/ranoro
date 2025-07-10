// UPDATED ServiceForm.tsx – versión completa con la corrección de carga
// de fotos (PhotoUploader ahora entrega string[] y este form lo espera)
// Además se cambia la propiedad de dataToSave a totalSuppliesWorkshopCost
// para que compile.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import * as z from "zod";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { format, parseISO, setHours, setMinutes, isValid, addDays } from "date-fns";
import { es } from "date-fns/locale";

// UI components
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarIcon,
  PlusCircle,
  Trash2,
  BrainCircuit,
  Loader2,
  Printer,
  Ban,
  ShieldCheck,
  Wrench,
  Eye,
  Camera,
  FileCheck,
  Download,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  ServiceRecord,
  Vehicle,
  Technician,
  InventoryItem,
  QuoteRecord,
  WorkshopInfo,
  PaymentMethod,
} from "@/types";
import { useToast } from "@/hooks/use-toast";

// App‑specific helpers & placeholder data
import {
  placeholderVehicles as defaultPlaceholderVehicles,
  placeholderInventory,
  placeholderServiceRecords as defaultServiceRecords,
  persistToFirestore,
  AUTH_USER_LOCALSTORAGE_KEY,
} from "@/lib/placeholder-data";

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient.js";

// Child components
import { VehicleDialog } from "../../vehiculos/components/vehicle-dialog";
import type { VehicleFormValues } from "../../vehiculos/components/vehicle-form";
import { PhotoUploader } from "./PhotoUploader";
import { SafetyChecklist } from "./SafetyChecklist";
import { ServiceItemCard } from "./ServiceItemCard";
import { VehicleSelectionCard } from "./VehicleSelectionCard";
import { ReceptionAndDelivery } from "./ReceptionAndDelivery";
import { SignatureDialog } from "./signature-dialog";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { enhanceText } from '@/ai/flows/text-enhancement-flow';
import { suggestPrice } from '@/ai/flows/price-suggestion-flow';
import { suggestQuote } from '@/ai/flows/quote-suggestion-flow';

// -------------------------------------------------------------
// 1. Schema & types -----------------------------------------------------------

const supplySchema = z.object({
  supplyId: z.string().min(1),
  quantity: z.coerce.number().min(0.001),
  unitPrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  supplyName: z.string().optional(),
  isService: z.boolean().optional(),
  unitType: z.enum(["units", "ml", "liters"]).optional(),
});

const serviceItemSchema = z.object({
  id: z.string(),
  name: z.string().min(3),
  price: z.coerce.number().min(0).optional(),
  suppliesUsed: z.array(supplySchema),
});

const photoReportGroupSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string().optional(),
  photos: z.array(z.string().url()),
});

const paymentMethods: [PaymentMethod, ...PaymentMethod[]] = [
  "Efectivo",
  "Tarjeta",
  "Transferencia",
  "Efectivo+Transferencia",
  "Tarjeta+Transferencia",
];

const serviceFormSchemaBase = z.object({
  id: z.string().optional(),
  publicId: z.string().optional(),
  vehicleId: z.string().optional(),
  vehicleLicensePlateSearch: z.string().optional(),
  serviceDate: z.date().optional(),
  quoteDate: z.date().optional(),
  mileage: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
  technicianId: z.string().optional(),
  serviceItems: z.array(serviceItemSchema).min(1),
  status: z.enum(["Cotizacion", "Agendado", "En Espera de Refacciones", "Reparando", "Completado", "Entregado", "Cancelado"]).optional(),
  serviceType: z.enum(["Servicio General", "Cambio de Aceite", "Pintura"]).optional(),
  deliveryDateTime: z.date().optional(),
  vehicleConditions: z.string().optional(),
  fuelLevel: z.string().optional(),
  customerItems: z.string().optional(),
  customerSignatureReception: z.string().optional(),
  customerSignatureDelivery: z.string().optional(),
  paymentMethod: z.enum(paymentMethods).optional(),
  cardFolio: z.string().optional(),
  transferFolio: z.string().optional(),
  photoReports: z.array(photoReportGroupSchema).optional(),
  serviceAdvisorId: z.string().optional(),
  serviceAdvisorName: z.string().optional(),
  serviceAdvisorSignatureDataUrl: z.string().optional(),
}).refine(
  (d) => (d.status && d.status !== "Cotizacion" ? !!d.serviceDate : true),
  {
    message: "La fecha programada no es válida.",
    path: ["serviceDate"],
  }
);

export type ServiceFormValues = z.infer<typeof serviceFormSchemaBase>;

// -------------------------------------------------------------
// 2. Helpers --------------------------------------------------------------

const IVA_RATE = 0.16;
const generateUniqueId = () =>
  (Date.now().toString(36) + Math.random().toString(36).slice(2, 9)).toUpperCase();

// -------------------------------------------------------------
// 3. Main Component -------------------------------------------------------

export function ServiceForm(props: {
  initialDataService?: ServiceRecord | null;
  initialDataQuote?: Partial<QuoteRecord> | null;
  vehicles: Vehicle[];
  technicians: Technician[];
  inventoryItems: InventoryItem[];
  onSubmit: (d: ServiceRecord | QuoteRecord) => Promise<void>;
  onClose: () => void;
  isReadOnly?: boolean;
  onVehicleCreated?: (v: Vehicle) => void;
  mode?: "service" | "quote";
  onDelete?: (id: string) => void;
  onCancelService?: (id: string, reason: string) => void;
  onViewQuoteRequest?: (serviceId: string) => void;
}) {
  const {
    initialDataService,
    initialDataQuote,
    vehicles: parentVehicles,
    technicians,
    inventoryItems: inventoryItemsProp,
    onSubmit,
    onClose,
    isReadOnly = false,
    onVehicleCreated,
    mode = "service",
    onDelete,
    onCancelService,
  } = props;

  const initialData = mode === 'service' ? initialDataService : initialDataQuote;
  const { toast } = useToast();

  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>(parentVehicles);
  const [currentInventoryItems, setCurrentInventoryItems] =
    useState<InventoryItem[]>(inventoryItemsProp);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | {}>({});
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isEnhancingText, setIsEnhancingText] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [serviceForPreview, setServiceForPreview] =
    useState<ServiceRecord | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [activeTab, setActiveTab] = useState("servicio");
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [signatureFieldToSet, setSignatureFieldToSet] = useState<"reception" | "delivery" | "technician" | null>(null);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchemaBase),
    defaultValues: {
      id: undefined,
      status: mode === "service" ? "Agendado" : "Cotizacion",
      serviceItems: [],
      photoReports: [],
    },
  });

  const { control, getValues, setValue, reset, formState } = form;

  useEffect(() => {
    const dataToLoad = mode === 'service' ? initialDataService : initialDataQuote;
    const initialValues = {
      id: dataToLoad?.id,
      publicId: dataToLoad?.publicId,
      vehicleId: dataToLoad?.vehicleId,
      vehicleLicensePlateSearch: dataToLoad?.vehicleIdentifier || '',
      serviceDate: dataToLoad?.serviceDate ? parseISO(dataToLoad.serviceDate) : new Date(),
      quoteDate: dataToLoad?.quoteDate ? parseISO(dataToLoad.quoteDate) : (dataToLoad?.status === 'Cotizacion' ? new Date() : undefined),
      mileage: dataToLoad?.mileage,
      notes: dataToLoad?.notes,
      technicianId: dataToLoad?.technicianId,
      serviceItems: dataToLoad?.serviceItems || [],
      status: dataToLoad?.status || (mode === 'service' ? 'Agendado' : 'Cotizacion'),
      serviceType: dataToLoad?.serviceType || 'Servicio General',
      deliveryDateTime: dataToLoad?.deliveryDateTime ? parseISO(dataToLoad.deliveryDateTime) : undefined,
      vehicleConditions: dataToLoad?.vehicleConditions,
      fuelLevel: dataToLoad?.fuelLevel,
      customerItems: dataToLoad?.customerItems,
      customerSignatureReception: dataToLoad?.customerSignatureReception,
      customerSignatureDelivery: dataToLoad?.customerSignatureDelivery,
      paymentMethod: dataToLoad?.paymentMethod,
      cardFolio: dataToLoad?.cardFolio,
      transferFolio: dataToLoad?.transferFolio,
      photoReports: dataToLoad?.photoReports || [],
      serviceAdvisorId: dataToLoad?.serviceAdvisorId,
      serviceAdvisorName: dataToLoad?.serviceAdvisorName,
      serviceAdvisorSignatureDataUrl: dataToLoad?.serviceAdvisorSignatureDataUrl,
    };
    reset(initialValues);
  }, [initialDataService, initialDataQuote, mode, reset]);


  const { fields: serviceItemsFields, append: appendServiceItem, remove: removeServiceItem } =
    useFieldArray({ control, name: "serviceItems" });
  const { fields: photoReportFields, append: appendPhotoReport, remove: removePhotoReport } =
    useFieldArray({ control, name: "photoReports" });

  const watchedStatus = useWatch({ control, name: "status" });
  const watchedId = useWatch({ control, name: "id" });
  const watchedServiceItems = useWatch({ control, name: "serviceItems" });

  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useMemo(() => {
    let total = 0;
    let cost = 0;
    watchedServiceItems.forEach((it) => {
      total += Number(it.price) || 0;
      it.suppliesUsed?.forEach((s) => {
        cost += (s.unitPrice ?? 0) * s.quantity;
      });
    });
    return { totalCost: total, totalSuppliesWorkshopCost: cost, serviceProfit: total - cost };
  }, [watchedServiceItems]);

  const handlePhotoUploadComplete = useCallback(
    (reportIndex: number, urls: string[]) => {
      const current = getValues(`photoReports.${reportIndex}.photos`) || [];
      setValue(`photoReports.${reportIndex}.photos`, [...current, ...urls], {
        shouldDirty: true,
      });
    },
    [getValues, setValue]
  );

  const handleChecklistPhotoUpload = useCallback(
    (itemName: string, urls: string[]) => {
      const path = `safetyInspection.${itemName}` as const;
      const current = getValues(path) || { status: "na", photos: [] };
      setValue(path, { ...current, photos: [...current.photos, ...urls] }, {
        shouldDirty: true,
      });
    },
    [getValues, setValue]
  );
  
  const handleDownloadImage = () => {
    if (!viewingImageUrl) return;
    window.open(viewingImageUrl, '_blank')?.focus();
  };

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };
  
  const handleFormSubmit = useCallback(async (values: ServiceFormValues) => {
    if (isReadOnly) {
      onClose();
      return;
    }
    const dataToSave: ServiceRecord = {
      ...(values as ServiceRecord),
      id: values.id || `doc_${Date.now().toString(36)}`,
      totalCost,
      totalSuppliesCost: totalSuppliesWorkshopCost,
      serviceProfit,
    };
    
    await onSubmit(dataToSave);
  }, [isReadOnly, onClose, onSubmit, totalCost, totalSuppliesWorkshopCost, serviceProfit]);
  
  const handleEnhanceText = useCallback(async (fieldName: 'notes' | 'vehicleConditions' | 'customerItems' | 'safetyInspection.inspectionNotes' | `photoReports.${number}.description`) => {
    const currentValue = getValues(fieldName);
    if (!currentValue) return;
    setIsEnhancingText(fieldName);
    try {
        const contextMap = {
            'notes': 'Notas del Servicio',
            'vehicleConditions': 'Condiciones del Vehículo',
            'customerItems': 'Pertenencias del Cliente',
            'safetyInspection.inspectionNotes': 'Observaciones de Inspección',
        };
        const context = fieldName.startsWith('photoReports') ? 'Descripción de Foto' : contextMap[fieldName as keyof typeof contextMap];
        const enhancedText = await enhanceText({ text: currentValue, context });
        setValue(fieldName, enhancedText, { shouldDirty: true });
        toast({ title: 'Texto Mejorado', description: 'La descripción ha sido actualizada por la IA.' });
    } catch (error) {
        toast({ title: 'Error de IA', description: 'No se pudo mejorar el texto.', variant: 'destructive' });
    } finally {
        setIsEnhancingText(null);
    }
  }, [getValues, setValue, toast]);


  const handleOpenNewVehicleDialog = () => {
    setIsVehicleDialogOpen(true);
  };
  
  const handleSaveNewVehicle = async (vehicleData: VehicleFormValues) => {
    if (!onVehicleCreated) return;

    const newVehicle: Vehicle = {
      id: `VEH_${Date.now().toString(36)}`,
      ...vehicleData,
      year: Number(vehicleData.year),
    };
    
    onVehicleCreated(newVehicle);
    
    setLocalVehicles(prev => [...prev, newVehicle]);
    
    setValue('vehicleId', newVehicle.id, { shouldValidate: true });
    
    toast({ title: "Vehículo Creado", description: `Se registró a ${newVehicle.make} ${newVehicle.model}.` });
    setIsVehicleDialogOpen(false);
  };
  
  const handleConfirmDelete = async () => {
    if (onDelete && initialData?.id) {
        onDelete(initialData.id);
    } else if (onCancelService && initialData?.id && cancellationReason) {
        onCancelService(initialData.id, cancellationReason);
    }
    setIsCancelAlertOpen(false);
  };
  
  const handleOpenSignatureDialog = (type: "reception" | "delivery" | "technician") => {
    setSignatureFieldToSet(type);
    setIsSignatureDialogOpen(true);
  };

  const showReceptionTab = useMemo(
    () => mode === "service" && !["Cotizacion", "Agendado"].includes(watchedStatus ?? ""),
    [mode, watchedStatus]
  );
  const showReportTab = useMemo(
    () => mode === "service" && !["Cotizacion", "Agendado"].includes(watchedStatus ?? ""),
    [mode, watchedStatus]
  );


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-border sticky top-0 bg-background z-10 -mx-6 px-6 mb-6">
                <TabsList className="bg-transparent p-0 w-max -mb-px">
                  <TabsTrigger value="servicio" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-3 px-3 sm:px-4"><Wrench className="h-4 w-4 shrink-0"/> Detalles</TabsTrigger>
                  {showReceptionTab && (<TabsTrigger value="recepcion" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-3 px-3 sm:px-4"><FileCheck className="h-4 w-4 shrink-0"/> Rec. y Ent.</TabsTrigger>)}
                  {showReportTab && (<TabsTrigger value="reporte" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-3 px-3 sm:px-4"><Camera className="h-4 w-4 shrink-0"/> Fotos</TabsTrigger>)}
                  {showReceptionTab && (<TabsTrigger value="seguridad" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-3 px-3 sm:px-4"><ShieldCheck className="h-4 w-4 shrink-0"/> Revisión</TabsTrigger>)}
                </TabsList>
            </div>
            
            <TabsContent value="servicio" className="space-y-6">
                <VehicleSelectionCard localVehicles={localVehicles} isReadOnly={isReadOnly} onVehicleSelected={(v) => {}} onOpenNewVehicleDialog={handleOpenNewVehicleDialog} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="serviceType" render={({ field }) => ( <FormItem><FormLabel>Tipo de Servicio</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Servicio General">Servicio General</SelectItem><SelectItem value="Cambio de Aceite">Cambio de Aceite</SelectItem><SelectItem value="Pintura">Pintura</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="technicianId" render={({ field }) => ( <FormItem><FormLabel>Técnico Asignado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un técnico..." /></SelectTrigger></FormControl><SelectContent>{technicians.map(tech => <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                </div>
                {serviceItemsFields.map((field, index) => (
                    <ServiceItemCard key={field.id} serviceIndex={index} control={control} removeServiceItem={removeServiceItem} isReadOnly={isReadOnly} inventoryItems={currentInventoryItems} mode={mode} />
                ))}
                {!isReadOnly && (<Button type="button" variant="outline" size="sm" onClick={() => appendServiceItem({ id: `item_${Date.now()}`, name: '', price: 0, suppliesUsed: []})}><PlusCircle className="mr-2 h-4 w-4"/> Añadir Trabajo/Servicio</Button>)}
                 <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel className="flex justify-between items-center w-full"><span>Notas Adicionales del Servicio</span>{!isReadOnly && (<Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText('notes')} disabled={isEnhancingText === 'notes' || !field.value}>{isEnhancingText === 'notes' ? <Loader2 className="animate-spin" /> : <BrainCircuit className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">Mejorar</span></Button>)}</FormLabel><FormControl><Textarea placeholder="Notas internas, detalles importantes para el técnico..." {...field} disabled={isReadOnly} /></FormControl></FormItem> )}/>
            </TabsContent>

            <TabsContent value="recepcion"><ReceptionAndDelivery isReadOnly={isReadOnly} onCustomerSignatureClick={(type) => handleOpenSignatureDialog(type)} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText}/></TabsContent>
            
            <TabsContent value="reporte">
                <Card>
                    <CardHeader><CardTitle>Reporte Fotográfico</CardTitle><CardDescription>Adjunte fotos del estado del vehículo o del progreso del trabajo.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        {photoReportFields.map((field, index) => (
                            <Card key={field.id} className="p-4 bg-muted/30">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold">Reporte #{index + 1}</h4>
                                    {!isReadOnly && (<Button type="button" variant="ghost" size="icon" onClick={() => removePhotoReport(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>)}
                                </div>
                                <FormField control={form.control} name={`photoReports.${index}.description`} render={({ field: descField }) => (
                                    <FormItem>
                                        <FormLabel className="flex justify-between items-center w-full"><span>Descripción</span>{!isReadOnly && (<Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText(`photoReports.${index}.description`)} disabled={isEnhancingText === `photoReports.${index}.description` || !descField.value}><BrainCircuit className="h-4 w-4" /><span className="ml-2 hidden sm:inline">Mejorar</span></Button>)}</FormLabel>
                                        <FormControl><Textarea placeholder="Describa el progreso o el problema..." {...descField} disabled={isReadOnly} /></FormControl>
                                    </FormItem>
                                )}/>
                                 <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                                    {(getValues(`photoReports.${index}.photos`) || []).map((photo, pIndex) => (
                                      <div key={pIndex} className="relative aspect-video group">
                                        <Image src={photo} alt={`Foto ${pIndex+1}`} layout="fill" objectFit="cover" className="rounded-md"/>
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button type="button" variant="secondary" size="icon" onClick={() => handleViewImage(photo)}><Eye className="h-5 w-5"/></Button>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                                <PhotoUploader reportIndex={index} serviceId={watchedId || ""} onUploadComplete={handlePhotoUploadComplete} photosLength={field.photos.length} />
                            </Card>
                        ))}
                         {!isReadOnly && (<Button type="button" variant="outline" size="sm" onClick={() => appendPhotoReport({ id: `report_${Date.now()}`, date: new Date().toISOString(), photos: [] })}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Reporte Fotográfico</Button>)}
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="seguridad">
                <SafetyChecklist control={control} isReadOnly={isReadOnly} onSignatureClick={() => handleOpenSignatureDialog("technician")} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText} serviceId={watchedId || ""} onPhotoUploaded={handleChecklistPhotoUpload} onViewImage={handleViewImage}/>
            </TabsContent>
        </Tabs>
        
        <div className="flex justify-between items-center pt-4">
            {!isReadOnly && initialData?.id && (<AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}><AlertDialogTrigger asChild><Button type="button" variant="destructive"><Ban className="mr-2 h-4 w-4" />{mode === 'quote' ? 'Eliminar Cotización' : 'Cancelar Servicio'}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Está seguro?</AlertDialogTitle><AlertDialogDescription>{mode === 'quote' ? `Se eliminará la cotización ${initialDataQuote?.id}.` : `Se cancelará el servicio ${initialDataService?.id}.`}</AlertDialogDescription>{mode === 'service' && (<div className="mt-4"><Label htmlFor="cancellation-reason">Motivo (obligatorio)</Label><Textarea id="cancellation-reason" value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} className="mt-2" /></div>)}</AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setCancellationReason('')}>Volver</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} disabled={mode === 'service' && !cancellationReason.trim()} className="bg-destructive hover:bg-destructive/90">Sí, proceder</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
            <div className="flex justify-end gap-2 w-full">
              {isReadOnly ? <Button type="button" variant="outline" onClick={onClose}>Cerrar</Button> : (<><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={form.formState.isSubmitting || !getValues('vehicleId')}>{form.formState.isSubmitting ? "Guardando..." : (initialData?.id ? "Actualizar" : "Crear")}</Button></>)}
            </div>
        </div>
      </form>
      <VehicleDialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen} onSave={handleSaveNewVehicle} vehicle={{ licensePlate: form.getValues('vehicleLicensePlateSearch') }}/>
      <SignatureDialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen} onSave={(sig) => {
        if(signatureFieldToSet) {
            const fieldMap = { reception: 'customerSignatureReception', delivery: 'customerSignatureDelivery', technician: 'serviceAdvisorSignatureDataUrl' };
            setValue(fieldMap[signatureFieldToSet] as any, sig, { shouldDirty: true });
            setIsSignatureDialogOpen(false);
            setSignatureFieldToSet(null);
        }
      }} />
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl p-2">
            <DialogHeader className="print:hidden"><DialogTitle>Vista Previa de Imagen</DialogTitle><DialogDescription>Visualizando imagen de evidencia. Puede descargar una copia.</DialogDescription></DialogHeader>
            <div className="relative aspect-video w-full">
                {viewingImageUrl && (<Image src={viewingImageUrl} alt="Vista ampliada de evidencia" layout="fill" objectFit="contain" crossOrigin="anonymous" />)}
            </div>
            <DialogFooter className="mt-2 print:hidden">
                <Button onClick={handleDownloadImage}>
                    <Download className="mr-2 h-4 w-4"/>Descargar Imagen
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
