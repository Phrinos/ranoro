
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray, type Control, useWatch } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import { CalendarIcon, PlusCircle, Trash2, BrainCircuit, Loader2, Printer, Ban, ShieldQuestion, Wrench, Wallet, CreditCard, Send, WalletCards, ArrowRightLeft, ShieldCheck, Copy, Eye, Download, Camera, CheckCircle, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, setHours, setMinutes, isValid, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, ServiceSupply, QuoteRecord, InventoryCategory, Supplier, User, WorkshopInfo, ServiceItem, SafetyInspection, PaymentMethod, SafetyCheckStatus, PhotoReportGroup, SafetyCheckValue } from "@/types";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { VehicleDialog } from "../../vehiculos/components/vehicle-dialog";
import type { VehicleFormValues } from "../../vehiculos/components/vehicle-form";
import { 
    placeholderVehicles as defaultPlaceholderVehicles, 
    placeholderInventory, 
    placeholderServiceRecords as defaultServiceRecords, 
    persistToFirestore, 
    AUTH_USER_LOCALSTORAGE_KEY,
} from '@/lib/placeholder-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { suggestQuote } from '@/ai/flows/quote-suggestion-flow';
import { enhanceText } from '@/ai/flows/text-enhancement-flow';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebaseClient.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignatureDialog } from './signature-dialog';
import { formatCurrency, capitalizeSentences } from '@/lib/utils';
import { savePublicDocument } from "@/lib/public-document";
import { PhotoUploader } from "./PhotoUploader";
import { ServiceItemCard } from './ServiceItemCard';
import { SafetyChecklist } from './SafetyChecklist';
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";
import { VehicleSelectionCard } from './VehicleSelectionCard';
import { ReceptionAndDelivery } from './ReceptionAndDelivery';

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

const paymentMethods: [PaymentMethod, ...PaymentMethod[]] = [
  "Efectivo",
  "Tarjeta",
  "Transferencia",
  "Efectivo+Transferencia",
  "Tarjeta+Transferencia"
];

const serviceFormSchemaBase = z.object({
  id: z.string().optional(), 
  publicId: z.string().optional(),
  vehicleId: z.string({required_error: "Debe seleccionar o registrar un vehículo."}).min(1, "Debe seleccionar o registrar un vehículo.").optional(),
  vehicleLicensePlateSearch: z.string().optional(),
  serviceDate: z.date().optional(),
  quoteDate: z.date().optional(), 
  mileage: z.coerce.number({ invalid_type_error: "El kilometraje debe ser numérico." }).int("El kilometraje debe ser un número entero.").min(0, "El kilometraje no puede ser negativo.").optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  technicianId: z.string().optional(),
  serviceItems: z.array(serviceItemSchema).min(1, "Debe agregar al menos un ítem de servicio."),
  status: z.enum(["Cotizacion", "Agendado", "En Espera de Refacciones", "Reparando", "Completado", "Entregado", "Cancelado"]).optional(),
  serviceType: z.enum(["Servicio General", "Cambio de Aceite", "Pintura"]).optional(),
  deliveryDateTime: z.date({ invalid_type_error: "La fecha de entrega no es válida." }).optional(),
  vehicleConditions: z.string().optional(),
  fuelLevel: z.string().optional(),
  customerItems: z.string().optional(),
  customerSignatureReception: z.string().optional(),
  customerSignatureDelivery: z.string().optional(),
  safetyInspection: safetyInspectionSchema.optional(),
  paymentMethod: z.enum(paymentMethods).optional(),
  cardFolio: z.string().optional(),
  transferFolio: z.string().optional(),
  nextServiceInfo: z.object({
    date: z.string(),
    mileage: z.number().optional(),
  }).optional(),
  photoReports: z.array(photoReportGroupSchema).optional(),
  serviceAdvisorId: z.string().optional(),
  serviceAdvisorName: z.string().optional(),
  serviceAdvisorSignatureDataUrl: z.string().optional(),
}).refine(data => {
    if (data.status && data.status !== 'Cotizacion' && !data.serviceDate) {
        return false;
    }
    return true;
}, {
    message: "La fecha programada no es válida.",
    path: ["serviceDate"],
}).refine(data => {
  if (data.status === 'Completado' && (data.paymentMethod === "Tarjeta" || data.paymentMethod === "Tarjeta+Transferencia") && !data.cardFolio) {
    return false;
  }
  return true;
}, {
  message: "El folio de la tarjeta es obligatorio para este método de pago.",
  path: ["cardFolio"],
}).refine(data => {
  if (data.status === 'Completado' && (data.paymentMethod === "Transferencia" || data.paymentMethod === "Efectivo+Transferencia" || data.paymentMethod === "Tarjeta+Transferencia") && !data.transferFolio) {
    return false;
  }
  return true;
}, {
  message: "El folio de la transferencia es obligatorio para este método de pago.",
  path: ["transferFolio"],
}).refine(data => {
    if ((data.status === 'Reparando' || data.status === 'En Espera de Refacciones') && !data.technicianId) {
        return false;
    }
    return true;
}, {
    message: "Debe asignar un técnico cuando el servicio está en reparación.",
    path: ["technicianId"],
});


export type ServiceFormValues = z.infer<typeof serviceFormSchemaBase>;

interface ServiceFormProps {
  initialDataService?: ServiceRecord | null;
  initialDataQuote?: Partial<QuoteRecord> | null;
  vehicles: Vehicle[];
  technicians: Technician[];
  inventoryItems: InventoryItem[]; 
  onSubmit: (data: ServiceRecord | QuoteRecord) => Promise<void>;
  onClose: () => void;
  isReadOnly?: boolean;
  onVehicleCreated?: (newVehicle: Vehicle) => void; 
  mode?: 'service' | 'quote';
  onDelete?: (id: string) => void;
  onCancelService?: (serviceId: string, reason: string) => void;
  onViewQuoteRequest?: (serviceId: string) => void;
}

const IVA_RATE = 0.16;

const generateUniqueId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 9)).toUpperCase();

export function ServiceForm({
  initialDataService,
  initialDataQuote,
  vehicles: parentVehicles,
  technicians,
  inventoryItems: inventoryItemsProp,
  onSubmit,
  onClose,
  isReadOnly = false,
  onVehicleCreated,
  mode = 'service',
  onDelete,
  onCancelService,
}: ServiceFormProps) {
  const { toast } = useToast();
  
  const initialData = mode === 'service' ? initialDataService : initialDataQuote;
  
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
  const [isServiceDatePickerOpen, setIsServiceDatePickerOpen] = useState(false);
  const [isDeliveryDatePickerOpen, setIsDeliveryDatePickerOpen] = useState(false);
  const [isTechSignatureDialogOpen, setIsTechSignatureDialogOpen] = useState(false);
  const [isCustomerSignatureDialogOpen, setIsCustomerSignatureDialogOpen] = useState(false);
  const [customerSignatureType, setCustomerSignatureType] = useState<'reception' | 'delivery'>('reception');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  
  const freshUserRef = useRef<User | null>(null);
  const originalStatusRef = useRef(initialDataService?.status || initialDataQuote?.status);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchemaBase),
    defaultValues: {
        id: initialData?.id || undefined,
        status: mode === 'service' ? ((initialData as ServiceRecord)?.status || 'Agendado') : 'Cotizacion',
        serviceItems: [],
        photoReports: [],
    }
  });
  const { control, getValues, setValue } = form;

  const stableServiceId = useMemo(() => initialData?.id || getValues('id') || `SRV_${generateUniqueId()}`, [initialData?.id, getValues]);

  const { fields: serviceItemsFields, append: appendServiceItem, remove: removeServiceItem } = useFieldArray({ control, name: "serviceItems" });
  const { fields: photoReportFields, append: appendPhotoReport, remove: removePhotoReport } = useFieldArray({ control, name: "photoReports" });
  
  const watchedStatus = useWatch({ control, name: 'status' });
  const watchedServiceItems = useWatch({ control, name: "serviceItems" });

  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useMemo(() => {
    let calculatedTotalCost = 0;
    let workshopCost = 0;
    for (const item of watchedServiceItems) {
        calculatedTotalCost += Number(item.price) || 0;
        if (item.suppliesUsed) {
            for (const supply of item.suppliesUsed) {
                const costPerUnit = supply.unitPrice ?? 0;
                workshopCost += (costPerUnit * supply.quantity);
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
  const showReportTab = useMemo(() => mode === 'service' && watchedStatus !== 'Agendado' && watchedStatus !== 'Cotizacion', [mode, watchedStatus]);

  useEffect(() => { setLocalVehicles(parentVehicles); }, [parentVehicles]);
  useEffect(() => { setCurrentInventoryItems(inventoryItemsProp); }, [inventoryItemsProp]);

  const refreshCurrentUser = useCallback(() => {
    const authUserString = typeof window !== "undefined" ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
    freshUserRef.current = authUserString ? JSON.parse(authUserString) : null;
  }, []);

  useEffect(() => {
    refreshCurrentUser();
    const storedWorkshopInfo = typeof window !== "undefined" ? localStorage.getItem("workshopTicketInfo") : null;
    if (storedWorkshopInfo) setWorkshopInfo(JSON.parse(storedWorkshopInfo));
    window.addEventListener('focus', refreshCurrentUser);
    return () => window.removeEventListener('focus', refreshCurrentUser);
  }, [refreshCurrentUser]);

  useEffect(() => {
    const data = mode === 'service' ? initialDataService : initialDataQuote;
    const currentUser = freshUserRef.current;
    
    if (data) {
        const parseDate = (date: any) => date && (typeof date.toDate === 'function' ? date.toDate() : (typeof date === 'string' ? parseISO(date) : date));
        
        let photoReportsData = (data as ServiceRecord)?.photoReports || [];
        if (!isReadOnly && (!photoReportsData || photoReportsData.length === 0)) {
            photoReportsData = [{ id: `rep_recepcion_${Date.now()}`, date: new Date().toISOString(), description: "Notas de la Recepción", photos: [] }];
        }
        
        form.reset({
            id: data.id, publicId: (data as any)?.publicId, vehicleId: data.vehicleId ? String(data.vehicleId) : undefined,
            vehicleLicensePlateSearch: data.vehicleIdentifier || "",
            serviceDate: isValid(parseDate(data.serviceDate)) ? parseDate(data.serviceDate) : undefined,
            quoteDate: isValid(parseDate(data.quoteDate)) ? parseDate(data.quoteDate) : undefined,
            deliveryDateTime: isValid(parseDate((data as ServiceRecord)?.deliveryDateTime)) ? parseDate((data as ServiceRecord)?.deliveryDateTime) : undefined,
            mileage: data.mileage || undefined, description: (data as any).description || "",
            notes: data.notes || "", technicianId: (data as ServiceRecord)?.technicianId || (data as QuoteRecord)?.preparedByTechnicianId || undefined,
            status: data.status || (mode === 'quote' ? 'Cotizacion' : 'Agendado'),
            serviceType: (data as ServiceRecord)?.serviceType || (data as QuoteRecord)?.serviceType || 'Servicio General',
            vehicleConditions: (data as ServiceRecord)?.vehicleConditions || "", fuelLevel: (data as ServiceRecord)?.fuelLevel || undefined,
            customerItems: (data as ServiceRecord)?.customerItems || '',
            customerSignatureReception: (data as ServiceRecord)?.customerSignatureReception || undefined,
            customerSignatureDelivery: (data as ServiceRecord)?.customerSignatureDelivery || undefined,
            serviceItems: ('serviceItems' in data && Array.isArray(data.serviceItems)) ? data.serviceItems.map(item => ({ ...item, price: item.price ?? 0, suppliesUsed: item.suppliesUsed || [] })) : [],
            safetyInspection: data.safetyInspection || {}, paymentMethod: (data as ServiceRecord)?.paymentMethod || 'Efectivo',
            cardFolio: (data as ServiceRecord)?.cardFolio || '', transferFolio: (initialData as ServiceRecord)?.transferFolio || '',
            nextServiceInfo: (data as ServiceRecord)?.nextServiceInfo, photoReports: photoReportsData,
            serviceAdvisorId: data.serviceAdvisorId || currentUser?.id || '',
            serviceAdvisorName: data.serviceAdvisorName || currentUser?.name || '',
            serviceAdvisorSignatureDataUrl: data.serviceAdvisorSignatureDataUrl || currentUser?.signatureDataUrl || '',
        });
    } else {
      form.reset({
          id: stableServiceId,
          serviceAdvisorId: currentUser?.id || '', serviceAdvisorName: currentUser?.name || '', serviceAdvisorSignatureDataUrl: currentUser?.signatureDataUrl || '',
          status: mode === 'quote' ? 'Cotizacion' : 'Agendado',
          quoteDate: mode === 'quote' ? new Date() : undefined,
          serviceDate: mode === 'service' ? setHours(setMinutes(new Date(), 30), 8) : undefined,
          serviceItems: [{ id: `item_${Date.now()}`, name: '', price: undefined, suppliesUsed: [] }],
          photoReports: [{ id: `rep_recepcion_${Date.now()}`, date: new Date().toISOString(), description: "Notas de la Recepción", photos: [] }],
      });
    }
  }, [initialDataService, initialDataQuote, mode, form, isReadOnly, stableServiceId]);
  
  const handlePhotoUploadComplete = useCallback((reportIndex: number, urls: string[]) => {
    const currentPhotos = getValues(`photoReports.${reportIndex}.photos`) || [];
    setValue(`photoReports.${reportIndex}.photos`, [...currentPhotos, ...urls], { shouldDirty: true });
  }, [getValues, setValue]);

  const handleChecklistPhotoUpload = useCallback((itemName: string, urls: string[]) => {
    const path = `safetyInspection.${itemName}` as const;
    const currentItemValue = getValues(path) || { status: 'na', photos: [] };
    const updatedPhotos = [...(currentItemValue.photos || []), ...urls];
    setValue(path, { ...currentItemValue, photos: updatedPhotos }, { shouldDirty: true });
  }, [getValues, setValue]);

  const handleViewImage = (url: string) => { setViewingImageUrl(url); setIsImageViewerOpen(true); };

  const handleSaveNewVehicle = useCallback(async (vehicleData: VehicleFormValues) => {
    const newVehicle: Vehicle = {
      id: generateUniqueId(),
      ...vehicleData,
      year: Number(vehicleData.year),
    };
    defaultPlaceholderVehicles.push(newVehicle);
    await persistToFirestore(['vehicles']);
    setLocalVehicles(prev => [...prev, newVehicle]);
    setValue('vehicleId', String(newVehicle.id), { shouldValidate: true });
    setValue('vehicleLicensePlateSearch', newVehicle.licensePlate);
    setIsVehicleDialogOpen(false);
    toast({ title: "Vehículo Registrado", description: `Se registró ${newVehicle.make} ${newVehicle.model} (${newVehicle.licensePlate}).`});
    onVehicleCreated?.(newVehicle);
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
    if (!await form.trigger()) return toast({ title: "Formulario Incompleto", variant: "destructive" });

    const isNowCompleted = values.status === 'Completado';
    const wasPreviouslyCompleted = originalStatusRef.current === 'Completado';
    if (isNowCompleted && !wasPreviouslyCompleted) {
        let inventoryWasUpdated = false;
        values.serviceItems.forEach(item => {
          (item.suppliesUsed || []).forEach(supply => {
            const idx = placeholderInventory.findIndex(i => i.id === supply.supplyId);
            if (idx !== -1 && !placeholderInventory[idx].isService) {
              placeholderInventory[idx].quantity -= supply.quantity;
              inventoryWasUpdated = true;
            }
          });
        });
        if (inventoryWasUpdated) await persistToFirestore(['inventory']);
    }

    const dataToSave: ServiceRecord = {
        ...values,
        id: values.id || generateUniqueId(),
        publicId: values.publicId || `s_${generateUniqueId().toLowerCase()}`,
        vehicleId: getValues('vehicleId')!,
        description: values.serviceItems.map(item => item.name).join(', ') || 'Servicio',
        technicianId: values.technicianId || '',
        status: values.status || 'Agendado',
        totalCost, totalSuppliesCost, serviceProfit,
        serviceDate: values.serviceDate ? values.serviceDate.toISOString() : new Date().toISOString(),
        quoteDate: values.quoteDate?.toISOString(), deliveryDateTime: values.deliveryDateTime?.toISOString(),
        vehicleIdentifier: getValues('vehicleLicensePlateSearch') || 'N/A',
        technicianName: technicians.find(t => t.id === values.technicianId)?.name || 'N/A',
        subTotal: totalCost / (1 + IVA_RATE), taxAmount: totalCost - (totalCost / (1 + IVA_RATE)),
        serviceAdvisorId: freshUserRef.current.id,
        serviceAdvisorName: freshUserRef.current.name,
        serviceAdvisorSignatureDataUrl: freshUserRef.current.signatureDataUrl,
        workshopInfo: (workshopInfo && Object.keys(workshopInfo).length > 0) ? workshopInfo as WorkshopInfo : undefined,
    };

    if (values.status === 'Completado') {
        const deliveryDate = dataToSave.deliveryDateTime ? new Date(dataToSave.deliveryDateTime) : new Date();
        const oilSupply = values.serviceItems.flatMap(i => i.suppliesUsed).map(s => currentInventoryItems.find(item => item.id === s.supplyId)).find(item => item?.category?.toLowerCase().includes('aceite'));
        if (oilSupply?.rendimiento) {
            dataToSave.nextServiceInfo = { date: addDays(deliveryDate, 183).toISOString(), mileage: (values.mileage || 0) + oilSupply.rendimiento };
        } else {
            dataToSave.nextServiceInfo = { date: addDays(deliveryDate, 183).toISOString() };
        }
    }
    
    await savePublicDocument('service', dataToSave, localVehicles.find(v => v.id === getValues('vehicleId')) || null, workshopInfo);
    await onSubmit(dataToSave);
    toast({ title: `${!initialData?.id ? 'Creado' : 'Actualizado'} con Éxito` });
    onClose();
  }, [isReadOnly, onClose, getValues, onSubmit, toast, technicians, totalCost, totalSuppliesWorkshopCost, serviceProfit, workshopInfo, initialData, localVehicles, currentInventoryItems]);

  const handlePrintSheet = useCallback(() => {
    const serviceData = form.getValues() as ServiceRecord;
    setServiceForPreview({ ...serviceData, serviceAdvisorName: form.getValues('serviceAdvisorName'), serviceAdvisorSignatureDataUrl: form.getValues('serviceAdvisorSignatureDataUrl') });
    setIsPreviewOpen(true);
  }, [form]);

  const handleGenerateQuoteWithAI = useCallback(async () => {
    setIsGeneratingQuote(true);
    const vehicleId = getValues('vehicleId');
    const vehicle = localVehicles.find(v => v.id === vehicleId);
    const description = form.getValues('description');
    if (!vehicle || !description) {
        toast({ title: "Faltan Datos", variant: "destructive" });
        setIsGeneratingQuote(false);
        return;
    }
    try {
        const history = defaultServiceRecords.map(h => ({ description: h.description, suppliesUsed: ('serviceItems' in h ? h.serviceItems.flatMap(i => i.suppliesUsed) : []).map(s => ({ supplyName: s.supplyName || 'Unknown', quantity: s.quantity })), totalCost: h.totalCost || 0 }));
        const inventoryForAI = currentInventoryItems.map(i => ({ id: i.id, name: i.name, sellingPrice: i.sellingPrice }));
        const result = await suggestQuote({ vehicleInfo: { make: vehicle.make, model: vehicle.model, year: vehicle.year }, serviceDescription: description, serviceHistory: history, inventory: inventoryForAI });
        appendServiceItem({ id: `item_ai_${Date.now()}`, name: description, price: result.estimatedTotalCost, suppliesUsed: result.suppliesProposed.map(supply => ({ supplyId: supply.supplyId, quantity: supply.quantity, supplyName: currentInventoryItems.find(i => i.id === supply.supplyId)?.name || 'N/A', unitPrice: currentInventoryItems.find(i => i.id === supply.supplyId)?.sellingPrice || 0, isService: currentInventoryItems.find(i => i.id === supply.supplyId)?.isService || false, unitType: currentInventoryItems.find(i => i.id === supply.supplyId)?.unitType || 'units' })) });
        toast({ title: "Cotización Generada por IA", description: result.reasoning, duration: 10000 });
    } catch (e) {
        toast({ title: "Error de IA", variant: "destructive" });
    } finally {
        setIsGeneratingQuote(false);
    }
  }, [getValues, localVehicles, currentInventoryItems, toast, appendServiceItem]);
  
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
  
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-6 px-6 pt-2">
            <div className="flex justify-between items-center gap-2 mb-2 border-b">
              <Tabs defaultValue="servicio" className="w-full">
                <TabsList className="bg-transparent p-0 w-max -mb-px">
                  <TabsTrigger value="servicio" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-3 px-3 sm:px-4"><Wrench className="h-4 w-4 shrink-0"/> Detalles</TabsTrigger>
                  {showReceptionTab && (<TabsTrigger value="recepcion" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-3 px-3 sm:px-4"><FileCheck className="h-4 w-4 shrink-0"/> Rec. y Ent.</TabsTrigger>)}
                  {showReportTab && (<TabsTrigger value="reporte" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-3 px-3 sm:px-4"><Camera className="h-4 w-4 shrink-0"/> Fotos</TabsTrigger>)}
                  {showReceptionTab && (<TabsTrigger value="seguridad" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-3 px-3 sm:px-4"><ShieldCheck className="h-4 w-4 shrink-0"/> Revisión</TabsTrigger>)}
                </TabsList>
              </Tabs>
              {!isReadOnly && <Button type="button" onClick={handlePrintSheet} variant="ghost" size="icon" title="Vista Previa"><Eye className="h-5 w-5" /></Button>}
            </div>
          </div>
          
          <div className="space-y-6 mt-4">
              <VehicleSelectionCard isReadOnly={isReadOnly} localVehicles={localVehicles} onVehicleSelected={() => {}} onOpenNewVehicleDialog={() => { setNewVehicleInitialData({ licensePlate: getValues('vehicleLicensePlateSearch') || "" }); setIsVehicleDialogOpen(true); }}/>
              <Card><CardHeader><CardTitle className="text-lg">Información del Documento</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <FormField control={control} name="status" render={({ field }) => ( <FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly || watchedStatus === 'Completado' || watchedStatus === 'Entregado'}><FormControl><SelectTrigger className="font-bold"><SelectValue placeholder="Seleccione un estado" /></SelectTrigger></FormControl><SelectContent>{["Cotizacion", "Agendado", "En Espera de Refacciones", "Reparando", "Completado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                      <FormField control={control} name="serviceType" render={({ field }) => ( <FormItem><FormLabel>Tipo de Servicio</FormLabel><Select onValueChange={field.onChange} value={field.value || 'Servicio General'} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Servicio General">Servicio General</SelectItem><SelectItem value="Cambio de Aceite">Cambio de Aceite</SelectItem><SelectItem value="Pintura">Pintura</SelectItem></SelectContent></Select></FormItem> )}/>
                    </div>
                    {watchedStatus === 'Agendado' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t items-end"><Controller name="serviceDate" control={control} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Fecha de Cita</FormLabel><Popover open={isServiceDatePickerOpen} onOpenChange={setIsServiceDatePickerOpen}><PopoverTrigger asChild disabled={isReadOnly}><Button variant="outline" className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date ? setMinutes(setHours(date, (field.value || new Date()).getHours()), (field.value || new Date()).getMinutes()) : new Date()); setIsServiceDatePickerOpen(false); }} disabled={isReadOnly} initialFocus locale={es}/></PopoverContent></Popover></FormItem> )}/><Controller name="serviceDate" control={control} render={({ field }) => ( <FormItem><FormLabel>Hora de Cita</FormLabel><FormControl><Input type="time" value={field.value && isValid(field.value) ? format(field.value, 'HH:mm') : ""} onChange={(e) => { if (!e.target.value) return; const [h, m] = e.target.value.split(':').map(Number); field.onChange(setMinutes(setHours(field.value || new Date(), h), m)); }} disabled={isReadOnly}/></FormControl></FormItem> )}/></div>)}
                </CardContent>
              </Card>
              <Card><CardHeader><CardTitle className="text-lg">Trabajos a Realizar</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {serviceItemsFields.map((field, index) => <ServiceItemCard key={field.id} serviceIndex={index} control={control} removeServiceItem={removeServiceItem} isReadOnly={isReadOnly} inventoryItems={currentInventoryItems} mode={mode} />)}
                    {!isReadOnly && (<Button type="button" variant="outline" onClick={() => appendServiceItem({ id: `item_${Date.now()}`, name: '', price: undefined, suppliesUsed: [] })}><PlusCircle className="mr-2 h-4 w-4"/> Añadir Trabajo</Button>)}
                    {mode === 'quote' && !isReadOnly && (<Button type="button" variant="secondary" onClick={handleGenerateQuoteWithAI} disabled={isGeneratingQuote}>{isGeneratingQuote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}Sugerir Cotización con IA</Button>)}
                </CardContent>
              </Card>
              <ReceptionAndDelivery isReadOnly={isReadOnly} onCustomerSignatureClick={(type) => { setCustomerSignatureType(type); setIsCustomerSignatureDialogOpen(true); }} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText} />
              <SafetyChecklist control={control} isReadOnly={isReadOnly} onSignatureClick={() => setIsTechSignatureDialogOpen(true)} signatureDataUrl={form.watch('safetyInspection.technicianSignature')} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText} serviceId={stableServiceId} onPhotoUploaded={handleChecklistPhotoUpload} onViewImage={handleViewImage}/>
              <Card><CardHeader><CardTitle className="text-lg">Costo del Servicio</CardTitle></CardHeader><CardContent><div className="space-y-1 text-sm"><div className="flex justify-between font-bold text-lg text-primary"><span>Total (IVA Inc.):</span><span>{formatCurrency(totalCost)}</span></div><div className="flex justify-between text-xs"><span>(-) Costo Insumos:</span><span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(totalSuppliesWorkshopCost)}</span></div><hr className="my-1 border-dashed"/><div className="flex justify-between font-bold text-green-700 dark:text-green-400"><span>(=) Ganancia:</span><span>{formatCurrency(serviceProfit)}</span></div></div></CardContent></Card>
          </div>
          <div className="flex justify-between items-center pt-4">
            {!isReadOnly && initialData?.id && (<AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}><AlertDialogTrigger asChild><Button type="button" variant="destructive"><Ban className="mr-2 h-4 w-4" />{mode === 'quote' ? 'Eliminar Cotización' : 'Cancelar Servicio'}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Está seguro?</AlertDialogTitle><AlertDialogDescription>{mode === 'quote' ? `Se eliminará la cotización ${initialDataQuote?.id}.` : `Se cancelará el servicio ${initialDataService?.id}.`}</AlertDialogDescription>{mode === 'service' && (<div className="mt-4"><Label htmlFor="cancellation-reason">Motivo (obligatorio)</Label><Textarea id="cancellation-reason" value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} className="mt-2" /></div>)}</AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setCancellationReason('')}>Volver</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} disabled={mode === 'service' && !cancellationReason.trim()} className="bg-destructive hover:bg-destructive/90">Sí, proceder</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
            <div className="flex justify-end gap-2 w-full">
              {isReadOnly ? <Button type="button" variant="outline" onClick={onClose}>Cerrar</Button> : (<><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={form.formState.isSubmitting || !getValues('vehicleId')}>{form.formState.isSubmitting ? "Guardando..." : (initialData?.id ? "Actualizar" : "Crear")}</Button></>)}
            </div>
          </div>
        </form>
      </Form>
      <SignatureDialog open={isTechSignatureDialogOpen} onOpenChange={setIsTechSignatureDialogOpen} onSave={(s) => { form.setValue('safetyInspection.technicianSignature', s, { shouldDirty: true }); setIsTechSignatureDialogOpen(false); toast({ title: 'Firma Capturada' }); }}/>
      <SignatureDialog open={isCustomerSignatureDialogOpen} onOpenChange={setIsCustomerSignatureDialogOpen} onSave={(s) => { form.setValue(customerSignatureType === 'reception' ? 'customerSignatureReception' : 'customerSignatureDelivery', s, { shouldDirty: true }); setIsCustomerSignatureDialogOpen(false); toast({ title: 'Firma de Cliente Capturada' }); }}/>
      {isPreviewOpen && serviceForPreview && (<UnifiedPreviewDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} service={serviceForPreview} />)}
      <VehicleDialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen} onSave={handleSaveNewVehicle} vehicle={newVehicleInitialData}/>
    </>
  );
}

