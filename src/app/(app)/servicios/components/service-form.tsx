

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Ban, Camera, CheckCircle, Eye, Loader2, PlusCircle, ShieldCheck, Signature, Trash2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, isValid } from 'date-fns';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, User, WorkshopInfo, ServiceTypeRecord } from "@/types";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { VehicleDialog } from "../../vehiculos/components/vehicle-dialog";
import type { VehicleFormValues } from "../../vehiculos/components/vehicle-form";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { enhanceText } from '@/ai/flows/text-enhancement-flow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignatureDialog } from './signature-dialog';
import { savePublicDocument } from "@/lib/public-document";
import { SafetyChecklist } from './SafetyChecklist';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { VehicleSelectionCard } from './VehicleSelectionCard';
import { ReceptionAndDelivery } from './ReceptionAndDelivery';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from "next/legacy/image";
import { Download } from "lucide-react";
import { ServiceDetailsCard } from "./ServiceDetailsCard";
import { Textarea } from "@/components/ui/textarea";
import { db } from '@/lib/firebaseClient.js';
import { doc } from 'firebase/firestore';
import { Card, CardHeader, CardContent } from "@/components/ui/card";


const supplySchema = z.object({
  supplyId: z.string().min(1, "Seleccione un insumo"),
  quantity: z.coerce.number().min(0.001, "La cantidad debe ser mayor a 0"),
  unitPrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  supplyName: z.string().optional(),
  isService: z.boolean().optional(),
  unitType: z.enum(['units', 'ml', 'liters']).optional(),
});

const serviceItemSchema = z.object({
  id: z.string(),
  name: z.string().min(3, "El nombre del servicio es requerido."),
  price: z.coerce.number({invalid_type_error: "El precio debe ser un número."}).min(0, "El precio debe ser un número positivo.").optional(),
  suppliesUsed: z.array(supplySchema),
});

const photoReportGroupSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string().optional(),
  photos: z.array(z.string().url("URL de foto inválida.")),
});

const safetyCheckValueSchema = z.object({
  status: z.enum(['ok', 'atencion', 'inmediata', 'na']).default('na'),
  photos: z.array(z.string().url()).default([]),
});

const safetyInspectionSchema = z.object({
  luces_altas_bajas_niebla: safetyCheckValueSchema.optional(),
  luces_cuartos: safetyCheckValueSchema.optional(),
  luces_direccionales: safetyCheckValueSchema.optional(),
  luces_frenos_reversa: safetyCheckValueSchema.optional(),
  luces_interiores: safetyCheckValueSchema.optional(),
  fugas_refrigerante: safetyCheckValueSchema.optional(),
  fugas_limpiaparabrisas: safetyCheckValueSchema.optional(),
  fugas_frenos_embrague: safetyCheckValueSchema.optional(),
  fugas_transmision: safetyCheckValueSchema.optional(),
  fugas_direccion_hidraulica: safetyCheckValueSchema.optional(),
  carroceria_cristales_espejos: safetyCheckValueSchema.optional(),
  carroceria_puertas_cofre: safetyCheckValueSchema.optional(),
  carroceria_asientos_tablero: safetyCheckValueSchema.optional(),
  carroceria_plumas: safetyCheckValueSchema.optional(),
  suspension_rotulas: safetyCheckValueSchema.optional(),
  suspension_amortiguadores: safetyCheckValueSchema.optional(),
  suspension_caja_direccion: safetyCheckValueSchema.optional(),
  suspension_terminales: safetyCheckValueSchema.optional(),
  llantas_delanteras_traseras: safetyCheckValueSchema.optional(),
  llantas_refaccion: safetyCheckValueSchema.optional(),
  frenos_discos_delanteros: safetyCheckValueSchema.optional(),
  frenos_discos_traseros: safetyCheckValueSchema.optional(),
  otros_tuberia_escape: safetyCheckValueSchema.optional(),
  otros_soportes_motor: safetyCheckValueSchema.optional(),
  otros_claxon: safetyCheckValueSchema.optional(),
  otros_inspeccion_sdb: safetyCheckValueSchema.optional(),
  inspectionNotes: z.string().optional(),
  technicianSignature: z.string().optional(),
}).optional();

const serviceFormSchemaBase = z.object({
  id: z.string().optional(), 
  publicId: z.string().optional(),
  vehicleId: z.string({required_error: "Debe seleccionar o registrar un vehículo."}).min(1, "Debe seleccionar o registrar un vehículo.").optional(),
  vehicleLicensePlateSearch: z.string().optional(),
  serviceDate: z.date().optional(),
  quoteDate: z.date().optional(), 
  mileage: z.coerce.number({ invalid_type_error: "El kilometraje debe ser numérico." }).int("El kilometraje debe ser un número entero.").min(0, "El kilometraje no puede ser negativo.").optional(),
  notes: z.string().optional(),
  technicianId: z.string().optional(),
  serviceItems: z.array(serviceItemSchema).min(1, "Debe agregar al menos un ítem de servicio."),
  status: z.enum(["Cotizacion", "Agendado", "En Taller", "Entregado", "Cancelado"]).optional(),
  subStatus: z.enum(["En Espera de Refacciones", "Reparando", "Completado"]).optional(),
  serviceType: z.string().optional(),
  receptionDateTime: z.date().optional(),
  deliveryDateTime: z.date({ invalid_type_error: "La fecha de entrega no es válida." }).optional(),
  vehicleConditions: z.string().optional(),
  fuelLevel: z.string().optional(),
  customerItems: z.string().optional(),
  customerSignatureReception: z.string().optional(),
  customerSignatureDelivery: z.string().optional(),
  safetyInspection: safetyInspectionSchema.optional(),
  serviceAdvisorId: z.string().optional(),
  serviceAdvisorName: z.string().optional(),
  serviceAdvisorSignatureDataUrl: z.string().optional(),
  photoReports: z.array(photoReportGroupSchema).optional(),
}).refine(data => {
    // A service being 'Agendado' (Scheduled) must have a service date.
    if (data.status === 'Agendado' && !data.serviceDate) {
        return false;
    }
    return true;
}, {
    message: "La fecha de la cita es obligatoria para el estado 'Agendado'.",
    path: ["serviceDate"],
});


export type ServiceFormValues = z.infer<typeof serviceFormSchemaBase>;

interface ServiceFormProps {
  initialDataService?: ServiceRecord | null;
  initialDataQuote?: Partial<QuoteRecord> | null;
  vehicles: Vehicle[];
  technicians: Technician[];
  inventoryItems: InventoryItem[];
  serviceHistory: ServiceRecord[];
  serviceTypes: ServiceTypeRecord[];
  onSubmit: (data: ServiceRecord | QuoteRecord) => Promise<void>;
  onClose: () => void;
  isReadOnly?: boolean;
  onVehicleCreated?: (newVehicle: Omit<Vehicle, 'id'>) => void; 
  mode?: 'service' | 'quote';
  onDelete?: (id: string) => void;
  onCancelService?: (serviceId: string, reason: string) => void;
  onStatusChange?: (newStatus?: ServiceRecord['status']) => void;
}

const IVA_RATE = 0.16;

const generateUniqueId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 9)).toUpperCase();

export function ServiceForm({
  initialDataService,
  initialDataQuote,
  vehicles: parentVehicles,
  technicians,
  inventoryItems: inventoryItemsProp,
  serviceHistory,
  serviceTypes,
  onSubmit,
  onClose,
  isReadOnly = false,
  onVehicleCreated,
  mode = 'service',
  onDelete,
  onCancelService,
  onStatusChange,
}: ServiceFormProps) {
  const { toast } = useToast();
  
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>(parentVehicles);
  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>(inventoryItemsProp);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | {}>({});
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isEnhancingText, setIsEnhancingText] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [newVehicleInitialData, setNewVehicleInitialData] = useState<Partial<VehicleFormValues> | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [serviceForPreview, setServiceForPreview] = useState<ServiceRecord | null>(null);
  const [isTechSignatureDialogOpen, setIsTechSignatureDialogOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  
  const freshUserRef = useRef<User | null>(null);
  const initialData = mode === 'service' ? initialDataService : initialDataQuote;
  const originalStatusRef = useRef(initialData?.status);
  
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchemaBase),
  });
  const { control, getValues, setValue, watch, trigger } = form;

  const watchedId = useWatch({ control, name: 'id' });
  const watchedStatus = watch('status');
  const watchedServiceItems = useWatch({ control, name: "serviceItems" });

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(watchedStatus);
    }
  }, [watchedStatus, onStatusChange]);

  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useMemo(() => {
    let calculatedTotalCost = 0;
    let workshopCost = 0;
    if (Array.isArray(watchedServiceItems)) {
        for (const item of watchedServiceItems) {
            calculatedTotalCost += Number(item.price) || 0;
            if (item.suppliesUsed) {
                for (const supply of item.suppliesUsed) {
                    const costPerUnit = supply.unitPrice ?? 0;
                    workshopCost += (costPerUnit * supply.quantity);
                }
            }
        }
    }
    return {
      totalCost: calculatedTotalCost,
      totalSuppliesWorkshopCost: workshopCost,
      serviceProfit: calculatedTotalCost - workshopCost,
    };
  }, [watchedServiceItems]);

  const showReceptionTab = useMemo(() => mode === 'service' && watchedStatus !== 'Cotizacion' && watchedStatus !== 'Agendado', [mode, watchedStatus]);
  const showReportTab = useMemo(() => mode === 'service' && (watchedStatus === 'En Taller' || watchedStatus === 'Entregado' || watchedStatus === 'Cancelado'), [mode, watchedStatus]);
  const showChecklistTab = useMemo(() => mode === 'service' && (watchedStatus === 'En Taller' || watchedStatus === 'Entregado' || watchedStatus === 'Cancelado'), [mode, watchedStatus]);


  useEffect(() => { setLocalVehicles(parentVehicles); }, [parentVehicles]);
  useEffect(() => { setCurrentInventoryItems(inventoryItemsProp); }, [inventoryItemsProp]);

  const refreshCurrentUser = useCallback(() => {
    const authUserString = typeof window !== "undefined" ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
    freshUserRef.current = authUserString ? JSON.parse(authUserString) : null;
  }, []);
  
  useEffect(() => {
      const currentStatus = getValues('status');
      if (originalStatusRef.current !== 'En Taller' && currentStatus === 'En Taller') {
          const currentSubStatus = getValues('subStatus');
          if (!currentSubStatus) {
              setValue('subStatus', 'Reparando');
          }
      }
      originalStatusRef.current = currentStatus;
  }, [watchedStatus, getValues, setValue]);

  useEffect(() => {
    const data = initialData;
    refreshCurrentUser();
    const storedWorkshopInfo = typeof window !== "undefined" ? localStorage.getItem("workshopTicketInfo") : null;
    if (storedWorkshopInfo) setWorkshopInfo(JSON.parse(storedWorkshopInfo));
    
    const parseDate = (date: any) => date && (typeof date.toDate === 'function' ? date.toDate() : (typeof date === 'string' ? parseISO(date) : date));
    
    let photoReportsData = (data as ServiceRecord)?.photoReports || [];
    if (!isReadOnly && (!photoReportsData || photoReportsData.length === 0)) {
        photoReportsData = [{ id: `rep_recepcion_${Date.now()}`, date: new Date().toISOString(), description: "Notas de la Recepción", photos: [] }];
    }
    
    let serviceItemsData = data?.serviceItems || [];
    if (serviceItemsData.length === 0 && !isReadOnly) {
        serviceItemsData = [{ id: `item_${Date.now()}`, name: '', price: undefined, suppliesUsed: [] }];
    }

    form.reset({
        id: data?.id || `SRV-${generateUniqueId()}`,
        status: data?.status || (mode === 'quote' ? 'Cotizacion' : 'Agendado'),
        subStatus: (data as ServiceRecord)?.subStatus || undefined,
        publicId: (data as any)?.publicId, vehicleId: data?.vehicleId ? String(data.vehicleId) : undefined,
        vehicleLicensePlateSearch: data?.vehicleIdentifier || "",
        // Ensure new records have a default valid date
        serviceDate: parseDate(data?.serviceDate) || new Date(),
        quoteDate: parseDate(data?.quoteDate) || new Date(),
        receptionDateTime: isValid(parseDate((data as ServiceRecord)?.receptionDateTime)) ? parseDate((data as ServiceRecord)?.receptionDateTime) : undefined,
        deliveryDateTime: isValid(parseDate((data as ServiceRecord)?.deliveryDateTime)) ? parseDate((data as ServiceRecord)?.deliveryDateTime) : undefined,
        mileage: data?.mileage || undefined,
        notes: data?.notes || "", technicianId: (data as ServiceRecord)?.technicianId || (data as QuoteRecord)?.preparedByTechnicianId || undefined,
        serviceType: data?.serviceType || serviceTypes[0]?.name || 'Servicio General',
        vehicleConditions: (data as ServiceRecord)?.vehicleConditions || "", fuelLevel: (data as ServiceRecord)?.fuelLevel || undefined,
        customerItems: (data as ServiceRecord)?.customerItems || '',
        customerSignatureReception: (data as ServiceRecord)?.customerSignatureReception || undefined,
        customerSignatureDelivery: (data as ServiceRecord)?.customerSignatureDelivery || undefined,
        safetyInspection: data?.safetyInspection || {}, 
        serviceAdvisorId: data?.serviceAdvisorId || freshUserRef.current?.id || '',
        serviceAdvisorName: data?.serviceAdvisorName || freshUserRef.current?.name || '',
        serviceAdvisorSignatureDataUrl: data?.serviceAdvisorSignatureDataUrl || freshUserRef.current?.signatureDataUrl || '',
        photoReports: photoReportsData,
        serviceItems: serviceItemsData,
    });
    
  }, [initialData, mode, form, isReadOnly, refreshCurrentUser, serviceTypes, getValues, setValue]);
  
  const handlePhotoUploadComplete = useCallback(
    (reportIndex: number, url: string) => {
      const currentPhotos =
        getValues(`photoReports.${reportIndex}.photos`) || [];
      setValue(
        `photoReports.${reportIndex}.photos`,
        [...currentPhotos, url],
        { shouldDirty: true }
      );
    },
    [getValues, setValue]
  );
  
  const handleChecklistPhotoUpload = useCallback(
    (itemName: string, urls: string[]) => {
      const path = `safetyInspection.${itemName}` as const;
      const current = getValues(path) || { status: "na", photos: [] };
      setValue(
        path,
        { ...current, photos: [...current.photos, ...urls] },
        { shouldDirty: true }
      );
    },
    [getValues, setValue]
  );

  const handleViewImage = (url: string) => { setViewingImageUrl(url); setIsImageViewerOpen(true); };
  
  const handleDownloadImage = useCallback(() => {
    if (!viewingImageUrl) return;
    try {
      window.open(viewingImageUrl, '_blank')?.focus();
    } catch (err) {
      console.error("Error opening image:", err);
      toast({
        title: "Error al Abrir",
        description: "No se pudo abrir la imagen en una nueva pestaña.",
        variant: "destructive"
      });
    }
  }, [viewingImageUrl, toast]);

  const handleSaveNewVehicle = useCallback(async (vehicleData: VehicleFormValues) => {
    if (!onVehicleCreated) return;
    const newVehicle: Omit<Vehicle, 'id'> = {
      ...vehicleData,
      year: Number(vehicleData.year),
    };
    onVehicleCreated(newVehicle);
    // The parent will now handle adding to DB and updating state
    setValue('vehicleId', `new_${vehicleData.licensePlate}`, { shouldValidate: true });
    setValue('vehicleLicensePlateSearch', newVehicle.licensePlate);
    setIsVehicleDialogOpen(false);
    toast({ title: "Vehículo Registrado", description: `Se registró ${newVehicle.make} ${newVehicle.model} (${newVehicle.licensePlate}).`});
  }, [onVehicleCreated, setValue, toast]);

  const handleEnhanceText = useCallback(async (fieldName: 'notes' | 'vehicleConditions' | 'customerItems' | 'safetyInspection.inspectionNotes' | `photoReports.${number}.description`) => {
    const contextMap: Record<string, string> = { 'notes': 'Notas Adicionales', 'vehicleConditions': 'Condiciones del Vehículo', 'customerItems': 'Pertenencias del Cliente', 'safetyInspection.inspectionNotes': 'Observaciones de Inspección', 'photoDescription': 'Descripción de Foto' };
    const contextKey = fieldName.startsWith('photoReports') ? 'photoDescription' : fieldName;
    const context = contextMap[contextKey];
    const currentValue = form.getValues(fieldName as any);

    if (!currentValue || currentValue.trim().length < 2) return toast({ title: 'Texto insuficiente', variant: 'default' });
    
    setIsEnhancingText(fieldName);
    try {
        const result = await enhanceText({ text: currentValue, context });
        form.setValue(fieldName as any, result, { shouldDirty: true });
        toast({ title: 'Texto Mejorado' });
    } catch (e) {
        toast({ title: "Error de IA", variant: "destructive" });
    } finally {
        setIsEnhancingText(null);
    }
  }, [form, toast]);

  const handleFormSubmit = useCallback(async (values: ServiceFormValues) => {
    if (isReadOnly) return onClose();
    if (!freshUserRef.current) return toast({ title: "Error de Sesión", variant: "destructive" });
    if (!getValues('vehicleId')) return toast({ title: "Vehículo no seleccionado", variant: "destructive" });
    if (!(await trigger())) return toast({ title: "Formulario Incompleto", variant: "destructive" });

    // Handle automatic timestamps
    if(originalStatusRef.current !== 'En Taller' && values.status === 'En Taller' && !values.receptionDateTime) {
        values.receptionDateTime = new Date();
    }
    
    const dataToSave: ServiceRecord = {
        ...values,
        id: values.id || generateUniqueId(),
        publicId: values.publicId || `s_${generateUniqueId().toLowerCase()}`,
        vehicleId: getValues('vehicleId')!,
        description: (values.serviceItems || []).map(item => item.name).join(', ') || 'Servicio',
        technicianId: values.technicianId || '',
        status: values.status || 'Agendado',
        totalCost: totalCost, 
        totalSuppliesWorkshopCost: totalSuppliesWorkshopCost, 
        serviceProfit,
        serviceDate: values.serviceDate ? values.serviceDate.toISOString() : new Date().toISOString(),
        quoteDate: values.quoteDate?.toISOString(), 
        receptionDateTime: values.receptionDateTime?.toISOString(),
        deliveryDateTime: values.deliveryDateTime?.toISOString(),
        vehicleIdentifier: getValues('vehicleLicensePlateSearch') || 'N/A',
        technicianName: technicians.find(t => t.id === values.technicianId)?.name || 'N/A',
        subTotal: totalCost / (1 + IVA_RATE), taxAmount: totalCost - (totalCost / (1 + IVA_RATE)),
        serviceAdvisorId: freshUserRef.current.id,
        serviceAdvisorName: freshUserRef.current.name,
        serviceAdvisorSignatureDataUrl: freshUserRef.current.signatureDataUrl,
        workshopInfo: (workshopInfo && Object.keys(workshopInfo).length > 0) ? workshopInfo as WorkshopInfo : undefined,
    };
    
    if (db) {
        await savePublicDocument('service', dataToSave, localVehicles.find(v => v.id === getValues('vehicleId')) || null, workshopInfo);
    }
    await onSubmit(dataToSave);
    toast({ title: `${!initialData?.id ? 'Creado' : 'Actualizado'} con Éxito` });
    onClose();
  }, [isReadOnly, onClose, getValues, onSubmit, toast, technicians, totalCost, serviceProfit, workshopInfo, initialData, localVehicles, currentInventoryItems, totalSuppliesWorkshopCost, trigger]);

  const handlePrintSheet = useCallback(() => {
    const serviceData = form.getValues() as ServiceRecord;
    setServiceForPreview({ ...serviceData, serviceAdvisorName: form.getValues('serviceAdvisorName'), serviceAdvisorSignatureDataUrl: form.getValues('serviceAdvisorSignatureDataUrl') });
    setIsPreviewOpen(true);
  }, [form]);

  const handleGenerateQuoteWithAI = useCallback(async () => {
    setIsGeneratingQuote(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.warn("handleGenerateQuoteWithAI should be passed from the parent.");
    setIsGeneratingQuote(false);
  }, []);
  
  const handleConfirmDelete = useCallback(() => {
    if (onDelete && mode === 'quote' && initialDataQuote?.id) {
      onDelete(initialDataQuote.id);
    } else if (onCancelService && initialDataService?.id) {
      if (!cancellationReason.trim()) return toast({ title: "Motivo Requerido", variant: "destructive" });
      onCancelService(initialDataService.id, cancellationReason);
    }
    setIsCancelAlertOpen(false);
    onClose();
  }, [onDelete, onCancelService, mode, initialDataQuote, initialDataService, cancellationReason, toast, onClose]);

  const availableTabs = [
    { value: 'servicio', label: 'Detalles', icon: Wrench, condition: true },
    { value: 'recepcion', label: 'Rec. y Ent.', icon: CheckCircle, condition: showReceptionTab },
    { value: 'reporte', label: 'Fotos', icon: Camera, condition: showReportTab },
    { value: 'seguridad', label: 'Revisión', icon: ShieldCheck, condition: showChecklistTab },
  ].filter(tab => tab.condition);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 pb-24">
          <Tabs defaultValue="servicio" className="w-full">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-6 px-6 pt-2">
                <div className="flex justify-between items-center mb-2">
                    <TabsList className={cn("grid w-full mb-0", `grid-cols-${availableTabs.length}`)}>
                        {availableTabs.map(tab => (
                            <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                                <tab.icon className="h-4 w-4 mr-1.5 shrink-0"/>
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className="sm:hidden">{tab.label.substring(0,5)}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <div className="ml-2">
                        {!isReadOnly && (
                            <Button type="button" onClick={handlePrintSheet} variant="ghost" size="icon" title="Vista Previa">
                                <Eye className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <TabsContent value="servicio" className="mt-4">
               <Card className="shadow-none border-none p-0">
                  <CardContent className="p-0">
                    <div className="space-y-6">
                        <VehicleSelectionCard isReadOnly={isReadOnly} localVehicles={localVehicles} serviceHistory={serviceHistory} onVehicleSelected={() => {}} onOpenNewVehicleDialog={() => { setNewVehicleInitialData({ licensePlate: getValues('vehicleLicensePlateSearch') || "" }); setIsVehicleDialogOpen(true); }}/>
                        <ServiceDetailsCard
                        isReadOnly={isReadOnly}
                        technicians={technicians}
                        inventoryItems={currentInventoryItems}
                        serviceTypes={serviceTypes}
                        mode={mode}
                        totalCost={totalCost}
                        totalSuppliesWorkshopCost={totalSuppliesWorkshopCost}
                        serviceProfit={serviceProfit}
                        onGenerateQuoteWithAI={handleGenerateQuoteWithAI}
                        isGeneratingQuote={isGeneratingQuote}
                        />
                    </div>
                  </CardContent>
               </Card>
            </TabsContent>
            
            <TabsContent value="recepcion" className="mt-4">
               <Card className="shadow-none border-none p-0">
                 <CardContent className="p-0">
                    <ReceptionAndDelivery isReadOnly={isReadOnly} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText} />
                 </CardContent>
               </Card>
            </TabsContent>
            
            <TabsContent value="reporte" className="mt-4">
              <Card className="shadow-none border-none p-0">
                 <CardContent className="p-0">
                    {/* Photo Report Content */}
                 </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="seguridad" className="mt-4">
               <Card className="shadow-none border-none p-0">
                 <CardContent className="p-0">
                    <SafetyChecklist control={control} isReadOnly={isReadOnly} onSignatureClick={() => setIsTechSignatureDialogOpen(true)} signatureDataUrl={form.watch('safetyInspection.technicianSignature')} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText} serviceId={watchedId || ''} onPhotoUploaded={handleChecklistPhotoUpload} onViewImage={handleViewImage}/>
                 </CardContent>
               </Card>
            </TabsContent>
          </Tabs>
        
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 border-t p-3 md:pl-[var(--sidebar-width)] print:hidden">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    {!isReadOnly && initialData?.id ? (
                        <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive">
                                    <Ban className="mr-2 h-4 w-4" />
                                    {mode === 'quote' ? 'Eliminar Cotización' : 'Cancelar Servicio'}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {mode === 'quote' ? `Se eliminará la cotización ${initialDataQuote?.id}.` : `Se cancelará el servicio ${initialDataService?.id}.`}
                                    </AlertDialogDescription>
                                    {mode === 'service' && (
                                        <div className="mt-4">
                                            <Label htmlFor="cancellation-reason">Motivo (obligatorio)</Label>
                                            <Textarea id="cancellation-reason" value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} className="mt-2" />
                                        </div>
                                    )}
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setCancellationReason('')}>Volver</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleConfirmDelete} disabled={mode === 'service' && !cancellationReason.trim()} className="bg-destructive hover:bg-destructive/90">Sí, proceder</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    ) : ( <div></div> )}
                    <div className="flex justify-end gap-2">
                        {isReadOnly ? (
                            <Button type="button" variant="outline" onClick={onClose}>Cerrar</Button>
                        ) : (
                            <>
                                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting || !getValues('vehicleId')}>
                                    {form.formState.isSubmitting ? "Guardando..." : (initialData?.id ? "Actualizar" : "Crear")}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </form>
      </Form>
      <SignatureDialog open={isTechSignatureDialogOpen} onOpenChange={setIsTechSignatureDialogOpen} onSave={(s) => { form.setValue('safetyInspection.technicianSignature', s, { shouldDirty: true }); setIsTechSignatureDialogOpen(false); toast({ title: 'Firma Capturada' }); }}/>
      
      {isPreviewOpen && serviceForPreview && (
        <UnifiedPreviewDialog 
          open={isPreviewOpen} 
          onOpenChange={setIsPreviewOpen} 
          service={serviceForPreview} 
          vehicle={localVehicles.find(v => v.id === serviceForPreview.vehicleId) || null}
          associatedQuote={null} // Pass the associated quote if available
        />
      )}
      <VehicleDialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen} onSave={handleSaveNewVehicle} vehicle={newVehicleInitialData}/>
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl p-2">
            <DialogHeader className="print:hidden">
              <DialogTitle>Vista Previa de Imagen</DialogTitle>
              <DialogDescription>
                Visualizando la imagen de evidencia. Puede descargarla si lo necesita.
              </DialogDescription>
            </DialogHeader>
            <div className="relative aspect-video w-full">
                {viewingImageUrl && (
                    <Image src={viewingImageUrl} alt="Vista ampliada de evidencia" layout="fill" objectFit="contain" crossOrigin="anonymous" />
                )}
            </div>
            <DialogFooter className="mt-2 print:hidden">
                <Button onClick={handleDownloadImage}>
                    <Download className="mr-2 h-4 w-4"/>Descargar Imagen
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
