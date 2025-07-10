

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
import { CalendarIcon, PlusCircle, Search, Trash2, AlertCircle, Car as CarIcon, Clock, DollarSign, PackagePlus, BrainCircuit, Loader2, Printer, Plus, Minus, FileText, Signature, MessageSquare, Ban, ShieldQuestion, Wrench, Wallet, CreditCard, Send, WalletCards, ArrowRightLeft, Tag, FileCheck, Check, ShieldCheck, Copy, Camera, Eye, Download } from "lucide-react";
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
    placeholderCategories, 
    placeholderSuppliers, 
    placeholderServiceRecords as defaultServiceRecords, 
    persistToFirestore, 
    AUTH_USER_LOCALSTORAGE_KEY,
} from '@/lib/placeholder-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDesc, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InventoryItemDialog } from "../../inventario/components/inventory-item-dialog";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { suggestQuote, type QuoteSuggestionInput } from '@/ai/flows/quote-suggestion-flow';
import { enhanceText } from '@/ai/flows/text-enhancement-flow';
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebaseClient.js';
import { ref, getDownloadURL } from 'firebase/storage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignatureDialog } from './signature-dialog';
import { capitalizeWords, formatCurrency, capitalizeSentences, optimizeImage } from '@/lib/utils';
import { savePublicDocument } from "@/lib/public-document";
import { PhotoUploader } from "./PhotoUploader";
import { ServiceItemCard } from './ServiceItemCard';
import { SafetyChecklist } from './SafetyChecklist';
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";


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
  photos: z.array(z.string().url("URL de foto inválida.")).max(3, "No más de 3 fotos por reporte."),
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
  id: z.string().optional(), // For identifying existing records
  publicId: z.string().optional(),
  vehicleId: z.string({required_error: "Debe seleccionar o registrar un vehículo."}).min(1, "Debe seleccionar o registrar un vehículo.").optional(),
  vehicleLicensePlateSearch: z.string().optional(),
  serviceDate: z.date().optional(),
  quoteDate: z.date().optional(), // For quote mode
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
  inventoryItems: InventoryItem[]; // Prop for initial inventory items
  onSubmit: (data: ServiceRecord | QuoteRecord) => Promise<void>;
  onClose: () => void;
  isReadOnly?: boolean;
  onVehicleCreated?: (newVehicle: Vehicle) => void; 
  mode?: 'service' | 'quote';
  onInventoryItemCreatedFromService?: (newItem: InventoryItem) => void; // Optional: To notify parent of new items
  onDelete?: (id: string) => void;
  onCancelService?: (serviceId: string, reason: string) => void;
}

const IVA_RATE = 0.16;

const paymentMethodIcons: Record<PaymentMethod, React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Transferencia": Send,
  "Efectivo+Transferencia": WalletCards,
  "Tarjeta+Transferencia": ArrowRightLeft,
};

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
  onInventoryItemCreatedFromService,
  onDelete,
  onCancelService,
}: ServiceFormProps) {
  const { toast } = useToast();
  
  const initialData = mode === 'service' ? initialDataService : initialDataQuote;
  const initialVehicleIdentifier = initialData?.vehicleIdentifier;
  
  const [stableServiceId] = useState(
    initialData?.id || `TEMP_${generateUniqueId()}`
  );

  const [vehicleLicensePlateSearch, setVehicleLicensePlateSearch] = useState(initialVehicleIdentifier || "");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [lastService, setLastService] = useState<ServiceRecord | null>(null);
  const [vehicleNotFound, setVehicleNotFound] = useState(false);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>(parentVehicles);
  const [newVehicleInitialData, setNewVehicleInitialData] = useState<Partial<VehicleFormValues> | null>(null);
  const [vehicleSearchResults, setVehicleSearchResults] = useState<Vehicle[]>([]);

  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>(inventoryItemsProp);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | {}>({});

  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [serviceForPreview, setServiceForPreview] = useState<ServiceRecord | null>(null);
  
  const [isServiceDatePickerOpen, setIsServiceDatePickerOpen] = useState(false);
  const [isDeliveryDatePickerOpen, setIsDeliveryDatePickerOpen] = useState(false);
  
  const freshUserRef = useRef<User | null>(null);
  const [isTechSignatureDialogOpen, setIsTechSignatureDialogOpen] = useState(false);
  const [isEnhancingText, setIsEnhancingText] = useState<string | null>(null);
  
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchemaBase),
    // This defaultValues block will be overridden by useEffect, but it's good practice.
    defaultValues: {
        id: initialData?.id || undefined,
        publicId: (initialData as any)?.publicId,
        vehicleId: initialData?.vehicleId || undefined,
        vehicleLicensePlateSearch: initialVehicleIdentifier || "",
        serviceDate: undefined,
        quoteDate: undefined,
        mileage: initialData?.mileage || undefined,
        description: (initialData as any)?.description || "",
        notes: initialData?.notes || "",
        technicianId: (initialData as ServiceRecord)?.technicianId || (initialData as QuoteRecord)?.preparedByTechnicianId || "",
        serviceItems: [],
        status: mode === 'service' ? ((initialData as ServiceRecord)?.status || 'Agendado') : 'Cotizacion',
        serviceType: (initialData as ServiceRecord)?.serviceType || (initialData as QuoteRecord)?.serviceType || 'Servicio General',
        deliveryDateTime: undefined,
        vehicleConditions: (initialData as ServiceRecord)?.vehicleConditions || "",
        fuelLevel: (initialData as ServiceRecord)?.fuelLevel || undefined,
        customerItems: (initialData as ServiceRecord)?.customerItems || '',
        customerSignatureReception: (initialData as ServiceRecord)?.customerSignatureReception || undefined,
        customerSignatureDelivery: (initialData as ServiceRecord)?.customerSignatureDelivery || undefined,
        safetyInspection: (initialData as ServiceRecord)?.safetyInspection || {},
        paymentMethod: (initialData as ServiceRecord)?.paymentMethod || 'Efectivo',
        cardFolio: (initialData as ServiceRecord)?.cardFolio || '',
        transferFolio: (initialData as ServiceRecord)?.transferFolio || '',
        nextServiceInfo: (initialData as ServiceRecord)?.nextServiceInfo,
        photoReports: (initialData as ServiceRecord)?.photoReports || [],
        serviceAdvisorId: (initialData as ServiceRecord)?.serviceAdvisorId || '',
        serviceAdvisorName: (initialData as ServiceRecord)?.serviceAdvisorName || '',
        serviceAdvisorSignatureDataUrl: (initialData as ServiceRecord)?.serviceAdvisorSignatureDataUrl || '',
    }
  });
  
  const { control, getValues, setValue } = form;
  const originalStatusRef = useRef(initialDataService?.status || initialDataQuote?.status);
  const watchedStatus = useWatch({ control, name: 'status' });
  const selectedPaymentMethod = useWatch({ control, name: 'paymentMethod' });
  const customerSignatureReception = useWatch({ control, name: 'customerSignatureReception' });
  const customerSignatureDelivery = useWatch({ control, name: 'customerSignatureDelivery' });
  const technicianSignature = useWatch({ control, name: 'safetyInspection.technicianSignature' });

  const { fields: serviceItemsFields, append: appendServiceItem, remove: removeServiceItem, update: updateServiceItem } = useFieldArray({
    control: form.control,
    name: "serviceItems",
  });
  
  const { fields: photoReportFields, append: appendPhotoReport, remove: removePhotoReport, update: updatePhotoReport } = useFieldArray({
    control: form.control,
    name: "photoReports",
  });
  
  const handlePhotoUploadComplete = useCallback((reportIndex: number, downloadURL: string) => {
    const freshReportState = getValues(`photoReports.${reportIndex}`);
    updatePhotoReport(reportIndex, {
      ...freshReportState,
      photos: [...freshReportState.photos, downloadURL],
    });
  }, [getValues, updatePhotoReport]);
  
  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  const watchedServiceItems = useWatch({ control, name: "serviceItems" });

  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useMemo(() => {
    let calculatedTotalCost = 0;
    let workshopCost = 0;

    for (const item of watchedServiceItems) {
        calculatedTotalCost += Number(item.price) || 0;
        if (item.suppliesUsed) {
            for (const supply of item.suppliesUsed) {
                const inventoryItem = currentInventoryItems.find(i => i.id === supply.supplyId);
                const costPerUnit = inventoryItem?.unitPrice ?? supply.unitPrice ?? 0;
                workshopCost += (costPerUnit * supply.quantity);
            }
        }
    }
    const calculatedProfit = calculatedTotalCost - workshopCost;

    return {
      totalCost: calculatedTotalCost,
      totalSuppliesWorkshopCost: workshopCost,
      serviceProfit: calculatedProfit,
    };
}, [watchedServiceItems, currentInventoryItems]);


  const refreshCurrentUser = useCallback(() => {
    if (typeof window === "undefined") return;
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (authUserString) {
      try {
        freshUserRef.current = JSON.parse(authUserString);
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
        freshUserRef.current = null;
      }
    } else {
      freshUserRef.current = null;
    }
  }, []);

  // Effect to auto-populate dates when status changes
  useEffect(() => {
    const initialStatus = originalStatusRef.current;
    
    if (watchedStatus === 'Agendado' && initialStatus === 'Cotizacion') {
        if (!getValues('serviceDate')) {
            setValue('serviceDate', setHours(setMinutes(new Date(), 30), 8), { shouldDirty: true });
        }
    }
    
    if (watchedStatus === 'Completado' && initialStatus !== 'Completado') {
        if (!getValues('deliveryDateTime')) {
            setValue('deliveryDateTime', new Date(), { shouldDirty: true });
        }
    }

    if (watchedStatus === 'Cotizacion' && !getValues('quoteDate')) {
        setValue('quoteDate', new Date());
    }

  }, [watchedStatus, getValues, setValue]);

  useEffect(() => {
    refreshCurrentUser(); // Initial load
    window.addEventListener('focus', refreshCurrentUser);
    return () => {
      window.removeEventListener('focus', refreshCurrentUser);
    };
  }, [refreshCurrentUser]);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
        const storedWorkshopInfo = localStorage.getItem("workshopTicketInfo");
        if (storedWorkshopInfo) {
          setWorkshopInfo(JSON.parse(storedWorkshopInfo));
        }
    }
  }, []);

  // Main effect to set form values from initialData
  useEffect(() => {
    const data = mode === 'service' ? initialDataService : initialDataQuote;
    
    refreshCurrentUser();
    const currentUser = freshUserRef.current;
    
    if (data) {
        const vehicle = localVehicles.find(v => v.id === data.vehicleId);
        if (vehicle) {
            setSelectedVehicle(vehicle);
            setVehicleLicensePlateSearch(vehicle.licensePlate);
            const vehicleServices = defaultServiceRecords.filter(s => s.vehicleId === vehicle.id).sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
            if (vehicleServices.length > 0) setLastService(vehicleServices[0]); else setLastService(null);
        }
        
        let serviceItemsData: ServiceItem[] = ('serviceItems' in data && Array.isArray(data.serviceItems))
            ? data.serviceItems.map(item => ({
                ...item, price: item.price ?? 0,
                suppliesUsed: (item.suppliesUsed || []).map(supply => ({
                    ...supply,
                    unitPrice: supply.unitPrice ?? currentInventoryItems.find(i => i.id === supply.supplyId)?.unitPrice ?? 0,
                    sellingPrice: supply.sellingPrice ?? currentInventoryItems.find(i => i.id === supply.supplyId)?.sellingPrice ?? 0,
                }))
            }))
            : [];
        
        const parseDate = (date: any) => date && (typeof date.toDate === 'function' ? date.toDate() : (typeof date === 'string' ? parseISO(date) : date));
        const serviceDate = parseDate(data.serviceDate);
        const quoteDate = parseDate(data.quoteDate);
        const deliveryDateTime = parseDate((data as ServiceRecord)?.deliveryDateTime);

        const safetyInspectionData: any = {};
        if (data.safetyInspection) {
            for (const key in data.safetyInspection) {
                const value = (data.safetyInspection as any)[key];
                if (typeof value === 'string' && key !== 'inspectionNotes' && key !== 'technicianSignature') {
                    safetyInspectionData[key] = { status: value, photos: [] };
                } else {
                    safetyInspectionData[key] = value;
                }
            }
        }

        form.reset({
            id: data.id, publicId: (data as any)?.publicId, vehicleId: data.vehicleId ? String(data.vehicleId) : undefined,
            vehicleLicensePlateSearch: vehicle?.licensePlate || data.vehicleIdentifier || "",
            serviceDate: isValid(serviceDate) ? serviceDate : undefined,
            quoteDate: isValid(quoteDate) ? quoteDate : undefined,
            deliveryDateTime: isValid(deliveryDateTime) ? deliveryDateTime : undefined,
            mileage: data.mileage || undefined, description: (data as any).description || "",
            notes: data.notes || "", technicianId: (data as ServiceRecord)?.technicianId || (data as QuoteRecord)?.preparedByTechnicianId || undefined,
            status: data.status || (mode === 'quote' ? 'Cotizacion' : 'Agendado'),
            serviceType: (data as ServiceRecord)?.serviceType || (data as QuoteRecord)?.serviceType || 'Servicio General',
            vehicleConditions: (data as ServiceRecord)?.vehicleConditions || "", fuelLevel: (data as ServiceRecord)?.fuelLevel || undefined,
            customerItems: (data as ServiceRecord)?.customerItems || '',
            customerSignatureReception: (data as ServiceRecord)?.customerSignatureReception || undefined,
            customerSignatureDelivery: (data as ServiceRecord)?.customerSignatureDelivery || undefined,
            serviceItems: serviceItemsData, safetyInspection: safetyInspectionData, paymentMethod: (data as ServiceRecord)?.paymentMethod || 'Efectivo',
            cardFolio: (data as ServiceRecord)?.cardFolio || '', transferFolio: (initialData as ServiceRecord)?.transferFolio || '',
            nextServiceInfo: (data as ServiceRecord)?.nextServiceInfo, photoReports: (data as ServiceRecord)?.photoReports || [],
            serviceAdvisorId: data.serviceAdvisorId || currentUser?.id || '',
            serviceAdvisorName: data.serviceAdvisorName || currentUser?.name || '',
            serviceAdvisorSignatureDataUrl: data.serviceAdvisorSignatureDataUrl || currentUser?.signatureDataUrl || '',
        });

    } else { // New form
      form.reset({
          serviceAdvisorId: currentUser?.id || '', serviceAdvisorName: currentUser?.name || '', serviceAdvisorSignatureDataUrl: currentUser?.signatureDataUrl || '',
          status: mode === 'quote' ? 'Cotizacion' : 'Agendado',
          quoteDate: mode === 'quote' ? new Date() : undefined,
          serviceDate: mode === 'service' ? setHours(setMinutes(new Date(), 30), 8) : undefined,
          serviceItems: [{ id: `item_${Date.now()}`, name: '', price: undefined, suppliesUsed: [] }],
          photoReports: [],
      });
    }
  }, [initialDataService, initialDataQuote, mode, localVehicles, currentInventoryItems, form, refreshCurrentUser]);
  
  // Effect to sync signatures from public doc
  useEffect(() => {
    const syncSignatures = async () => {
      const serviceData = mode === 'service' ? initialDataService : null;
      if (serviceData?.id && serviceData.publicId && db) {
        try {
          const publicDocRef = doc(db, 'publicServices', serviceData.publicId);
          const docSnap = await getDoc(publicDocRef);
          if (docSnap.exists()) {
            const publicData = docSnap.data() as ServiceRecord;
            let changed = false;

            if (publicData.customerSignatureReception && form.getValues('customerSignatureReception') !== publicData.customerSignatureReception) {
              form.setValue('customerSignatureReception', publicData.customerSignatureReception);
              changed = true;
            }
            if (publicData.customerSignatureDelivery && form.getValues('customerSignatureDelivery') !== publicData.customerSignatureDelivery) {
              form.setValue('customerSignatureDelivery', publicData.customerSignatureDelivery);
              changed = true;
            }

            if (changed) {
              const serviceIndex = defaultServiceRecords.findIndex(s => s.id === serviceData.id);
              if (serviceIndex > -1) {
                if(publicData.customerSignatureReception) defaultServiceRecords[serviceIndex].customerSignatureReception = publicData.customerSignatureReception;
                if(publicData.customerSignatureDelivery) defaultServiceRecords[serviceIndex].customerSignatureDelivery = publicData.customerSignatureDelivery;
                await persistToFirestore(['serviceRecords']);
              }
              toast({ title: 'Firma Sincronizada', description: 'Se cargó una nueva firma de cliente.' });
            }
          }
        } catch (e) {
          console.error("Failed to sync signatures from public doc:", e);
        }
      }
    };
    syncSignatures();
  }, [initialDataService, mode, form, toast]);


  useEffect(() => {
    setLocalVehicles(parentVehicles);
  }, [parentVehicles]);

  useEffect(() => {
    setCurrentInventoryItems(inventoryItemsProp);
  }, [inventoryItemsProp]);

  const showReceptionTab = useMemo(() => {
    if (mode !== 'service') return false;
    if (!watchedStatus || watchedStatus === 'Cotizacion' || watchedStatus === 'Agendado') {
        return false;
    }
    return true;
  }, [mode, watchedStatus]);
  
  const showReportTab = useMemo(() => {
    if (mode !== 'service') return false;
    const currentServiceType = form.getValues('serviceType');
    if (!currentServiceType || (currentServiceType !== 'Servicio General' && currentServiceType !== 'Pintura' && currentServiceType !== 'Cambio de Aceite')) {
        return false;
    }
    return watchedStatus !== 'Agendado' && watchedStatus !== 'Cotizacion';
}, [mode, watchedStatus, form]);


  const handleSearchVehicle = () => {
    if (!vehicleLicensePlateSearch.trim()) {
      toast({ title: "Ingrese Placa", description: "Por favor ingrese una placa para buscar.", variant: "destructive" });
      return;
    }
    const found = localVehicles.find(v => v.licensePlate.toLowerCase() === vehicleLicensePlateSearch.trim().toLowerCase());
    if (found) {
        handleSelectVehicleFromSearch(found);
        toast({ title: "Vehículo Encontrado", description: `${found.make} ${found.model} ${found.year}`});
    } else {
      setSelectedVehicle(null);
      form.setValue('vehicleId', undefined);
      setVehicleNotFound(true);
      setLastService(null);
      toast({ title: "Vehículo No Encontrado", description: "Puede registrarlo si es nuevo.", variant: "default"});
    }
  };

  const handleSaveNewVehicle = async (vehicleData: VehicleFormValues) => {
    const newVehicle: Vehicle = {
      id: generateUniqueId(),
      ...vehicleData,
      year: Number(vehicleData.year),
    };

    defaultPlaceholderVehicles.push(newVehicle);
    await persistToFirestore(['vehicles']);
    
    setLocalVehicles(prev => [...prev, newVehicle]);

    setSelectedVehicle(newVehicle);
    form.setValue('vehicleId', String(newVehicle.id), { shouldValidate: true });
    setVehicleLicensePlateSearch(newVehicle.licensePlate);
    setVehicleNotFound(false);
    setIsVehicleDialogOpen(false);
    setLastService(null);
    toast({ title: "Vehículo Registrado", description: `Se registró ${newVehicle.make} ${newVehicle.model} (${newVehicle.licensePlate}).`});
    if (onVehicleCreated) {
        onVehicleCreated(newVehicle);
    }
  };

  const handleFormSubmit = async (values: ServiceFormValues) => {
    if (isReadOnly) {
        onClose();
        return;
    }
    
    const currentUser = freshUserRef.current;

    if (!currentUser) {
        toast({ title: "Error de Sesión", description: "No se pudo verificar su sesión. Por favor, inicie sesión de nuevo.", variant: "destructive" });
        return;
    }

    const vehicleIdToSave = selectedVehicle?.id;

    if (!vehicleIdToSave) {
        form.setError("vehicleLicensePlateSearch", { type: "manual", message: "Debe buscar y seleccionar un vehículo válido." });
        toast({
            title: "Vehículo no seleccionado",
            description: "Por favor, busque un vehículo por su placa y selecciónelo de la lista. El vehículo debe estar cargado y visible antes de guardar.",
            variant: "destructive"
        });
        return;
    }

    const isValidForm = await form.trigger();
    if (!isValidForm) {
        toast({
            title: "Formulario Incompleto",
            variant: "destructive",
        });
        return;
    }
    
    // Logic to deduct inventory when a service is completed
    const isNowCompleted = values.status === 'Completado';
    const wasPreviouslyCompleted = originalStatusRef.current === 'Completado';

    if (isNowCompleted && !wasPreviouslyCompleted) {
      let inventoryWasUpdated = false;
      (values.serviceItems || []).forEach(item => {
        (item.suppliesUsed || []).forEach(supply => {
          const inventoryItemIndex = placeholderInventory.findIndex(invItem => invItem.id === supply.supplyId);

          if (inventoryItemIndex !== -1 && !placeholderInventory[inventoryItemIndex].isService) { // Only deduct stock for non-service items
            const inventoryItem = placeholderInventory[inventoryItemIndex];
            const quantityToDeduct = supply.quantity || 0;

            if (inventoryItem.quantity < quantityToDeduct) {
              toast({
                title: "Stock insuficiente (Advertencia)",
                description: `Se descontaron ${quantityToDeduct} de "${inventoryItem.name}", pero solo había ${inventoryItem.quantity}. El stock es ahora negativo.`,
                variant: "destructive",
                duration: 8000,
              });
            }
            
            inventoryItem.quantity -= quantityToDeduct;
            inventoryWasUpdated = true;
          }
        });
      });

      if (inventoryWasUpdated) {
        await persistToFirestore(['inventory']);
        toast({
          title: "Inventario Actualizado",
          description: "El stock de los insumos ha sido descontado.",
        });
      }
    }
    
    const finalSubTotal = totalCost / (1 + IVA_RATE);
    const finalTaxAmount = totalCost - finalSubTotal;
    const finalProfit = totalCost - totalSuppliesWorkshopCost;
    const compositeDescription = values.serviceItems.map(item => item.name).join(', ') || 'Servicio';
    
    const isNew = !values.id;

    const dataToSave: ServiceRecord = {
        ...values,
        id: values.id || generateUniqueId(),
        publicId: values.publicId || `s_${generateUniqueId().toLowerCase()}`,
        vehicleId: vehicleIdToSave,
        description: compositeDescription,
        technicianId: values.technicianId || '',
        status: values.status || 'Agendado',
        totalCost: totalCost,
        serviceItems: values.serviceItems,
        serviceDate: values.serviceDate ? values.serviceDate.toISOString() : new Date().toISOString(),
        quoteDate: values.quoteDate ? values.quoteDate.toISOString() : undefined,
        deliveryDateTime: values.deliveryDateTime ? values.deliveryDateTime.toISOString() : undefined,
        vehicleIdentifier: selectedVehicle?.licensePlate || values.vehicleLicensePlateSearch || 'N/A',
        technicianName: technicians.find(t => t.id === values.technicianId)?.name || 'N/A',
        subTotal: finalSubTotal,
        taxAmount: finalTaxAmount,
        totalSuppliesCost: totalSuppliesWorkshopCost,
        serviceProfit: finalProfit,
        serviceAdvisorId: currentUser.id,
        serviceAdvisorName: currentUser.name,
        serviceAdvisorSignatureDataUrl: currentUser.signatureDataUrl,
        workshopInfo: (workshopInfo && Object.keys(workshopInfo).length > 0) ? workshopInfo as WorkshopInfo : undefined,
    };
      
    if (values.status === 'Completado') {
        try {
          const deliveryDate = dataToSave.deliveryDateTime ? new Date(dataToSave.deliveryDateTime) : new Date();
          if (isValid(deliveryDate)) {
            const nextServiceDate = addDays(deliveryDate, 183);
            let nextServiceMileage: number | undefined;
            const mileageValue = values.mileage;
            if (typeof mileageValue === 'number' && isFinite(mileageValue) && mileageValue > 0) {
              const oilSupplies = values.serviceItems.flatMap(item => item.suppliesUsed).map(supply => currentInventoryItems.find(i => i.id === supply.supplyId)).filter(Boolean);
              const rendimientos = oilSupplies.filter(item => item && item.category?.toLowerCase().includes('aceite') && typeof item.rendimiento === 'number' && item.rendimiento > 0).map(item => item!.rendimiento as number);
              if (rendimientos.length > 0) {
                const lowestRendimiento = Math.min(...rendimientos);
                if (isFinite(lowestRendimiento)) nextServiceMileage = mileageValue + lowestRendimiento;
              }
            }
            dataToSave.nextServiceInfo = { date: nextServiceDate.toISOString(), mileage: nextServiceMileage };
          }
        } catch (e) { console.error("Error calculating nextServiceInfo:", e); }
    }
    
    // Call public save before local persistence
    await savePublicDocument('service', dataToSave, selectedVehicle, workshopInfo);
    
    await onSubmit(dataToSave); // This handles the main local persistence and UI update
    
    toast({
      title: `${isNew ? 'Creado' : 'Actualizado'} con Éxito`,
      description: `El documento ${dataToSave.id} se ha guardado.`,
    });
    
    onClose();
  };
  
  const handlePrintSheet = useCallback(() => {
    const serviceData = form.getValues() as ServiceRecord;
    setServiceForPreview(serviceData);
    setIsSheetOpen(true);
  }, [form]);

  const handleVehiclePlateKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearchVehicle();
    }
  };

    const handleSelectVehicleFromSearch = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setVehicleLicensePlateSearch(vehicle.licensePlate);
        form.setValue('vehicleId', String(vehicle.id), { shouldValidate: true });
        if (vehicle.isFleetVehicle && vehicle.currentMileage) {
          form.setValue('mileage', vehicle.currentMileage, { shouldDirty: true });
        }
        setVehicleNotFound(false);
        setVehicleSearchResults([]);
        const vehicleServices = defaultServiceRecords.filter(s => s.vehicleId === vehicle.id).sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
        if (vehicleServices.length > 0) {
            setLastService(vehicleServices[0]);
        } else {
            setLastService(null);
        }
    };
    
    useEffect(() => {
        if (!vehicleLicensePlateSearch || vehicleLicensePlateSearch.length < 2) {
            setVehicleSearchResults([]);
            return;
        }
        if (selectedVehicle && selectedVehicle.licensePlate === vehicleLicensePlateSearch) {
             setVehicleSearchResults([]);
             return;
        }

        const lowerSearch = vehicleLicensePlateSearch.toLowerCase();
        const results = localVehicles.filter(v => 
            v.licensePlate.toLowerCase().includes(lowerSearch) ||
            v.make.toLowerCase().includes(lowerSearch) ||
            v.model.toLowerCase().includes(lowerSearch) ||
            v.ownerName.toLowerCase().includes(lowerSearch)
        ).slice(0, 5);
        setVehicleSearchResults(results);
    }, [vehicleLicensePlateSearch, localVehicles, selectedVehicle]);

  const handleEnhanceText = async (fieldName: 'notes' | 'vehicleConditions' | 'customerItems' | 'safetyInspection.inspectionNotes' | `photoReports.${number}.description`) => {
    const contextMap: Record<string, string> = {
      'notes': 'Notas Adicionales del Servicio',
      'vehicleConditions': 'Condiciones del Vehículo (al recibir)',
      'customerItems': 'Pertenencias del Cliente',
      'safetyInspection.inspectionNotes': 'Observaciones de la Inspección de Seguridad',
      'photoDescription': 'Descripción de Fotografía de Evidencia'
    };

    const contextKey = fieldName.startsWith('photoReports') ? 'photoDescription' : fieldName;
    const context = contextMap[contextKey];
    const currentValue = form.getValues(fieldName as any);

    if (!currentValue || currentValue.trim().length < 2) {
        toast({ title: 'No hay suficiente texto', description: 'Escriba algo antes de mejorar el texto.', variant: 'default' });
        return;
    }
    
    setIsEnhancingText(fieldName);
    try {
        const result = await enhanceText({ text: currentValue, context });
        form.setValue(fieldName as any, result, { shouldDirty: true });
        toast({ title: 'Texto Mejorado', description: 'La IA ha corregido y mejorado el texto.' });
    } catch (e) {
        console.error("Error enhancing text:", e);
        toast({ title: "Error de IA", description: "No se pudo mejorar el texto.", variant: "destructive" });
    } finally {
        setIsEnhancingText(null);
    }
  };
  
  const handleChecklistPhotoUpload = useCallback((itemName: string, url: string) => {
    const path = `safetyInspection.${itemName}` as const;
    const currentItemValue = getValues(path) || { status: 'na', photos: [] };
    const updatedPhotos = [...(currentItemValue.photos || []), url];

    setValue(path, { ...currentItemValue, photos: updatedPhotos }, { shouldDirty: true });
  }, [getValues, setValue]);


  const handleGenerateQuoteWithAI = async () => {
    setIsGeneratingQuote(true);
    const vehicle = selectedVehicle;
    const description = form.getValues('description');

    if (!vehicle || !description) {
        toast({ title: "Faltan Datos", description: "Por favor, seleccione un vehículo y escriba una descripción para generar la cotización.", variant: "destructive" });
        setIsGeneratingQuote(false);
        return;
    }

    try {
        const history = defaultServiceRecords.map(h => ({
            description: h.description,
            suppliesUsed: ('serviceItems' in h ? h.serviceItems.flatMap(i => i.suppliesUsed) : []).map(s => ({
                supplyName: s.supplyName || currentInventoryItems.find(i => i.id === s.supplyId)?.name || 'Unknown',
                quantity: s.quantity
            })),
            totalCost: h.totalCost || 0
        }));

        const inventoryForAI = currentInventoryItems.map(i => ({
            id: i.id,
            name: i.name,
            sellingPrice: i.sellingPrice
        }));

        const result = await suggestQuote({
            vehicleInfo: { make: vehicle.make, model: vehicle.model, year: vehicle.year },
            serviceDescription: description,
            serviceHistory: history,
            inventory: inventoryForAI,
        });

        const newServiceItem: ServiceItem = {
          id: `item_ai_${Date.now()}`,
          name: description,
          price: result.estimatedTotalCost,
          suppliesUsed: result.suppliesProposed.map(supply => {
            const itemDetails = currentInventoryItems.find(i => i.id === supply.supplyId);
            return {
                supplyId: supply.supplyId,
                quantity: supply.quantity,
                supplyName: itemDetails?.name || 'N/A',
                unitPrice: itemDetails?.sellingPrice || 0,
                isService: itemDetails?.isService || false,
                unitType: itemDetails?.unitType || 'units'
            };
          })
        };
        
        appendServiceItem(newServiceItem);

        toast({
            title: "Cotización Generada por IA",
            description: result.reasoning,
            duration: 10000,
        });

    } catch (e) {
        console.error("Error generating quote with AI:", e);
        toast({ title: "Error de IA", description: "No se pudo generar la cotización.", variant: "destructive" });
    } finally {
        setIsGeneratingQuote(false);
    }
  };

  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);

  const handleConfirmDelete = () => {
    if (onDelete && mode === 'quote' && initialDataQuote?.id) {
      onDelete(initialDataQuote.id);
      onClose();
    } else if (onCancelService && initialDataService?.id) {
      if (!cancellationReason.trim()) {
        toast({ title: "Motivo Requerido", variant: "destructive" });
        return;
      }
      onCancelService(initialDataService.id, cancellationReason);
      setIsCancelAlertOpen(false);
      onClose();
    }
  };

  const deleteButtonText = mode === 'quote'
    ? 'Eliminar Cotización'
    : (initialDataService?.status === 'Agendado' ? 'Cancelar Cita' : 'Cancelar Servicio');
  
  const statusOptions = useMemo(() => {
    const allOptions = ["Cotizacion", "Agendado", "En Espera de Refacciones", "Reparando", "Completado"];
    return allOptions;
  }, []);
  
  const lastServiceDateFormatted = useMemo(() => {
    if (!lastService) return 'No tiene historial de servicios.';
    
    // new Date() can handle both ISO strings and Date objects, which is more robust.
    const date = new Date(lastService.serviceDate);

    if (!isValid(date)) return 'Fecha inválida.';
    
    const description = lastService.description || '';
    return `${lastService.mileage ? `${lastService.mileage.toLocaleString('es-ES')} km - ` : ''}${format(date, "dd MMM yyyy", { locale: es })} - ${description}`;
  }, [lastService]);

  const handleDownloadImage = () => {
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
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <Tabs defaultValue="servicio" className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b pb-2">
              <div className="w-full overflow-x-auto pb-2 -mb-2">
                <TabsList className="bg-transparent p-0 w-max">
                  <TabsTrigger value="servicio" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-2 px-3 sm:px-4">
                      <Wrench className="h-4 w-4 shrink-0"/>
                      <span className="hidden sm:inline">Detalles</span>
                      <span className="sm:hidden">Detalles</span>
                  </TabsTrigger>
                  {showReceptionTab && (
                      <TabsTrigger value="recepcion" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-2 px-3 sm:px-4">
                          <FileCheck className="h-4 w-4 shrink-0"/>
                          <span className="hidden sm:inline">Rec. y Ent.</span>
                          <span className="sm:hidden">Rec. y Ent.</span>
                      </TabsTrigger>
                  )}
                  {showReportTab && (
                      <TabsTrigger value="reporte" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-2 px-3 sm:px-4">
                          <Camera className="h-4 w-4 shrink-0"/>
                          <span className="hidden sm:inline">Reporte Fotográfico</span>
                          <span className="sm:hidden">Fotos</span>
                      </TabsTrigger>
                  )}
                  {showReceptionTab && (
                      <TabsTrigger value="seguridad" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-2 px-3 sm:px-4">
                          <ShieldCheck className="h-4 w-4 shrink-0"/>
                          <span className="hidden sm:inline">Revisión</span>
                          <span className="sm:hidden">Revisión</span>
                      </TabsTrigger>
                  )}
                </TabsList>
              </div>
              <div className="flex gap-2 self-end sm:self-center">
                  {!isReadOnly && (
                      <Button type="button" onClick={handlePrintSheet} variant="ghost" size="icon" className="bg-card" title="Vista Previa Unificada">
                        <Eye className="h-5 w-5" />
                      </Button>
                  )}
              </div>
            </div>

            <TabsContent value="servicio" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                            Información del Documento
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Estado</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly || watchedStatus === 'Completado' || watchedStatus === 'Entregado'}>
                                      <FormControl>
                                          <SelectTrigger className="font-bold">
                                              <SelectValue placeholder="Seleccione un estado" />
                                          </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                          {statusOptions.map((statusVal) => (
                                              <SelectItem key={statusVal} value={statusVal}>{statusVal}</SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                              </FormItem>
                          )}
                      />
                      <FormField
                        control={form.control}
                        name="serviceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Servicio</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'Servicio General'} disabled={isReadOnly}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione un tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Servicio General">Servicio General</SelectItem>
                                <SelectItem value="Cambio de Aceite">Cambio de Aceite</SelectItem>
                                <SelectItem value="Pintura">Pintura</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {watchedStatus === 'Agendado' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t items-end">
                            <Controller
                            name="serviceDate"
                            control={form.control}
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Fecha de Cita</FormLabel>
                                <Popover open={isServiceDatePickerOpen} onOpenChange={setIsServiceDatePickerOpen}>
                                    <PopoverTrigger asChild disabled={isReadOnly}>
                                    <Button variant="outline" className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>
                                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={(date) => {
                                        const currentVal = field.value || new Date();
                                        const newDate = date ? setMinutes(setHours(date, currentVal.getHours()), currentVal.getMinutes()) : new Date();
                                        field.onChange(newDate);
                                        setIsServiceDatePickerOpen(false);
                                        }}
                                        disabled={isReadOnly}
                                        initialFocus
                                        locale={es}
                                    />
                                    </PopoverContent>
                                </Popover>
                                </FormItem>
                            )}
                            />
                            <Controller
                            name="serviceDate"
                            control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hora de Cita</FormLabel>
                                <FormControl>
                                    <Input
                                    type="time"
                                    value={field.value && isValid(field.value) ? format(field.value, 'HH:mm') : ""}
                                    onChange={(e) => {
                                        const timeValue = e.target.value;
                                        if (!timeValue) return;
                                        const [hours, minutes] = timeValue.split(':').map(Number);
                                        const currentVal = field.value || new Date();
                                        field.onChange(setMinutes(setHours(currentVal, hours), minutes));
                                    }}
                                    disabled={isReadOnly}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                        </div>
                    )}


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <FormField control={form.control} name="vehicleLicensePlateSearch" render={({ field }) => (<FormItem className="w-full"><FormLabel>Placa del Vehículo</FormLabel><FormControl><Input placeholder="Buscar/Ingresar Placas" {...field} value={vehicleLicensePlateSearch} onChange={(e) => {setVehicleLicensePlateSearch(e.target.value.toUpperCase()); field.onChange(e.target.value.toUpperCase());}} disabled={isReadOnly} className="uppercase" onKeyDown={handleVehiclePlateKeyDown} /></FormControl></FormItem>)}/>
                      <FormField control={form.control} name="mileage" render={({ field }) => ( <FormItem><FormLabel>Kilometraje (Opcional)</FormLabel><FormControl><Input type="number" placeholder="Ej: 55000 km" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl></FormItem>)}/>
                    </div>
                    {vehicleSearchResults.length > 0 && ( <ScrollArea className="h-auto max-h-[150px] w-full rounded-md border"><div className="p-2">{vehicleSearchResults.map(v => (<button type="button" key={v.id} onClick={() => handleSelectVehicleFromSearch(v)} className="w-full text-left p-2 rounded-md hover:bg-muted"><p className="font-semibold">{v.licensePlate}</p><p className="text-sm text-muted-foreground">{v.make} {v.model} - {v.ownerName}</p></button>))}</div></ScrollArea>)}
                    {selectedVehicle && (
                      <div className="p-3 border rounded-md bg-amber-50 dark:bg-amber-950/50 text-sm space-y-1">
                        <p className="font-semibold">{selectedVehicle.licensePlate} - {selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.year}</p>
                        <p>Propietario: {selectedVehicle.ownerName} - {selectedVehicle.ownerPhone}</p>
                        <p>Últ. Servicio: {lastServiceDateFormatted}</p>
                      </div>
                    )}
                    {vehicleNotFound && !selectedVehicle && !isReadOnly && (<div className="p-3 border border-orange-500 rounded-md bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 text-sm flex flex-col sm:flex-row items-center justify-between gap-2"><div className="flex items-center gap-2"><AlertCircle className="h-5 w-5 shrink-0"/><p>Vehículo con placa "{vehicleLicensePlateSearch}" no encontrado.</p></div><Button type="button" size="sm" variant="outline" onClick={() => {setNewVehicleInitialData({ licensePlate: vehicleLicensePlateSearch }); setIsVehicleDialogOpen(true);}} className="w-full sm:w-auto"><CarIcon className="mr-2 h-4 w-4"/> Registrar Nuevo Vehículo</Button></div>)}
                </CardContent>
              </Card>

              
              <Card>
                <CardHeader><CardTitle className="text-lg">Trabajos a Realizar</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {serviceItemsFields.map((serviceField, serviceIndex) => (
                        <ServiceItemCard
                            key={serviceField.id}
                            serviceIndex={serviceIndex}
                            control={control}
                            removeServiceItem={removeServiceItem}
                            isReadOnly={isReadOnly}
                            inventoryItems={currentInventoryItems}
                            mode={mode}
                        />
                    ))}
                    {!isReadOnly && (
                        <Button type="button" variant="outline" onClick={() => appendServiceItem({ id: `item_${Date.now()}`, name: '', price: undefined, suppliesUsed: [] })}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Añadir Trabajo a Realizar
                        </Button>
                    )}
                    {mode === 'quote' && !isReadOnly && (
                        <Button type="button" variant="secondary" onClick={handleGenerateQuoteWithAI} disabled={isGeneratingQuote}>
                            {isGeneratingQuote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                            Sugerir Cotización con IA
                        </Button>
                    )}
                </CardContent>
              </Card>
              
              <div className={cn("grid gap-6 items-start", watchedStatus === 'Completado' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                  <div className="space-y-6">
                      {(watchedStatus === 'Reparando' || watchedStatus === 'En Espera de Refacciones' || watchedStatus === 'Completado') && mode === 'service' && (
                         <Card>
                            <CardHeader><CardTitle className="text-lg">Técnico Asignado</CardTitle></CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="technicianId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Técnico Responsable</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un técnico" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                {technicians.map((tech) => (
                                                    <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                                                ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                         </Card>
                      )}
                      
                      <Card>
                        <CardHeader>
                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex justify-between items-center w-full">
                                        <span className="text-lg font-semibold">Notas Adicionales (Opcional)</span>
                                        {!isReadOnly && (
                                            <Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText('notes')} disabled={isEnhancingText === 'notes' || !field.value}>
                                                {isEnhancingText === 'notes' ? <Loader2 className="animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                                                <span className="ml-2 hidden sm:inline">Mejorar texto</span>
                                            </Button>
                                        )}
                                    </FormLabel>
                                    <FormControl><Textarea {...field} onChange={(e) => field.onChange(capitalizeSentences(e.target.value))} disabled={isReadOnly} className="min-h-[100px]" /></FormControl>
                                </FormItem>
                            )}
                          />
                        </CardHeader>
                      </Card>
                  </div>
                  
                  <div className="space-y-6">
                      {watchedStatus === 'Completado' && mode === 'service' && (
                          <Card>
                            <CardHeader><CardTitle className="text-lg">Método de Pago</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Método de Pago</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione método"/></SelectTrigger></FormControl>
                                            <SelectContent>{paymentMethods.map(method => { const Icon = paymentMethodIcons[method]; return (<SelectItem key={method} value={method}><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span>{method}</span></div></SelectItem>)})}</SelectContent>
                                        </Select>
                                    </FormItem>
                                )}/>
                                {(selectedPaymentMethod === "Tarjeta" || selectedPaymentMethod === "Tarjeta+Transferencia") && (
                                    <FormField control={form.control} name="cardFolio" render={({ field }) => (<FormItem><FormLabel>Folio Tarjeta</FormLabel><FormControl><Input placeholder="Folio de la transacción" {...field} disabled={isReadOnly}/></FormControl><FormMessage /></FormItem>)}/>
                                )}
                                {(selectedPaymentMethod === "Transferencia" || selectedPaymentMethod === "Efectivo+Transferencia" || selectedPaymentMethod === "Tarjeta+Transferencia") && (
                                    <FormField control={form.control} name="transferFolio" render={({ field }) => (<FormItem><FormLabel>Folio Transferencia</FormLabel><FormControl><Input placeholder="Referencia de la transferencia" {...field} disabled={isReadOnly}/></FormControl><FormMessage /></FormItem>)}/>
                                )}
                            </CardContent>
                          </Card>
                      )}
                      
                      <Card className="bg-card">
                          <CardHeader><CardTitle className="text-lg">Costo del Servicio</CardTitle></CardHeader>
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
              </div>
            </TabsContent>
            
            {showReceptionTab && (
              <TabsContent value="recepcion" className="space-y-6 mt-0">
                  <Card>
                    <CardHeader><CardTitle>Fechas y Horarios</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 items-end">
                            <Controller
                                name="serviceDate"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fecha de Recepción</FormLabel>
                                        <Popover open={isServiceDatePickerOpen} onOpenChange={setIsServiceDatePickerOpen}>
                                            <PopoverTrigger asChild disabled={isReadOnly}>
                                                <Button variant="outline" className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>
                                                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={(date) => {
                                                        const currentVal = field.value || new Date();
                                                        const newDate = date ? setMinutes(setHours(date, currentVal.getHours()), currentVal.getMinutes()) : new Date();
                                                        field.onChange(newDate);
                                                        setIsServiceDatePickerOpen(false);
                                                    }}
                                                    disabled={isReadOnly}
                                                    initialFocus
                                                    locale={es}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </FormItem>
                                )}
                            />
                             <Controller
                                name="serviceDate"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hora de Recepción</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="time"
                                                value={field.value && isValid(field.value) ? format(field.value, 'HH:mm') : ""}
                                                onChange={(e) => {
                                                    const timeValue = e.target.value;
                                                    if (!timeValue) return;
                                                    const [hours, minutes] = timeValue.split(':').map(Number);
                                                    const currentVal = field.value || new Date();
                                                    field.onChange(setMinutes(setHours(currentVal, hours), minutes));
                                                }}
                                                disabled={isReadOnly}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 items-end">
                            <Controller
                                name="deliveryDateTime"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                      <FormLabel>Fecha de Entrega</FormLabel>
                                      <Popover open={isDeliveryDatePickerOpen} onOpenChange={setIsDeliveryDatePickerOpen}>
                                        <PopoverTrigger asChild disabled={isReadOnly}>
                                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>
                                                {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                                <Clock className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                          <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={(date) => {
                                              const currentVal = field.value || new Date();
                                              const newDate = date ? setMinutes(setHours(date, currentVal.getHours()), currentVal.getMinutes()) : new Date();
                                              field.onChange(newDate);
                                              setIsDeliveryDatePickerOpen(false);
                                            }}
                                            disabled={isReadOnly}
                                            initialFocus
                                            locale={es}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    </FormItem>
                                )}
                            />
                            <Controller
                                control={form.control}
                                name="deliveryDateTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hora de Entrega</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="time"
                                                value={field.value && isValid(field.value) ? format(field.value, 'HH:mm') : ""}
                                                onChange={(e) => {
                                                    const timeValue = e.target.value;
                                                    if (!timeValue) return;
                                                    const [hours, minutes] = timeValue.split(':').map(Number);
                                                    const currentVal = field.value || new Date();
                                                    field.onChange(setMinutes(setHours(currentVal, hours), minutes));
                                                }}
                                                disabled={isReadOnly}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                       <FormField
                          control={form.control}
                          name="vehicleConditions"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="flex justify-between items-center w-full">
                                      <span className="text-lg font-semibold">Condiciones del Vehículo (al recibir)</span>
                                      {!isReadOnly && (
                                          <Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText('vehicleConditions')} disabled={isEnhancingText === 'vehicleConditions' || !field.value}>
                                              {isEnhancingText === 'vehicleConditions' ? <Loader2 className="animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                                              <span className="ml-2 hidden sm:inline">Mejorar texto</span>
                                          </Button>
                                      )}
                                  </FormLabel>
                                  <FormControl><Textarea placeholder="Ej: Rayón en puerta del conductor, llanta trasera derecha baja, etc." {...field} disabled={isReadOnly} /></FormControl>
                              </FormItem>
                          )}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="fuelLevel" render={({ field }) => (<FormItem><FormLabel>Nivel de Combustible</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar nivel..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Vacío">Vacío</SelectItem><SelectItem value="1/8">1/8</SelectItem><SelectItem value="1/4">1/4"></SelectItem><SelectItem value="3/8">3/8</SelectItem><SelectItem value="1/2">1/2</SelectItem><SelectItem value="5/8">5/8</SelectItem><SelectItem value="3/4">3/4</SelectItem><SelectItem value="7/8">7/8</SelectItem><SelectItem value="Lleno">Lleno</SelectItem></SelectContent></Select></FormItem>)}/>
                            <FormField control={form.control} name="customerItems" render={({ field }) => (<FormItem><FormLabel>Pertenencias del Cliente (Opcional)</FormLabel><FormControl><Textarea placeholder="Ej: Gato, llanta de refacción, cargador de celular en la guantera, etc." {...field} disabled={isReadOnly} /></FormControl></FormItem>)}/>
                        </div>
                        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><Label>Firma de Recepción</Label><div className="mt-2 p-2 h-24 border rounded-md bg-muted/50 flex items-center justify-center">{customerSignatureReception ? (<img src={customerSignatureReception} alt="Firma de recepción" style={{objectFit: 'contain', width: '150px', height: '75px'}}/>) : (<span className="text-sm text-muted-foreground">Pendiente de firma del cliente</span>)}</div></div>
                            <div><Label>Firma de Entrega</Label><div className="mt-2 p-2 h-24 border rounded-md bg-muted/50 flex items-center justify-center">{customerSignatureDelivery ? (<img src={customerSignatureDelivery} alt="Firma de entrega" style={{objectFit: 'contain', width: '150px', height: '75px'}}/>) : (<span className="text-sm text-muted-foreground">Pendiente de firma del cliente</span>)}</div></div>
                        </div>
                    </CardContent>
                  </Card>
              </TabsContent>
            )}
            
            {showReportTab && (
              <TabsContent value="reporte" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Reporte Fotográfico</CardTitle>
                    <CardDescription>Añade grupos de fotos para documentar el estado del vehículo o las reparaciones realizadas.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {photoReportFields.map((field, index) => (
                        <Card key={field.id} className="p-4 bg-muted/30">
                           <div className="flex justify-between items-start mb-2">
                                <Label className="text-base font-semibold flex items-center gap-2">Reporte #{index + 1}</Label>
                                {!isReadOnly && (<Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removePhotoReport(index)}><Trash2 className="h-4 w-4"/></Button>)}
                           </div>
                           <FormField
                              control={form.control}
                              name={`photoReports.${index}.description`}
                              render={({ field: descField }) => (
                                  <FormItem>
                                      <FormLabel className="flex justify-between items-center w-full text-sm">
                                        <span>Descripción del Reporte</span>
                                        {!isReadOnly && (
                                            <Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText(`photoReports.${index}.description`)} disabled={isEnhancingText === `photoReports.${index}.description` || !descField.value}>
                                                {isEnhancingText === `photoReports.${index}.description` ? <Loader2 className="animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                                                <span className="ml-2 hidden sm:inline">Mejorar</span>
                                            </Button>
                                        )}
                                      </FormLabel>
                                      <FormControl><Textarea placeholder="Describe el conjunto de fotos..." disabled={isReadOnly} {...descField} /></FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {field.photos.map((photoUrl, photoIndex) => (
                                    <button type="button" key={photoIndex} className="relative aspect-video w-full bg-muted rounded-md overflow-hidden group" onClick={() => handleViewImage(photoUrl)}>
                                        <Image src={photoUrl} layout="fill" objectFit="cover" alt={`Foto ${photoIndex + 1} del reporte ${index + 1}`} className="transition-transform duration-300 group-hover:scale-105" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                            <Eye className="h-8 w-8 text-white" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <PhotoUploader
                                reportIndex={index}
                                serviceId={stableServiceId}
                                photosLength={field.photos.length}
                                disabled={isReadOnly}
                                onUploadComplete={handlePhotoUploadComplete}
                            />
                        </Card>
                    ))}
                    {!isReadOnly && (
                      <Button type="button" variant="secondary" onClick={() => appendPhotoReport({ id: `rep_${Date.now()}`, date: new Date().toISOString(), description: '', photos: [] })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Reporte
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {showReceptionTab && (
              <TabsContent value="seguridad" className="space-y-6 mt-0">
                  <SafetyChecklist 
                    control={control} 
                    isReadOnly={isReadOnly} 
                    onSignatureClick={() => setIsTechSignatureDialogOpen(true)} 
                    signatureDataUrl={technicianSignature}
                    isEnhancingText={isEnhancingText}
                    handleEnhanceText={handleEnhanceText}
                    serviceId={stableServiceId}
                    onPhotoUploaded={handleChecklistPhotoUpload}
                    onViewImage={handleViewImage}
                  />
              </TabsContent>
            )}
          </Tabs>

          <div className="flex justify-between items-center pt-4">
            <div className="flex items-center gap-2">
                <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
                    <AlertDialogTrigger asChild>
                        {!isReadOnly && initialData?.id && (
                            <Button type="button" variant="destructive">
                                <Ban className="mr-2 h-4 w-4" />
                                {deleteButtonText}
                            </Button>
                        )}
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {mode === 'quote' ? `Se eliminará la cotización ${initialDataQuote?.id}. Esta acción no se puede deshacer.` : `Se cancelará el servicio ${initialDataService?.id}.`}
                            </AlertDialogDescription>
                            {mode === 'service' && (
                              <div className="mt-4">
                                <Label htmlFor="cancellation-reason">Motivo de la cancelación (obligatorio)</Label>
                                <Textarea id="cancellation-reason" value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} placeholder="Ej: El cliente no se presentó..." className="mt-2" />
                              </div>
                            )}
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setCancellationReason('')}>No, volver</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmDelete} disabled={mode === 'service' && !cancellationReason.trim()} className="bg-destructive hover:bg-destructive/90">
                               Sí, proceder
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="flex justify-end gap-2 w-full">
            {isReadOnly ? (<Button type="button" variant="outline" onClick={onClose}>Cerrar</Button>) : (
                <>
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={form.formState.isSubmitting || !selectedVehicle}>{form.formState.isSubmitting ? "Guardando..." : (initialData?.id ? "Actualizar" : "Crear")}</Button>
                </>
            )}
            </div>
          </div>
        </form>
      </Form>

       <SignatureDialog
        open={isTechSignatureDialogOpen}
        onOpenChange={setIsTechSignatureDialogOpen}
        onSave={(signature) => {
          form.setValue('safetyInspection.technicianSignature', signature, { shouldDirty: true });
          setIsTechSignatureDialogOpen(false);
          toast({ title: 'Firma Capturada', description: 'La firma del técnico se ha guardado en el formulario.' });
        }}
      />
      
      {isSheetOpen && serviceForPreview && (
        <UnifiedPreviewDialog
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          service={serviceForPreview}
        />
      )}

      <VehicleDialog
          open={isVehicleDialogOpen}
          onOpenChange={setIsVehicleDialogOpen}
          onSave={handleSaveNewVehicle}
          vehicle={newVehicleInitialData}
      />
      
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl p-2">
            <DialogHeader className="print:hidden">
              <DialogTitle>Vista Previa de Imagen</DialogTitle>
              <DialogDesc>
                Visualizando la imagen de evidencia. Puede descargarla si lo necesita.
              </DialogDesc>
            </DialogHeader>
            <div className="relative aspect-video w-full">
                {viewingImageUrl && (
                    <img src={viewingImageUrl} alt="Vista ampliada de evidencia" style={{ objectFit: 'contain', width: '100%', height: '100%' }} crossOrigin="anonymous" />
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
