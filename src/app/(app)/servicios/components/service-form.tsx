
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
import { CalendarIcon, PlusCircle, Search, Trash2, AlertCircle, Car as CarIcon, Clock, DollarSign, PackagePlus, BrainCircuit, Loader2, Printer, Plus, Minus, FileText, Signature, MessageSquare, Ban, ShieldQuestion, Wrench, Wallet, CreditCard, Send, WalletCards, ArrowRightLeft, Tag, FileCheck, Check, ShieldCheck, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, setHours, setMinutes, isValid, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, ServiceSupply, QuoteRecord, InventoryCategory, Supplier, User, WorkshopInfo, ServiceItem, SafetyInspection, PaymentMethod, SafetyCheckStatus } from "@/types";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { VehicleDialog } from "../../vehiculos/components/vehicle-dialog";
import type { VehicleFormValues } from "../../vehiculos/components/vehicle-form";
import { 
    placeholderVehicles as defaultPlaceholderVehicles, 
    placeholderInventory, 
    placeholderCategories, 
    placeholderSuppliers, 
    placeholderQuotes, 
    placeholderServiceRecords as defaultServiceRecords, 
    persistToFirestore, 
    AUTH_USER_LOCALSTORAGE_KEY,
    sanitizeObjectForFirestore
} from '@/lib/placeholder-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InventoryItemDialog } from "../../inventario/components/inventory-item-dialog";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { suggestPrice, type SuggestPriceInput } from '@/ai/flows/price-suggestion-flow';
import { suggestQuote, type QuoteSuggestionInput } from '@/ai/flows/quote-suggestion-flow';
import { enhanceText } from '@/ai/flows/text-enhancement-flow';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { ServiceSheetContent } from '@/components/service-sheet-content';
import { Checkbox } from "@/components/ui/checkbox";
import Image from 'next/image';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@root/lib/firebaseClient.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddSupplyDialog } from './add-supply-dialog';
import { QuoteContent } from '@/components/quote-content';
import { SignatureDialog } from './signature-dialog';
import { TicketContent } from '@/components/ticket-content';
import { capitalizeWords, formatCurrency } from '@/lib/utils';


const supplySchema = z.object({
  supplyId: z.string().min(1, "Seleccione un insumo"),
  quantity: z.coerce.number().min(0.001, "La cantidad debe ser mayor a 0"),
  unitPrice: z.coerce.number().optional(),
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

const safetyCheckStatusSchema = z.enum(['ok', 'atencion', 'inmediata', 'na']).default('na');

const safetyInspectionSchema = z.object({
  // Luces
  luces_altas_bajas_niebla: safetyCheckStatusSchema.optional(),
  luces_cuartos: safetyCheckStatusSchema.optional(),
  luces_direccionales: safetyCheckStatusSchema.optional(),
  luces_frenos_reversa: safetyCheckStatusSchema.optional(),
  luces_interiores: safetyCheckStatusSchema.optional(),
  
  // Fugas y Niveles
  fugas_refrigerante: safetyCheckStatusSchema.optional(),
  fugas_limpiaparabrisas: safetyCheckStatusSchema.optional(),
  fugas_frenos_embrague: safetyCheckStatusSchema.optional(),
  fugas_transmision: safetyCheckStatusSchema.optional(),
  fugas_direccion_hidraulica: safetyCheckStatusSchema.optional(),
  
  // Carrocería
  carroceria_cristales_espejos: safetyCheckStatusSchema.optional(),
  carroceria_puertas_cofre: safetyCheckStatusSchema.optional(),
  carroceria_asientos_tablero: safetyCheckStatusSchema.optional(),
  carroceria_plumas: safetyCheckStatusSchema.optional(),
  
  // Suspensión y Dirección
  suspension_rotulas: safetyCheckStatusSchema.optional(),
  suspension_amortiguadores: safetyCheckStatusSchema.optional(),
  suspension_caja_direccion: safetyCheckStatusSchema.optional(),
  suspension_terminales: safetyCheckStatusSchema.optional(),

  // Llantas (Estado y Presión)
  llantas_delanteras_traseras: safetyCheckStatusSchema.optional(),
  llantas_refaccion: safetyCheckStatusSchema.optional(),
  
  // Frenos
  frenos_discos_delanteros: safetyCheckStatusSchema.optional(),
  frenos_discos_traseros: safetyCheckStatusSchema.optional(),
  
  // Otros
  otros_tuberia_escape: safetyCheckStatusSchema.optional(),
  otros_soportes_motor: safetyCheckStatusSchema.optional(),
  otros_claxon: safetyCheckStatusSchema.optional(),
  otros_inspeccion_sdb: safetyCheckStatusSchema.optional(),
  
  // Global notes and signature for the inspection
  inspectionNotes: z.string().optional(),
  technicianSignature: z.string().optional(), 
});


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
  status: z.enum(["Cotizacion", "Agendado", "Reparando", "Completado", "Cancelado"]).optional(),
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
  path: ["cardFolio"],
}).refine(data => {
  if (data.status === 'Completado' && (data.paymentMethod === "Transferencia" || data.paymentMethod === "Efectivo+Transferencia" || data.paymentMethod === "Tarjeta+Transferencia") && !data.transferFolio) {
    return false;
  }
  return true;
}, {
  path: ["transferFolio"],
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

const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
        if (hour === 8) {
            slots.push({ value: `${hour}:30`, label: `08:30 AM`});
        } else if (hour === 18) {
            slots.push({ value: `${hour}:00`, label: `${hour}:00 PM`});
            slots.push({ value: `${hour}:30`, label: `${hour}:30 PM`});
        }
         else {
            slots.push({ value: `${String(hour).padStart(2, '0')}:00`, label: `${String(hour).padStart(2, '0')}:00 ${hour < 12 ? 'AM' : 'PM'}`});
            slots.push({ value: `${String(hour).padStart(2, '0')}:30`, label: `${String(hour).padStart(2, '0')}:30 ${hour < 12 ? 'AM' : 'PM'}`});
        }
    }
    return slots;
};
const timeSlots = generateTimeSlots();

const paymentMethodIcons: Record<PaymentMethod, React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Transferencia": Send,
  "Efectivo+Transferencia": WalletCards,
  "Tarjeta+Transferencia": ArrowRightLeft,
};


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
  
  const isConvertingQuote = mode === 'service' && !initialDataService && !!initialDataQuote;
  const initialData = isConvertingQuote ? initialDataQuote : (mode === 'service' ? initialDataService : initialDataQuote);
  const initialVehicleIdentifier = initialData?.vehicleIdentifier;

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

  const [isSuggestingPrice, setIsSuggestingPrice] = useState(false);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [serviceForSheet, setServiceForSheet] = useState<ServiceRecord | null>(null);
  
  const [isQuoteViewOpen, setIsQuoteViewOpen] = useState(false);
  const [quoteForView, setQuoteForView] = useState<QuoteRecord | null>(null);
  
  const [isServiceDatePickerOpen, setIsServiceDatePickerOpen] = useState(false);
  const [isDeliveryDatePickerOpen, setIsDeliveryDatePickerOpen] = useState(false);
  
  const freshUserRef = useRef<User | null>(null);
  const [isTechSignatureDialogOpen, setIsTechSignatureDialogOpen] = useState(false);
  const [isEnhancingText, setIsEnhancingText] = useState<string | null>(null);
  const [isTicketPreviewOpen, setIsTicketPreviewOpen] = useState(false);
  const ticketContentRef = useRef<HTMLDivElement>(null);

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
    }
  });

  const quoteForViewing = useMemo(() => {
    if (mode === 'service') {
      if (isConvertingQuote && initialDataQuote) {
        return placeholderQuotes.find(q => q.id === initialDataQuote.id) || null;
      }
      if (initialDataService) {
        return placeholderQuotes.find(q => q.serviceId === initialDataService.id) || null;
      }
    } else if (mode === 'quote' && initialDataQuote) {
      return placeholderQuotes.find(q => q.id === initialDataQuote.id) || null;
    }
    return null;
  }, [mode, initialDataService, initialDataQuote, isConvertingQuote]);
  
  const watchedStatus = useWatch({ control: form.control, name: 'status' });
  const selectedPaymentMethod = useWatch({ control: form.control, name: 'paymentMethod' });
  const customerSignatureReception = useWatch({ control: form.control, name: 'customerSignatureReception' });
  const customerSignatureDelivery = useWatch({ control: form.control, name: 'customerSignatureDelivery' });
  const technicianSignature = useWatch({ control: form.control, name: 'safetyInspection.technicianSignature' });

  const { fields: serviceItemsFields, append: appendServiceItem, remove: removeServiceItem, update: updateServiceItem } = useFieldArray({
    control: form.control,
    name: "serviceItems",
  });

  const refreshCurrentUser = useCallback(() => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (authUserString) {
      freshUserRef.current = JSON.parse(authUserString);
    }
  }, []);

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
    const isConverting = mode === 'service' && !initialDataService && !!initialDataQuote;
    const data = isConverting ? initialDataQuote : (mode === 'service' ? initialDataService : initialDataQuote);
    
    if (data) {
        const vehicle = localVehicles.find(v => v.id === data.vehicleId);
        if (vehicle) {
            setSelectedVehicle(vehicle);
            setVehicleLicensePlateSearch(vehicle.licensePlate);
            // Also fetch last service info for existing data
            const vehicleServices = defaultServiceRecords.filter(s => s.vehicleId === vehicle.id).sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
            if (vehicleServices.length > 0) {
                setLastService(vehicleServices[0]);
            } else {
                setLastService(null);
            }
        }
        
        let serviceItemsData: ServiceItem[] = [];
        if ('serviceItems' in data && Array.isArray(data.serviceItems)) {
            serviceItemsData = data.serviceItems.map(item => ({
                ...item,
                suppliesUsed: item.suppliesUsed.map(supply => ({
                    ...supply,
                    unitPrice: currentInventoryItems.find(i => i.id === supply.supplyId)?.unitPrice || 0,
                }))
            }));
        }

        const rawServiceDate = data.serviceDate || data.quoteDate;
        let parsedServiceDate: Date | undefined = undefined;
        if (rawServiceDate) {
            if (rawServiceDate instanceof Date) {
                parsedServiceDate = rawServiceDate;
            } else if (typeof rawServiceDate === 'string') {
                const parsed = parseISO(rawServiceDate);
                if (isValid(parsed)) parsedServiceDate = parsed;
            }
        }

        const rawDeliveryDate = (data as ServiceRecord)?.deliveryDateTime;
        let parsedDeliveryDate: Date | undefined = undefined;
        if (rawDeliveryDate) {
            if (rawDeliveryDate instanceof Date) {
                parsedDeliveryDate = rawDeliveryDate;
            } else if (typeof rawDeliveryDate === 'string') {
                const parsed = parseISO(rawDeliveryDate);
                if (isValid(parsed)) parsedDeliveryDate = parsed;
            }
        }

        const dataToReset: Partial<ServiceFormValues> = {
            id: data.id,
            publicId: (data as any)?.publicId,
            vehicleId: data.vehicleId ? String(data.vehicleId) : undefined,
            vehicleLicensePlateSearch: vehicle?.licensePlate || data.vehicleIdentifier || "",
            serviceDate: parsedServiceDate,
            deliveryDateTime: parsedDeliveryDate,
            mileage: data.mileage || undefined,
            description: (data as any).description || "",
            notes: data.notes || "",
            technicianId: (data as ServiceRecord)?.technicianId || (data as QuoteRecord)?.preparedByTechnicianId || undefined,
            status: mode === 'service' ? ((data as ServiceRecord)?.status || 'Agendado') : 'Cotizacion',
            serviceType: (data as ServiceRecord)?.serviceType || (data as QuoteRecord)?.serviceType || 'Servicio General',
            vehicleConditions: (data as ServiceRecord)?.vehicleConditions || "",
            fuelLevel: (data as ServiceRecord)?.fuelLevel || undefined,
            customerItems: (data as ServiceRecord)?.customerItems || '',
            customerSignatureReception: (data as ServiceRecord)?.customerSignatureReception || undefined,
            customerSignatureDelivery: (data as ServiceRecord)?.customerSignatureDelivery || undefined,
            serviceItems: serviceItemsData,
            safetyInspection: (data as ServiceRecord)?.safetyInspection || {},
            paymentMethod: (data as ServiceRecord)?.paymentMethod || 'Efectivo',
            cardFolio: (data as ServiceRecord)?.cardFolio || '',
            transferFolio: (initialData as ServiceRecord)?.transferFolio || '',
            nextServiceInfo: (data as ServiceRecord)?.nextServiceInfo,
        };

        form.reset(dataToReset);

    } else {
      // Set default for new forms
      if(mode === 'service') form.setValue('serviceDate', setHours(setMinutes(new Date(), 30), 8));
      if (mode === 'quote') {
          const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
          const freshCurrentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
          if (freshCurrentUser) {
            form.setValue('technicianId', freshCurrentUser.id);
          }
      }
    }
  }, [initialDataService, initialDataQuote, mode, localVehicles, currentInventoryItems, form]);
  
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


  const watchedServiceItems = form.watch("serviceItems");


  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useMemo(() => {
    const currentTotalCost = watchedServiceItems?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
    
    const currentTotalSuppliesWorkshopCost = watchedServiceItems?.flatMap(item => item.suppliesUsed).reduce((sum, supply) => {
        const item = currentInventoryItems.find(i => i.id === supply.supplyId);
        const costPerUnit = item?.unitPrice || supply.unitPrice || 0;
        return sum + costPerUnit * supply.quantity;
    }, 0) || 0;

    const totalCostBeforeTax = currentTotalCost / (1 + IVA_RATE) || 0;
    const currentServiceProfit = totalCostBeforeTax - currentTotalSuppliesWorkshopCost;

    return {
      totalCost: currentTotalCost,
      totalSuppliesWorkshopCost: currentTotalSuppliesWorkshopCost,
      serviceProfit: currentServiceProfit,
    };
  }, [watchedServiceItems, currentInventoryItems]);


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
      id: `VEH_${Date.now().toString(36)}`,
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

  const savePublicDocument = async (
    type: 'quote' | 'service',
    data: QuoteRecord | ServiceRecord,
    vehicle: Vehicle | null
  ) => {
    if (!db) {
      console.error("Public save failed: Firebase (db) no está configurado en lib/firebaseClient.js");
       toast({
        title: "Configuración Incompleta",
        description: "La base de datos (Firebase) no está configurada. No se pudo crear el documento público.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    if (!data.publicId || !vehicle) {
      console.warn(`Public save skipped: Missing publicId or vehicle data.`);
      return;
    }

    const collectionName = type === 'quote' ? 'publicQuotes' : 'publicServices';
    const publicDocRef = doc(db, collectionName, data.publicId);
    
    const fullPublicData = sanitizeObjectForFirestore({
        ...data,
        vehicle,
        workshopInfo,
    });
    
    try {
      await setDoc(publicDocRef, fullPublicData, { merge: true });
      console.log(`Public ${type} document ${data.publicId} saved successfully.`);
    } catch (e) {
      console.error(`Failed to save public ${type} document:`, e);
      toast({
        title: "Error de Sincronización",
        description: `No se pudo guardar el documento público. El enlace compartido podría no funcionar. Error: ${e instanceof Error ? e.message : String(e)}`,
        variant: "destructive",
      });
    }
  };

  const handleViewQuote = useCallback((quoteToView: QuoteRecord | null) => {
    if (quoteToView) {
        setQuoteForView(quoteToView);
        setIsQuoteViewOpen(true);
    } else {
        toast({ title: "No encontrada", description: "No se encontró la cotización para mostrar.", variant: "default" });
    }
  }, [toast]);


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

    const finalSubTotal = totalCost / (1 + IVA_RATE);
    const finalTaxAmount = totalCost - finalSubTotal;
    const finalProfit = serviceProfit;
    const compositeDescription = values.serviceItems.map(item => item.name).join(', ') || 'Servicio';
    
    const isConvertingQuoteToService = mode === 'quote' && values.status && values.status !== 'Cotizacion';

    if (mode === 'service' || isConvertingQuoteToService) {
      const originalStatus = initialDataService?.status;
      const serviceData: Partial<ServiceRecord> = {
        ...values,
        id: initialData?.id || `SER_${Date.now().toString(36)}`,
        publicId: values.publicId || `srv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`,
        vehicleId: vehicleIdToSave,
        description: compositeDescription,
        technicianId: values.technicianId || '',
        status: values.status || 'Agendado',
        totalCost: totalCost,
        serviceAdvisorId: currentUser.id,
        serviceItems: values.serviceItems,
      };

      if (originalStatus !== 'Reparando' && serviceData.status === 'Reparando') {
          serviceData.serviceDate = new Date().toISOString();
      } else if (values.serviceDate) {
          serviceData.serviceDate = values.serviceDate.toISOString();
      }

      if (originalStatus !== 'Completado' && serviceData.status === 'Completado') {
          serviceData.deliveryDateTime = new Date().toISOString();
      } else if (values.deliveryDateTime) {
          serviceData.deliveryDateTime = values.deliveryDateTime.toISOString();
      }
      
      if (values.status === 'Completado') {
        serviceData.paymentMethod = values.paymentMethod;
        serviceData.cardFolio = values.cardFolio;
        serviceData.transferFolio = values.transferFolio;

        try {
          const deliveryDate = serviceData.deliveryDateTime ? new Date(serviceData.deliveryDateTime) : new Date();
          
          if (isValid(deliveryDate)) {
            const nextServiceDate = addDays(deliveryDate, 365);
            let nextServiceMileage: number | undefined;
      
            const mileageValue = values.mileage;
            if (typeof mileageValue === 'number' && isFinite(mileageValue) && mileageValue > 0) {
              const oilSupplies = values.serviceItems
                .flatMap(item => item.suppliesUsed)
                .map(supply => currentInventoryItems.find(i => i.id === supply.supplyId))
                .filter(Boolean);
              
              const rendimientos = oilSupplies
                .filter(item => 
                  item.category?.toLowerCase().includes('aceite') && 
                  typeof item.rendimiento === 'number' && 
                  item.rendimiento > 0
                )
                .map(item => item.rendimiento as number);
      
              if (rendimientos.length > 0) {
                const lowestRendimiento = Math.min(...rendimientos);
                if (isFinite(lowestRendimiento)) {
                  nextServiceMileage = mileageValue + lowestRendimiento;
                }
              }
            }
            
            const nextInfo: { date: string; mileage?: number } = {
                date: nextServiceDate.toISOString(),
            };
            if (typeof nextServiceMileage === 'number' && isFinite(nextServiceMileage)) {
                nextInfo.mileage = nextServiceMileage;
            }
            serviceData.nextServiceInfo = nextInfo;
          } else {
             console.warn("Could not calculate nextServiceInfo due to invalid delivery date.");
          }
        } catch (e) {
          console.error("Error during nextServiceInfo calculation:", e);
        }
      }
      
      serviceData.vehicleIdentifier = selectedVehicle?.licensePlate || values.vehicleLicensePlateSearch || 'N/A';
      serviceData.technicianName = technicians.find(t => t.id === values.technicianId)?.name || 'N/A';
      serviceData.subTotal = finalSubTotal;
      serviceData.taxAmount = finalTaxAmount;
      serviceData.totalSuppliesCost = totalSuppliesWorkshopCost;
      serviceData.serviceProfit = finalProfit;
      serviceData.serviceAdvisorName = currentUser.name;
      
      if (currentUser.signatureDataUrl) serviceData.serviceAdvisorSignatureDataUrl = currentUser.signatureDataUrl;
      if (workshopInfo && Object.keys(workshopInfo).length > 0) serviceData.workshopInfo = workshopInfo as WorkshopInfo;

      await savePublicDocument('service', serviceData as ServiceRecord, selectedVehicle);
      await onSubmit(serviceData as ServiceRecord);

    } else { // mode === 'quote'
      const quoteData: Partial<QuoteRecord> = {
        id: (initialDataQuote as QuoteRecord)?.id || `COT_${Date.now().toString(36)}`,
        publicId: (initialDataQuote as QuoteRecord)?.publicId || `cot_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`,
        quoteDate: new Date().toISOString(),
        vehicleId: vehicleIdToSave,
        description: compositeDescription,
        serviceItems: values.serviceItems,
        status: 'Cotizacion', // Always Cotizacion if not converting
        serviceType: values.serviceType || 'Servicio General',
      };
      
      quoteData.vehicleIdentifier = selectedVehicle?.licensePlate || values.vehicleLicensePlateSearch || 'N/A';
      quoteData.preparedByTechnicianId = currentUser.id;
      quoteData.preparedByTechnicianName = currentUser.name;
      quoteData.estimatedTotalCost = totalCost;
      quoteData.estimatedSubTotal = finalSubTotal;
      quoteData.estimatedTaxAmount = finalTaxAmount;
      quoteData.estimatedTotalSuppliesCost = totalSuppliesWorkshopCost;
      quoteData.estimatedProfit = finalProfit;
      
      if (values.notes) quoteData.notes = values.notes;
      if (values.mileage) quoteData.mileage = values.mileage;
      if (workshopInfo && Object.keys(workshopInfo).length > 0) quoteData.workshopInfo = workshopInfo as WorkshopInfo;
      
      await savePublicDocument('quote', quoteData as QuoteRecord, selectedVehicle);
      await onSubmit(quoteData as QuoteRecord);
    }
  };
  
  const handlePrintSheet = useCallback(async () => {
    const serviceData = { ...form.getValues() } as ServiceRecord;
    serviceData.serviceAdvisorName = freshUserRef.current?.name || 'N/A';
    serviceData.serviceAdvisorSignatureDataUrl = freshUserRef.current?.signatureDataUrl;
    setServiceForSheet(serviceData);
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

  const handleSuggestPrice = async (serviceItemIndex: number) => {
    toast({ title: "Función no disponible", description: "La sugerencia de precios con IA se está adaptando al nuevo formato." });
  };
  
  const handleEnhanceText = async (fieldName: 'notes' | 'vehicleConditions' | 'safetyInspection.inspectionNotes') => {
    const contextMap = {
      'notes': 'Notas Adicionales del Servicio',
      'vehicleConditions': 'Condiciones del Vehículo (al recibir)',
      'safetyInspection.inspectionNotes': 'Observaciones de la Inspección de Seguridad'
    };

    const context = contextMap[fieldName];
    const currentValue = form.getValues(fieldName);

    if (!currentValue || currentValue.trim().length < 2) {
        toast({ title: 'No hay suficiente texto', description: 'Escriba algo antes de mejorar el texto.', variant: 'default' });
        return;
    }
    
    setIsEnhancingText(fieldName);
    try {
        const result = await enhanceText({ text: currentValue, context });
        form.setValue(fieldName, result, { shouldDirty: true });
        toast({ title: 'Texto Mejorado', description: 'La IA ha corregido y mejorado el texto.' });
    } catch (e) {
        console.error("Error enhancing text:", e);
        toast({ title: "Error de IA", description: "No se pudo mejorar el texto.", variant: "destructive" });
    } finally {
        setIsEnhancingText(null);
    }
  };

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
        const history = [...defaultServiceRecords, ...placeholderQuotes].map(h => ({
            description: h.description,
            suppliesUsed: ('serviceItems' in h ? h.serviceItems.flatMap(i => i.suppliesUsed) : []).map(s => ({
                supplyName: s.supplyName || currentInventoryItems.find(i => i.id === s.supplyId)?.name || 'Unknown',
                quantity: s.quantity
            })),
            totalCost: ('totalCost' in h ? h.totalCost : h.estimatedTotalCost) || 0
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
  
  const handlePrintTicket = useCallback(() => {
    window.print();
  }, []);
  
  const handleCopyAsImage = async () => {
    if (!ticketContentRef.current) {
        toast({ title: "Error", description: "No se encontró el contenido del ticket.", variant: "destructive" });
        return;
    }
    try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(ticketContentRef.current, {
            useCORS: true,
            backgroundColor: '#ffffff',
            scale: 2.5, 
        });
        canvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    toast({ title: "Copiado", description: "La imagen del ticket ha sido copiada." });
                } catch (clipboardErr) {
                    console.error('Clipboard API error:', clipboardErr);
                    toast({ title: "Error de Copiado", description: "Tu navegador no pudo copiar la imagen. Intenta imprimir.", variant: "destructive" });
                }
            } else {
                 toast({ title: "Error de Conversión", description: "No se pudo convertir el ticket a imagen.", variant: "destructive" });
            }
        }, 'image/png');
    } catch (e) {
        console.error("html2canvas error:", e);
        toast({ title: "Error de Captura", description: "No se pudo generar la imagen del ticket.", variant: "destructive" });
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

  const showStatusFields = mode === 'service' || (mode === 'quote' && !!initialData?.id);
  
  const statusOptions = useMemo(() => {
    if (mode === 'quote' && initialDataQuote?.id) {
      return ["Cotizacion", "Agendado", "Reparando"];
    }
    if (mode === 'service') {
        return ["Agendado", "Reparando", "Completado"];
    }
    return [];
  }, [mode, initialDataQuote]);
  
  const showDateFields = watchedStatus === 'Agendado';

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
                      <span className="hidden sm:inline">Detalles del Servicio</span>
                      <span className="sm:hidden">Detalles</span>
                  </TabsTrigger>
                  {showReceptionTab && (
                      <TabsTrigger value="recepcion" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-2 px-3 sm:px-4">
                          <FileCheck className="h-4 w-4 shrink-0"/>
                          <span className="hidden sm:inline">Recepción y Entrega</span>
                          <span className="sm:hidden">Recepción</span>
                      </TabsTrigger>
                  )}
                  {showReceptionTab && (
                      <TabsTrigger value="seguridad" className="text-sm sm:text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none flex items-center gap-2 py-2 px-3 sm:px-4">
                          <ShieldCheck className="h-4 w-4 shrink-0"/>
                          <span className="hidden sm:inline">Revisión de Seguridad</span>
                          <span className="sm:hidden">Seguridad</span>
                      </TabsTrigger>
                  )}
                </TabsList>
              </div>
              <div className="flex gap-2 self-end sm:self-center">
                  {quoteForViewing && (
                      <Button type="button" onClick={() => handleViewQuote(quoteForViewing)} variant="ghost" size="icon" className="bg-card" title="Ver Cotización Original">
                          <FileText className="h-5 w-5 text-purple-600" />
                      </Button>
                  )}
                  {mode === 'service' && !isReadOnly && (watchedStatus === 'Reparando' || watchedStatus === 'Completado') && (
                      <Button type="button" onClick={handlePrintSheet} variant="ghost" size="icon" className="bg-card" title="Ver Hoja de Servicio">
                        <FileCheck className="h-5 w-5" />
                      </Button>
                  )}
              </div>
            </div>

            <TabsContent value="servicio" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                            {mode === 'quote' ? "Información de la Cotización" : "Información del Servicio"}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      {showStatusFields && (
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
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
                      )}
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
                       {showDateFields && (
                         <div className="grid grid-cols-2 gap-4 items-end md:col-span-2">
                             <Controller
                                name="serviceDate"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fecha Agendada</FormLabel>
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
                                                    disabled={(date) => date < startOfDay(new Date()) || (isReadOnly && mode === 'service')}
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
                                        <FormLabel>Hora Agendada</FormLabel>
                                        <Select
                                            value={field.value ? format(field.value, 'HH:mm') : ""}
                                            onValueChange={(timeValue) => {
                                                if (!timeValue) return;
                                                const [hours, minutes] = timeValue.split(':').map(Number);
                                                const currentVal = field.value || new Date();
                                                field.onChange(setMinutes(setHours(currentVal, hours), minutes));
                                            }}
                                            disabled={isReadOnly}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Seleccione hora" /></SelectTrigger>
                                            <SelectContent>{timeSlots.map(slot => (<SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>))}</SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                          </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <FormField control={form.control} name="vehicleLicensePlateSearch" render={({ field }) => (<FormItem className="w-full"><FormLabel>Placa del Vehículo</FormLabel><FormControl><Input placeholder="Buscar/Ingresar Placas" {...field} value={vehicleLicensePlateSearch} onChange={(e) => {setVehicleLicensePlateSearch(e.target.value.toUpperCase()); field.onChange(e.target.value.toUpperCase());}} disabled={isReadOnly} className="uppercase" onKeyDown={handleVehiclePlateKeyDown} /></FormControl></FormItem>)}/>
                      <FormField control={form.control} name="mileage" render={({ field }) => ( <FormItem><FormLabel>Kilometraje (Opcional)</FormLabel><FormControl><Input type="number" placeholder="Ej: 55000 km" {...field} disabled={isReadOnly} value={field.value ?? ''} /></FormControl></FormItem>)}/>
                    </div>
                    {vehicleSearchResults.length > 0 && ( <ScrollArea className="h-auto max-h-[150px] w-full rounded-md border"><div className="p-2">{vehicleSearchResults.map(v => (<button type="button" key={v.id} onClick={() => handleSelectVehicleFromSearch(v)} className="w-full text-left p-2 rounded-md hover:bg-muted"><p className="font-semibold">{v.licensePlate}</p><p className="text-sm text-muted-foreground">{v.make} {v.model} - {v.ownerName}</p></button>))}</div></ScrollArea>)}
                    {selectedVehicle && (
                      <div className="p-3 border rounded-md bg-amber-50 dark:bg-amber-950/50 text-sm space-y-1">
                        <p className="font-semibold">{selectedVehicle.licensePlate} - {selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.year}</p>
                        <p>Propietario: {selectedVehicle.ownerName} - {selectedVehicle.ownerPhone}</p>
                        <p>Últ. Servicio: {lastService ? `${lastService.mileage ? `${lastService.mileage.toLocaleString('es-ES')} km - ` : ''}${format(parseISO(lastService.serviceDate), "dd MMM yyyy", { locale: es })} - ${lastService.description}` : 'No tiene historial de servicios.'}</p>
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
                            form={form}
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
                </CardContent>
              </Card>
              
              <div className={cn("grid gap-6 items-start", watchedStatus === 'Completado' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                  <div className="space-y-6">
                      {(watchedStatus === 'Reparando' || watchedStatus === 'Completado') && mode === 'service' && (
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
                                    <FormControl><Textarea {...field} disabled={isReadOnly} className="min-h-[100px]"/></FormControl>
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
                                    <FormField control={form.control} name="cardFolio" render={({ field }) => (<FormItem><FormLabel>Folio Tarjeta</FormLabel><FormControl><Input placeholder="Folio de la transacción" {...field} disabled={isReadOnly}/></FormControl></FormItem>)}/>
                                )}
                                {(selectedPaymentMethod === "Transferencia" || selectedPaymentMethod === "Efectivo+Transferencia" || selectedPaymentMethod === "Tarjeta+Transferencia") && (
                                    <FormField control={form.control} name="transferFolio" render={({ field }) => (<FormItem><FormLabel>Folio Transferencia</FormLabel><FormControl><Input placeholder="Referencia de la transferencia" {...field} disabled={isReadOnly}/></FormControl></FormItem>)}/>
                                )}
                            </CardContent>
                          </Card>
                      )}
                      
                      <Card className="bg-card">
                          <CardHeader><CardTitle className="text-lg">Costo del Servicio</CardTitle></CardHeader>
                          <CardContent>
                              <div className="space-y-1 text-sm">
                                  <div className="flex justify-between pt-1"><span className="font-semibold text-blue-600 dark:text-blue-400">Total (IVA Inc.):</span><span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(totalCost)}</span></div>
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
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 items-end">
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
                                                disabled={(date) => date < new Date("1900-01-01")}
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
                            name="serviceDate"
                            render={({ field }) => (
                                <FormItem> <FormLabel>Hora de Recepción</FormLabel>
                                    <Select
                                        value={field.value && isValid(field.value) ? format(field.value, 'HH:mm') : ""}
                                        onValueChange={(timeValue) => {
                                            if (!timeValue) return;
                                            const [hours, minutes] = timeValue.split(':').map(Number);
                                            const currentVal = field.value || new Date();
                                            field.onChange(setMinutes(setHours(currentVal, hours), minutes));
                                        }}
                                        disabled={isReadOnly}
                                    >
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione hora" /></SelectTrigger></FormControl>
                                        <SelectContent>{timeSlots.map(slot => (<SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>))}</SelectContent>
                                    </Select>
                                 </FormItem>
                            )}
                        />
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
                                <FormItem> <FormLabel>Hora de Entrega</FormLabel>
                                <Select
                                  value={field.value && isValid(field.value) ? format(field.value, 'HH:mm') : ""}
                                  onValueChange={(timeValue) => {
                                    if (!timeValue) return;
                                    const [hours, minutes] = timeValue.split(':').map(Number);
                                    const currentVal = field.value || new Date();
                                    field.onChange(setMinutes(setHours(currentVal, hours), minutes));
                                  }}
                                  disabled={isReadOnly}
                                >
                                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccione hora" /></SelectTrigger></FormControl>
                                  <SelectContent>{timeSlots.map(slot => (<SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>))}</SelectContent>
                                </Select>
                                </FormItem>
                            )}
                        />
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
                            <div><Label>Firma de Recepción</Label><div className="mt-2 p-2 h-24 border rounded-md bg-muted/50 flex items-center justify-center">{customerSignatureReception ? (<Image src={customerSignatureReception} alt="Firma de recepción" width={150} height={75} style={{objectFit: 'contain'}}/>) : (<span className="text-sm text-muted-foreground">Pendiente de firma del cliente</span>)}</div></div>
                            <div><Label>Firma de Entrega</Label><div className="mt-2 p-2 h-24 border rounded-md bg-muted/50 flex items-center justify-center">{customerSignatureDelivery ? (<Image src={customerSignatureDelivery} alt="Firma de entrega" width={150} height={75} style={{objectFit: 'contain'}}/>) : (<span className="text-sm text-muted-foreground">Pendiente de firma del cliente</span>)}</div></div>
                        </div>
                    </CardContent>
                  </Card>
              </TabsContent>
            )}
            {showReceptionTab && (
              <TabsContent value="seguridad" className="space-y-6 mt-0">
                  <SafetyChecklist 
                    control={form.control} 
                    isReadOnly={isReadOnly} 
                    onSignatureClick={() => setIsTechSignatureDialogOpen(true)} 
                    signatureDataUrl={technicianSignature}
                    isEnhancingText={isEnhancingText}
                    handleEnhanceText={handleEnhanceText}
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
                
                {mode === 'service' && watchedStatus === 'Completado' && !isReadOnly && initialData?.id && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsTicketPreviewOpen(true)}
                    >
                        <Printer className="mr-2 h-4 w-4" />
                        Ver Comprobante
                    </Button>
                )}
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

      {isQuoteViewOpen && quoteForView && (
        <PrintTicketDialog
            open={isQuoteViewOpen}
            onOpenChange={setIsQuoteViewOpen}
            title={`Cotización: ${quoteForView.id}`}
            dialogContentClassName="printable-quote-dialog"
            onDialogClose={() => setQuoteForView(null)}
            footerActions={
            <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir Cotización
            </Button>
            }
        >
            <QuoteContent
                quote={quoteForView}
                vehicle={localVehicles.find(v => v.id === quoteForView.vehicleId)}
                workshopInfo={quoteForView.workshopInfo}
            />
        </PrintTicketDialog>
      )}

      <VehicleDialog
          open={isVehicleDialogOpen}
          onOpenChange={setIsVehicleDialogOpen}
          onSave={handleSaveNewVehicle}
          vehicle={newVehicleInitialData}
      />
      
      <PrintTicketDialog
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          title="Hoja de Servicio"
          onDialogClose={() => setServiceForSheet(null)}
          dialogContentClassName="printable-quote-dialog"
          footerActions={<><Button type="button" onClick={() => {if (serviceForSheet?.publicId) {const shareUrl = `${window.location.origin}/s/${serviceForSheet.publicId}`; navigator.clipboard.writeText(shareUrl).then(() => {toast({ title: 'Enlace copiado', description: 'El enlace a la hoja de servicio ha sido copiado.' });});} else {toast({ title: 'Error', description: 'Guarde el servicio para generar un enlace.', variant: 'destructive' });}}} variant="outline"><MessageSquare className="mr-2 h-4 w-4" /> Copiar Enlace</Button><Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir Hoja</Button></>}
      >
          {serviceForSheet && (
              <ServiceSheetContent service={serviceForSheet} vehicle={localVehicles.find(v => v.id === serviceForSheet.vehicleId)} workshopInfo={workshopInfo as WorkshopInfo} />
          )}
      </PrintTicketDialog>

      <PrintTicketDialog
        open={isTicketPreviewOpen}
        onOpenChange={setIsTicketPreviewOpen}
        title="Comprobante de Servicio"
        dialogContentClassName="printable-content"
        footerActions={
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopyAsImage}>
                    <Copy className="mr-2 h-4 w-4"/> Copiar Imagen
                </Button>
                <Button onClick={handlePrintTicket}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir Comprobante
                </Button>
            </div>
        }
      >
        <TicketContent 
            ref={ticketContentRef}
            service={form.getValues() as ServiceRecord}
            vehicle={selectedVehicle}
            technician={technicians.find(t => t.id === form.getValues('technicianId'))}
        />
      </PrintTicketDialog>
    </>
  );
}


// Sub-component for a single Service Item card
interface ServiceItemCardProps {
  serviceIndex: number;
  form: ReturnType<typeof useForm<ServiceFormValues>>;
  removeServiceItem: (index: number) => void;
  isReadOnly?: boolean;
  inventoryItems: InventoryItem[];
  mode: 'service' | 'quote';
}

function ServiceItemCard({ serviceIndex, form, removeServiceItem, isReadOnly, inventoryItems, mode }: ServiceItemCardProps) {
    const { control, getValues, setValue } = form;
    const { fields, append, remove, update } = useFieldArray({
        control,
        name: `serviceItems.${serviceIndex}.suppliesUsed`
    });
    const { toast } = useToast();

    const [isAddSupplyDialogOpen, setIsAddSupplyDialogOpen] = useState(false);
    
    const handleAddSupply = (supply: ServiceSupply, sellingPriceToApply?: number) => {
        append(supply);
        
        // If a manual item with a selling price is added, add its price to the service item's total price
        if (sellingPriceToApply !== undefined) {
            const currentItemPrice = getValues(`serviceItems.${serviceIndex}.price`) || 0;
            const priceToAdd = sellingPriceToApply * supply.quantity;
            setValue(`serviceItems.${serviceIndex}.price`, currentItemPrice + priceToAdd, { shouldDirty: true });
        }
        
        setIsAddSupplyDialogOpen(false);
    };

    const handleSupplyQuantityChange = (supplyIndex: number, delta: number) => {
        const supplyPath = `serviceItems.${serviceIndex}.suppliesUsed.${supplyIndex}`;
        const currentSupply = getValues(supplyPath);
        if (!currentSupply) return;

        const newQuantity = currentSupply.quantity + delta;
        if (newQuantity <= 0) return;

        const inventoryItem = inventoryItems.find(item => item.id === currentSupply.supplyId);

        if (inventoryItem && !inventoryItem.isService && newQuantity > inventoryItem.quantity) {
            toast({
                title: 'Stock Insuficiente',
                description: `Solo hay ${inventoryItem.quantity} de ${inventoryItem.name} en inventario.`,
                variant: 'destructive'
            });
            return;
        }

        setValue(`${supplyPath}.quantity`, newQuantity, { shouldDirty: true });
    };

    return (
        <Card className="p-4 bg-muted/30">
            <div className="flex justify-between items-start mb-4">
                <h4 className="text-base font-semibold">Trabajo a Realizar #{serviceIndex + 1}</h4>
                {!isReadOnly && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeServiceItem(serviceIndex)}><Trash2 className="h-4 w-4"/></Button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name={`serviceItems.${serviceIndex}.name`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Servicio</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Afinación Mayor"
                                    {...field}
                                    disabled={isReadOnly}
                                    onChange={(e) => field.onChange(capitalizeWords(e.target.value))}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField control={control} name={`serviceItems.${serviceIndex}.price`} render={({ field }) => ( <FormItem><FormLabel>Precio Cliente (IVA Inc.)</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl></FormItem> )}/>
            </div>

            <div className="mt-4">
                <h5 className="text-sm font-medium mb-2">Insumos para este Servicio</h5>
                <div className="space-y-2">
                    {fields.map((supplyField, supplyIndex) => (
                        <div key={supplyField.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                            <div className="flex-1">
                                <p className="text-xs font-medium">{supplyField.supplyName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {`Costo: ${formatCurrency(supplyField.unitPrice)}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleSupplyQuantityChange(supplyIndex, -1)} disabled={isReadOnly}>
                                    <Minus className="h-3 w-3" />
                                </Button>
                                <FormField
                                    control={control}
                                    name={`serviceItems.${serviceIndex}.suppliesUsed.${supplyIndex}.quantity`}
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            step="any"
                                            min="0.001"
                                            {...field}
                                            className="w-16 text-center h-7 text-sm"
                                            disabled={isReadOnly}
                                        />
                                    )}
                                />
                                <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleSupplyQuantityChange(supplyIndex, 1)} disabled={isReadOnly}>
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                            <span className="text-sm w-12 text-center">{supplyField.unitType === 'ml' ? 'ml' : supplyField.unitType === 'liters' ? 'L' : 'uds.'}</span>
                            {!isReadOnly && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(supplyIndex)}><Trash2 className="h-4 w-4"/></Button>}
                        </div>
                    ))}
                    {!isReadOnly && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsAddSupplyDialogOpen(true) }>
                            <Plus className="mr-2 h-4 w-4"/> Añadir Insumo
                        </Button>
                    )}
                </div>
            </div>
             <AddSupplyDialog
                open={isAddSupplyDialogOpen}
                onOpenChange={setIsAddSupplyDialogOpen}
                inventoryItems={inventoryItems}
                onAddSupply={handleAddSupply}
            />
        </Card>
    );
}


// Sub-component for nested supplies array (in price list form)
function ServiceSuppliesArray({ serviceIndex, control }: { serviceIndex: number; control: Control<PriceListFormValues> }) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `services.${serviceIndex}.supplies`
    });

    return (
        <div className="space-y-3">
             {fields.map((supplyField, supplyIndex) => (
                <div key={supplyField.id} className="grid grid-cols-1 md:grid-cols-10 gap-2 items-end">
                    <FormField control={control} name={`services.${serviceIndex}.supplies.${supplyIndex}.name`} render={({ field }) => ( <FormItem className="col-span-10 md:col-span-3"><FormLabel className="text-xs">Nombre</FormLabel><FormControl><Input placeholder="Aceite Sintético 5W-30" {...field} /></FormControl></FormItem> )}/>
                    <FormField control={control} name={`services.${serviceIndex}.supplies.${supplyIndex}.quantity`} render={({ field }) => ( <FormItem className="col-span-5 md:col-span-2"><FormLabel className="text-xs">Cant.</FormLabel><FormControl><Input type="number" placeholder="4.5" {...field} value={field.value ?? ''} /></FormControl></FormItem> )}/>
                    <FormField control={control} name={`services.${serviceIndex}.supplies.${supplyIndex}.cost`} render={({ field }) => ( <FormItem className="col-span-5 md:col-span-2"><FormLabel className="text-xs">Costo</FormLabel><FormControl><Input type="number" step="0.01" placeholder="150.00" {...field} value={field.value ?? ''} /></FormControl></FormItem> )}/>
                    <FormField control={control} name={`services.${serviceIndex}.supplies.${supplyIndex}.supplier`} render={({ field }) => ( <FormItem className="col-span-10 md:col-span-2"><FormLabel className="text-xs">Proveedor</FormLabel><FormControl><Input placeholder="Refaccionaria GDL" {...field} /></FormControl></FormItem> )}/>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 md:col-span-1 col-span-10 md:self-end" onClick={() => remove(supplyIndex)}>
                        <Trash2 className="h-4 w-4 text-destructive"/>
                    </Button>
                </div>
             ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', cost: undefined, quantity: 1, supplier: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Insumo
            </Button>
        </div>
    );
}

const inspectionGroups = [
  { title: "LUCES", items: [
    { name: "safetyInspection.luces_altas_bajas_niebla", label: "1. ALTAS, BAJAS Y NIEBLA" },
    { name: "safetyInspection.luces_cuartos", label: "2. CUARTOS DELANTEROS, TRASEROS Y LATERALES" },
    { name: "safetyInspection.luces_direccionales", label: "3. DIRECCIONALES E INTERMITENTES" },
    { name: "safetyInspection.luces_frenos_reversa", label: "4. FRENOS Y REVERSA" },
    { name: "safetyInspection.luces_interiores", label: "5. INTERIORES" },
  ]},
  { title: "FUGAS Y NIVELES", items: [
    { name: "safetyInspection.fugas_refrigerante", label: "6. REFRIGERANTE" },
    { name: "safetyInspection.fugas_limpiaparabrisas", label: "7. LIMPIAPARABRISAS" },
    { name: "safetyInspection.fugas_frenos_embrague", label: "8. FRENOS Y EMBRAGUE" },
    { name: "safetyInspection.fugas_transmision", label: "9. TRANSMISIÓN Y TRANSEJE" },
    { name: "safetyInspection.fugas_direccion_hidraulica", label: "10. DIRECCIÓN HIDRÁULICA" },
  ]},
  { title: "CARROCERÍA", items: [
    { name: "safetyInspection.carroceria_cristales_espejos", label: "11. CRISTALES / ESPEJOS" },
    { name: "safetyInspection.carroceria_puertas_cofre", label: "12. PUERTAS / COFRE / CAJUELA / SALPICADERA" },
    { name: "safetyInspection.carroceria_asientos_tablero", label: "13. ASIENTOS / TABLERO / CONSOLA" },
    { name: "safetyInspection.carroceria_plumas", label: "14. PLUMAS LIMPIAPARABRISAS" },
  ]},
  { title: "SUSPENSIÓN Y DIRECCIÓN", items: [
    { name: "safetyInspection.suspension_rotulas", label: "15. RÓTULAS Y GUARDAPOLVOS" },
    { name: "safetyInspection.suspension_amortiguadores", label: "16. AMORTIGUADORES" },
    { name: "safetyInspection.suspension_caja_direccion", label: "17. CAJA DE DIRECCIÓN" },
    { name: "safetyInspection.suspension_terminales", label: "18. TERMINALES DE DIRECCIÓN" },
  ]},
  { title: "LLANTAS (ESTADO Y PRESIÓN)", items: [
    { name: "safetyInspection.llantas_delanteras_traseras", label: "19. DELANTERAS / TRASERAS" },
    { name: "safetyInspection.llantas_refaccion", label: "20. REFACCIÓN" },
  ]},
  { title: "FRENOS", items: [
    { name: "safetyInspection.frenos_discos_delanteros", label: "21. DISCOS / BALATAS DELANTERAS" },
    { name: "safetyInspection.frenos_discos_traseros", label: "22. DISCOS / BALATAS TRASERAS" },
  ]},
  { title: "OTROS", items: [
    { name: "safetyInspection.otros_tuberia_escape", label: "23. TUBERÍA DE ESCAPE" },
    { name: "safetyInspection.otros_soportes_motor", label: "24. SOPORTES DE MOTOR" },
    { name: "safetyInspection.otros_claxon", label: "25. CLAXON" },
    { name: "safetyInspection.otros_inspeccion_sdb", label: "26. INSPECCIÓN DE SDB" },
  ]},
];


const SafetyChecklist = ({ control, isReadOnly, onSignatureClick, signatureDataUrl, isEnhancingText, handleEnhanceText }: { 
  control: Control<ServiceFormValues>; 
  isReadOnly?: boolean; 
  onSignatureClick: () => void;
  signatureDataUrl?: string;
  isEnhancingText: string | null;
  handleEnhanceText: (fieldName: 'notes' | 'vehicleConditions' | 'safetyInspection.inspectionNotes') => void;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist de Puntos de Seguridad</CardTitle>
        <CardDescription>Documenta el estado de los componentes clave.</CardDescription>
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-green-500" /><span>Bien</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-yellow-400" /><span>Requiere Atención</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-red-500" /><span>Requiere Reparación Inmediata</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {inspectionGroups.map(group => (
            <div key={group.title}>
              <h4 className="font-bold text-base mb-2 border-b-2 border-primary pb-1">{group.title}</h4>
              <div className="space-y-1">
                {group.items.map(item => (
                  <SafetyCheckRow key={item.name} name={item.name} label={item.label} control={control} isReadOnly={isReadOnly} />
                ))}
              </div>
            </div>
          ))}
        </div>
         <FormField
            control={control}
            name="safetyInspection.inspectionNotes"
            render={({ field }) => (
                <FormItem className="pt-4">
                    <FormLabel className="text-base font-semibold flex justify-between items-center w-full">
                      <span>Observaciones Generales de la Inspección</span>
                      {!isReadOnly && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText('safetyInspection.inspectionNotes')} disabled={isEnhancingText === 'safetyInspection.inspectionNotes' || !field.value}>
                            {isEnhancingText === 'safetyInspection.inspectionNotes' ? <Loader2 className="animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                            <span className="ml-2 hidden sm:inline">Mejorar texto</span>
                        </Button>
                      )}
                    </FormLabel>
                    <FormControl>
                        <Textarea
                            placeholder="Anotaciones sobre la inspección, detalles de los puntos que requieren atención, etc."
                            className="min-h-[100px]"
                            disabled={isReadOnly}
                            {...field}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
        <div>
            <FormLabel className="text-base font-semibold">Firma del Técnico</FormLabel>
            <div className="mt-2 p-2 min-h-[100px] border rounded-md bg-muted/50 flex items-center justify-center">
                {signatureDataUrl ? (
                    <div className="relative w-full h-full max-w-[200px] aspect-video">
                        <Image src={signatureDataUrl} alt="Firma del técnico" layout="fill" objectFit="contain" />
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground">Firma pendiente</span>
                )}
            </div>
            {!isReadOnly && (
                <Button type="button" variant="outline" onClick={onSignatureClick} className="w-full mt-2">
                    <Signature className="mr-2 h-4 w-4" />
                    {signatureDataUrl ? 'Cambiar Firma' : 'Capturar Firma del Técnico'}
                </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
};


const SafetyCheckRow = ({ name, label, control, isReadOnly }: { name: string; label: string; control: Control<ServiceFormValues>; isReadOnly?: boolean; }) => {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-none">
      <span className="text-sm font-medium pr-4">{label}</span>
      <Controller
        name={name as any}
        control={control}
        defaultValue="na"
        render={({ field }) => (
          <div className="flex gap-2">
            {[
              { value: 'inmediata', color: 'bg-red-500', title: 'Requiere Reparación Inmediata' },
              { value: 'atencion', color: 'bg-yellow-400', title: 'Requiere Atención' },
              { value: 'ok', color: 'bg-green-500', title: 'Bien' },
            ].map(status => (
              <button
                type="button"
                key={status.value}
                title={status.title}
                onClick={() => !isReadOnly && field.onChange(status.value)}
                disabled={isReadOnly}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-all",
                  field.value === status.value ? 'border-black dark:border-white scale-110' : 'border-transparent opacity-50',
                  isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-100'
                )}
              >
                <div className={cn("h-full w-full rounded-full flex items-center justify-center", status.color)}>
                    {field.value === status.value && <Check className="h-4 w-4 text-white" />}
                </div>
              </button>
            ))}
          </div>
        )}
      />
    </div>
  );
};

    
