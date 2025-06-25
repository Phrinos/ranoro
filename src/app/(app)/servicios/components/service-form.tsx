

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray, Control } from "react-hook-form";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import { CalendarIcon, PlusCircle, Search, Trash2, AlertCircle, Car as CarIcon, Clock, DollarSign, PackagePlus, BrainCircuit, Loader2, Printer, Plus, Minus, FileText, Signature, MessageSquare, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, setHours, setMinutes, isValid, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, ServiceSupply, QuoteRecord, InventoryCategory, Supplier, User, WorkshopInfo, ServiceItem } from "@/types";
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
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { ServiceSheetContent } from '@/components/service-sheet-content';
import { Checkbox } from "@/components/ui/checkbox";
import Image from 'next/image';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@root/lib/firebaseClient.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddSupplyDialog } from './add-supply-dialog';


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


const serviceFormSchemaBase = z.object({
  id: z.string().optional(), // For identifying existing records
  publicId: z.string().optional(),
  vehicleId: z.string({required_error: "Debe seleccionar o registrar un vehículo."}).min(1, "Debe seleccionar o registrar un vehículo.").optional(),
  vehicleLicensePlateSearch: z.string().optional(),
  serviceDate: z.date({ required_error: "La fecha es obligatoria." }).optional(),
  quoteDate: z.date().optional(), // For quote mode
  mileage: z.coerce.number().int().min(0, "El kilometraje no puede ser negativo.").optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  technicianId: z.string().optional(),
  serviceItems: z.array(serviceItemSchema).min(1, "Debe agregar al menos un ítem de servicio."),
  status: z.enum(["Cotizacion", "Agendado", "Reparando", "Completado", "Cancelado"]).optional(),
  serviceType: z.enum(["Servicio General", "Cambio de Aceite", "Pintura"]).optional(),
  deliveryDateTime: z.date().optional(),
  vehicleConditions: z.string().optional(),
  fuelLevel: z.string().optional(),
  customerItems: z.string().optional(),
  customerSignatureReception: z.string().optional(),
  customerSignatureDelivery: z.string().optional(),
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
  const [lastServiceInfo, setLastServiceInfo] = useState<string | null>(null);
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
  
  const freshUserRef = useRef<User | null>(null);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchemaBase),
    // This defaultValues block will be overridden by useEffect, but it's good practice.
    defaultValues: {
        id: initialData?.id || undefined,
        vehicleId: initialData?.vehicleId || undefined,
        vehicleLicensePlateSearch: initialVehicleIdentifier || "",
        serviceDate: undefined,
        mileage: initialData?.mileage || undefined,
        description: (initialData as any)?.description || "",
        notes: initialData?.notes || "",
        technicianId: (initialData as ServiceRecord)?.technicianId || (initialData as QuoteRecord)?.preparedByTechnicianId || "",
        serviceItems: [],
        status: mode === 'service' ? ((initialData as ServiceRecord)?.status || 'Agendado') : 'Cotizacion',
        serviceType: mode === 'service' ? ((initialData as ServiceRecord)?.serviceType || 'Servicio General') : undefined,
        deliveryDateTime: undefined,
        vehicleConditions: (initialData as ServiceRecord)?.vehicleConditions || "",
        fuelLevel: (initialData as ServiceRecord)?.fuelLevel || undefined,
        customerItems: (initialData as ServiceRecord)?.customerItems || '',
        customerSignatureReception: (initialData as ServiceRecord)?.customerSignatureReception || undefined,
        customerSignatureDelivery: (initialData as ServiceRecord)?.customerSignatureDelivery || undefined,
    }
  });

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
                const lastService = vehicleServices[0];
                setLastServiceInfo(`Últ. Servicio: ${format(parseISO(lastService.serviceDate), "dd MMM yyyy", { locale: es })} - ${lastService.description}`);
            } else {
                setLastServiceInfo("No tiene historial de servicios.");
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
        const parsedServiceDate = rawServiceDate ? parseISO(rawServiceDate) : undefined;
        
        const rawDeliveryDate = (data as ServiceRecord)?.deliveryDateTime;
        const parsedDeliveryDate = rawDeliveryDate ? parseISO(rawDeliveryDate) : undefined;

        const dataToReset: Partial<ServiceFormValues> = {
            id: data.id,
            publicId: (data as ServiceRecord)?.publicId || (data as QuoteRecord)?.publicId,
            vehicleId: data.vehicleId ? String(data.vehicleId) : undefined,
            vehicleLicensePlateSearch: vehicle?.licensePlate || data.vehicleIdentifier || "",
            serviceDate: parsedServiceDate && isValid(parsedServiceDate) ? parsedServiceDate : undefined,
            deliveryDateTime: parsedDeliveryDate && isValid(parsedDeliveryDate) ? parsedDeliveryDate : undefined,
            mileage: data.mileage || undefined,
            description: (data as any).description || "",
            notes: data.notes || "",
            technicianId: (data as ServiceRecord)?.technicianId || (data as QuoteRecord)?.preparedByTechnicianId || undefined,
            status: mode === 'service' ? ((data as ServiceRecord)?.status || 'Agendado') : 'Cotizacion',
            serviceType: mode === 'service' ? ((data as ServiceRecord)?.serviceType || 'Servicio General') : undefined,
            vehicleConditions: (data as ServiceRecord)?.vehicleConditions || "",
            fuelLevel: (data as ServiceRecord)?.fuelLevel || undefined,
            customerItems: (data as ServiceRecord)?.customerItems || '',
            customerSignatureReception: (data as ServiceRecord)?.customerSignatureReception || undefined,
            customerSignatureDelivery: (data as ServiceRecord)?.customerSignatureDelivery || undefined,
            serviceItems: serviceItemsData
        };

        form.reset(dataToReset);
    } else {
      // Set default for new forms
      form.setValue('serviceDate', setHours(setMinutes(new Date(), 30), 8));
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

  const watchedStatus = form.watch("status");
  const customerSignatureReception = form.watch("customerSignatureReception");
  const customerSignatureDelivery = form.watch("customerSignatureDelivery");

  const showReceptionTab = useMemo(() => {
    if (mode !== 'service') return false;
    if (!watchedStatus || watchedStatus === 'Cotizacion' || watchedStatus === 'Agendado') {
        return false;
    }
    return true;
  }, [mode, watchedStatus]);


  const previousStatusRef = useRef<ServiceRecord['status']>();

  useEffect(() => {
      if (isReadOnly || mode !== 'service') return;

      const previousStatus = previousStatusRef.current;
      
      if (previousStatus !== 'Reparando' && watchedStatus === 'Reparando') {
          form.setValue('serviceDate', new Date(), { shouldDirty: true });
      }
      
      if (previousStatus !== 'Completado' && watchedStatus === 'Completado') {
          form.setValue('deliveryDateTime', new Date(), { shouldDirty: true });
      }
      
      previousStatusRef.current = watchedStatus;

  }, [watchedStatus, form, isReadOnly, mode]);


  const watchedServiceItems = form.watch("serviceItems");

  const totalCost = useMemo(() => {
    return watchedServiceItems?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
  }, [watchedServiceItems]);
  
  const totalSuppliesWorkshopCost = useMemo(() => {
    return watchedServiceItems?.flatMap(item => item.suppliesUsed).reduce((sum, supply) => {
        const item = currentInventoryItems.find(i => i.id === supply.supplyId);
        const costPerUnit = item?.unitPrice || supply.unitPrice || 0;
        return sum + costPerUnit * supply.quantity;
    }, 0) || 0;
  }, [watchedServiceItems, currentInventoryItems]);

  const serviceProfit = useMemo(() => {
    const totalCostBeforeTax = totalCost / (1 + IVA_RATE) || 0;
    return totalCostBeforeTax - totalSuppliesWorkshopCost;
  }, [totalCost, totalSuppliesWorkshopCost]);


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
      form.setValue('vehicleId', undefined, { shouldValidate: true });
      setVehicleNotFound(true);
      setLastServiceInfo(null);
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
    setLastServiceInfo("Vehículo nuevo, sin historial de servicios.");
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
      await setDoc(publicDocRef, fullPublicData);
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
        toast({ title: "Formulario Incompleto", description: "Por favor, revise los campos marcados en rojo.", variant: "destructive"});
        return;
    }

    const finalTotalCost = values.serviceItems?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
    const finalTotalSuppliesCost = values.serviceItems?.flatMap(item => item.suppliesUsed).reduce((sum, supply) => {
        const item = currentInventoryItems.find(i => i.id === supply.supplyId);
        const costPerUnit = item?.unitPrice || supply.unitPrice || 0;
        return sum + costPerUnit * supply.quantity;
    }, 0) || 0;
    const finalSubTotal = finalTotalCost / (1 + IVA_RATE);
    const finalTaxAmount = finalTotalCost - finalSubTotal;
    const finalProfit = finalTotalCost - finalTotalSuppliesCost;
    const compositeDescription = values.serviceItems.map(item => item.name).join(', ') || 'Servicio';
    
    const isConvertingQuoteToService = mode === 'quote' && values.status && values.status !== 'Cotizacion';

    if (mode === 'service' || isConvertingQuoteToService) {
      const serviceData: Partial<ServiceRecord> = {
        id: initialData?.id || `SER_${Date.now().toString(36)}`,
        publicId: values.publicId || `srv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`,
        vehicleId: vehicleIdToSave,
        serviceDate: values.serviceDate!.toISOString(),
        description: compositeDescription,
        technicianId: values.technicianId || '',
        status: values.status || 'Agendado',
        totalCost: finalTotalCost,
        serviceAdvisorId: currentUser.id,
        serviceItems: values.serviceItems,
      };

      serviceData.vehicleIdentifier = selectedVehicle?.licensePlate || values.vehicleLicensePlateSearch || 'N/A';
      serviceData.technicianName = technicians.find(t => t.id === values.technicianId)?.name || 'N/A';
      serviceData.subTotal = finalSubTotal;
      serviceData.taxAmount = finalTaxAmount;
      serviceData.totalSuppliesCost = finalTotalSuppliesCost;
      serviceData.serviceProfit = finalProfit;
      serviceData.serviceAdvisorName = currentUser.name;
      
      if (currentUser.signatureDataUrl) serviceData.serviceAdvisorSignatureDataUrl = currentUser.signatureDataUrl;
      if (values.customerSignatureReception) serviceData.customerSignatureReception = values.customerSignatureReception;
      if (values.customerSignatureDelivery) serviceData.customerSignatureDelivery = values.customerSignatureDelivery;
      if (values.serviceType) serviceData.serviceType = values.serviceType;
      if (values.mileage) serviceData.mileage = values.mileage;
      if (values.notes) serviceData.notes = values.notes;
      if (values.vehicleConditions) serviceData.vehicleConditions = values.vehicleConditions;
      if (values.fuelLevel) serviceData.fuelLevel = values.fuelLevel;
      if (values.customerItems) serviceData.customerItems = values.customerItems;
      if (values.deliveryDateTime) serviceData.deliveryDateTime = values.deliveryDateTime.toISOString();
      if (workshopInfo && Object.keys(workshopInfo).length > 0) serviceData.workshopInfo = workshopInfo as WorkshopInfo;

      await savePublicDocument('service', serviceData as ServiceRecord, selectedVehicle);
      await onSubmit(serviceData as ServiceRecord);

    } else { // mode === 'quote'
      const quoteData: Partial<QuoteRecord> = {
        id: (initialDataQuote as QuoteRecord)?.id || `COT_${Date.now().toString(36)}`,
        publicId: (initialDataQuote as QuoteRecord)?.publicId || `cot_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`,
        quoteDate: values.serviceDate!.toISOString(),
        vehicleId: vehicleIdToSave,
        description: compositeDescription,
        serviceItems: values.serviceItems,
        status: 'Cotizacion' // Always Cotizacion if not converting
      };
      
      quoteData.vehicleIdentifier = selectedVehicle?.licensePlate || values.vehicleLicensePlateSearch || 'N/A';
      quoteData.preparedByTechnicianId = currentUser.id;
      quoteData.preparedByTechnicianName = currentUser.name;
      quoteData.estimatedTotalCost = finalTotalCost;
      quoteData.estimatedSubTotal = finalSubTotal;
      quoteData.estimatedTaxAmount = finalTaxAmount;
      quoteData.estimatedTotalSuppliesCost = finalTotalSuppliesCost;
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

  const handleTimeChange = (timeString: string, dateField: "serviceDate" | "deliveryDateTime") => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const currentDate = form.getValues(dateField) || new Date();
    const newDateTime = setHours(setMinutes(startOfDay(currentDate), minutes), hours);
    form.setValue(dateField, newDateTime, { shouldValidate: true });
  };

  const formatCurrency = (amount: number | undefined) => {
      if (amount === undefined) return '$0.00';
      return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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
            const lastService = vehicleServices[0];
            setLastServiceInfo(`Últ. Servicio: ${format(parseISO(lastService.serviceDate), "dd MMM yyyy", { locale: es })} - ${lastService.description}`);
        } else {
            setLastServiceInfo("No tiene historial de servicios.");
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
  
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);

  const handleConfirmDelete = () => {
    if (onDelete && mode === 'quote' && initialDataQuote?.id) {
      onDelete(initialDataQuote.id);
      onClose();
    } else if (onCancelService && initialDataService?.id) {
      if (!cancellationReason.trim()) {
        toast({ title: "Motivo Requerido", description: "Por favor, ingrese un motivo para la cancelación.", variant: "destructive" });
        return;
      }
      onCancelService(initialDataService.id, cancellationReason);
      setIsCancelAlertOpen(false);
      onClose();
    }
  };

  const deleteButtonText = mode === 'quote'
    ? 'Eliminar Cotización'
    : (initialDataService?.status === 'Agendado' ? 'Cancelar Servicio Agendado' : 'Cancelar Servicio');

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

  const cardTitleText = mode === 'quote' ? "Información de la Cotización" : "Información del Servicio";
  const isDateDisabled = isConvertingQuote ? false : (isReadOnly || mode === 'service' && !!initialDataService?.id);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <Tabs defaultValue="servicio" className="w-full">
            <div className="flex justify-between items-center mb-4 border-b">
                <TabsList className="bg-transparent p-0">
                    <TabsTrigger value="servicio" className="text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Detalles del Servicio</TabsTrigger>
                    {showReceptionTab && <TabsTrigger value="recepcion" className="text-base data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Recepción y Entrega</TabsTrigger>}
                </TabsList>
                 {mode === 'service' && !isReadOnly && (
                    <Button type="button" onClick={handlePrintSheet} variant="outline" className="bg-card">
                        <Printer className="mr-2 h-4 w-4" /> Ver Hoja de Servicio
                    </Button>
                )}
            </div>

            <TabsContent value="servicio" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{cardTitleText}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {showStatusFields && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-bold">Estado</FormLabel>
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
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {mode === 'service' && watchedStatus !== 'Agendado' && watchedStatus !== 'Cotizacion' &&
                            <FormField
                                control={form.control}
                                name="technicianId"
                                render={({ field }) => (<FormItem><FormLabel>Técnico Asignado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un técnico" /></SelectTrigger></FormControl><SelectContent>{technicians.map((technician) => (<SelectItem key={technician.id} value={technician.id}>{technician.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                        }
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <FormField control={form.control} name="vehicleLicensePlateSearch" render={({ field }) => (<FormItem className="w-full"><FormLabel>Placa del Vehículo</FormLabel><FormControl><Input placeholder="Buscar/Ingresar Placas" {...field} value={vehicleLicensePlateSearch} onChange={(e) => {setVehicleLicensePlateSearch(e.target.value.toUpperCase()); field.onChange(e.target.value.toUpperCase());}} disabled={isReadOnly} className="uppercase" onKeyDown={handleVehiclePlateKeyDown} /></FormControl></FormItem>)}/>
                      <FormField control={form.control} name="mileage" render={({ field }) => ( <FormItem><FormLabel>Kilometraje (Opcional)</FormLabel><FormControl><Input type="number" placeholder="Ej: 55000 km" {...field} disabled={isReadOnly} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                     <FormField control={form.control} name="serviceDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha y Hora del Servicio Agendado</FormLabel><Popover><PopoverTrigger asChild disabled={isDateDisabled}><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")} disabled={isDateDisabled}>{field.value && isValid(field.value) ? (format(field.value, "PPPp", { locale: es })) : (<span>Seleccione fecha y hora</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => { const currentTime = field.value || setHours(setMinutes(new Date(), 30), 8); const newDateTime = date ? setHours(setMinutes(startOfDay(date), currentTime.getMinutes()), currentTime.getHours()) : undefined; field.onChange(newDateTime);}} disabled={(date) => date < new Date("1900-01-01") || (isReadOnly && mode === 'service')} initialFocus locale={es}/><div className="p-2 border-t"><Select value={field.value ? `${String(field.value.getHours()).padStart(2, '0')}:${String(field.value.getMinutes()).padStart(2, '0')}` : "08:30"} onValueChange={(timeValue) => handleTimeChange(timeValue, "serviceDate")} disabled={isDateDisabled}><SelectTrigger><SelectValue placeholder="Seleccione hora" /></SelectTrigger><SelectContent>{timeSlots.map(slot => (<SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>))}</SelectContent></Select></div></PopoverContent></Popover><FormMessage /></FormItem>)}/>

                    <FormField control={form.control} name="vehicleId" render={() => ( <FormMessage /> )}/>
                    {vehicleSearchResults.length > 0 && ( <ScrollArea className="h-auto max-h-[150px] w-full rounded-md border"><div className="p-2">{vehicleSearchResults.map(v => (<button type="button" key={v.id} onClick={() => handleSelectVehicleFromSearch(v)} className="w-full text-left p-2 rounded-md hover:bg-muted"><p className="font-semibold">{v.licensePlate}</p><p className="text-sm text-muted-foreground">{v.make} {v.model} - {v.ownerName}</p></button>))}</div></ScrollArea>)}
                    {selectedVehicle && (<div className="p-3 border rounded-md bg-amber-50 dark:bg-amber-950/50 text-sm space-y-1"><p><strong>Vehículo Seleccionado:</strong> {selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.year} (<span className="font-bold">{selectedVehicle.licensePlate}</span>)</p><p><strong>Propietario:</strong> {selectedVehicle.ownerName}</p>{lastServiceInfo && (<p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">{lastServiceInfo}</p>)}</div>)}
                    {vehicleNotFound && !selectedVehicle && !isReadOnly && (<div className="p-3 border border-orange-500 rounded-md bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 text-sm flex flex-col sm:flex-row items-center justify-between gap-2"><div className="flex items-center gap-2"><AlertCircle className="h-5 w-5 shrink-0"/><p>Vehículo con placa "{vehicleLicensePlateSearch}" no encontrado.</p></div><Button type="button" size="sm" variant="outline" onClick={() => {setNewVehicleInitialData({ licensePlate: vehicleLicensePlateSearch }); setIsVehicleDialogOpen(true);}} className="w-full sm:w-auto"><CarIcon className="mr-2 h-4 w-4"/> Registrar Nuevo Vehículo</Button></div>)}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4">
                        <FormField control={form.control} name="notes" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                              <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                              <FormControl><Textarea placeholder={mode === 'quote' ? "Ej: Validez de la cotización, condiciones..." : "Notas internas o para el cliente..."} {...field} disabled={isReadOnly} className="min-h-[100px]"/></FormControl>
                              <FormMessage />
                          </FormItem>
                        )}/>
                    </div>
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

              <Card className="bg-card">
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600"/>Resumen Financiero</CardTitle></CardHeader>
                  <CardContent>
                      <div className="flex justify-end">
                          <div className="w-full max-w-md space-y-1 text-lg">
                              <div className="flex justify-between pt-1"><span className="font-bold text-blue-600 dark:text-blue-400">Total del Servicio (IVA Inc.):</span><span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(totalCost)}</span></div>
                              <div className="flex justify-between"><span>(-) Costo Insumos (Taller):</span><span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(totalSuppliesWorkshopCost)}</span></div>
                              <hr className="my-2 border-dashed"/>
                              <div className="flex justify-between font-bold text-green-700 dark:text-green-400"><span>(=) Ganancia Estimada:</span><span>{formatCurrency(serviceProfit)}</span></div>
                          </div>
                      </div>
                  </CardContent>
              </Card>

            </TabsContent>

            {showReceptionTab && (
              <TabsContent value="recepcion" className="space-y-6 mt-0">
                <Card>
                  <CardHeader><CardTitle>Fechas y Horarios</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 items-end">
                      <FormField control={form.control} name="serviceDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha y Hora del Servicio Agendado</FormLabel><Popover><PopoverTrigger asChild disabled={isReadOnly && mode === 'service'}><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")} disabled={isReadOnly && mode === 'service'}>{field.value && isValid(field.value) ? (format(field.value, "PPPp", { locale: es })) : (<span>Seleccione fecha y hora</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => { const currentTime = field.value || setHours(setMinutes(new Date(), 30), 8); const newDateTime = date ? setHours(setMinutes(startOfDay(date), currentTime.getMinutes()), currentTime.getHours()) : undefined; field.onChange(newDateTime);}} disabled={(date) => date < new Date("1900-01-01") || (isReadOnly && mode === 'service') } initialFocus locale={es}/><div className="p-2 border-t"><Select value={field.value ? `${String(field.value.getHours()).padStart(2, '0')}:${String(field.value.getMinutes()).padStart(2, '0')}` : "08:30"} onValueChange={(timeValue) => handleTimeChange(timeValue, "serviceDate")} disabled={isReadOnly && mode === 'service'}><SelectTrigger><SelectValue placeholder="Seleccione hora" /></SelectTrigger><SelectContent>{timeSlots.map(slot => (<SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>))}</SelectContent></Select></div></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                      <FormField control={form.control} name="deliveryDateTime" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Fecha y Hora de Entrega</FormLabel><Popover><PopoverTrigger asChild disabled={isReadOnly}><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")} disabled={isReadOnly}>{field.value && isValid(field.value) ? (format(field.value, "PPPp", { locale: es })) : (<span>Seleccione fecha y hora</span>)}<Clock className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => { const currentTime = field.value || new Date(); const newDateTime = date ? setHours(setMinutes(startOfDay(date), currentTime.getMinutes()), currentTime.getHours()): undefined; field.onChange(newDateTime);}} disabled={isReadOnly} initialFocus locale={es}/><div className="p-2 border-t"><Select value={field.value ? `${String(field.value.getHours()).padStart(2, '0')}:${String(field.value.getMinutes()).padStart(2, '0')}` : "08:30"} onValueChange={(timeValue) => handleTimeChange(timeValue, "deliveryDateTime")} disabled={isReadOnly}><SelectTrigger><SelectValue placeholder="Seleccione hora" /></SelectTrigger><SelectContent>{timeSlots.map(slot => (<SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>))}</SelectContent></Select></div></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Condiciones de la Unidad y Firmas</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                      <FormField control={form.control} name="vehicleConditions" render={({ field }) => (<FormItem><FormLabel>Condiciones del Vehículo (al recibir)</FormLabel><FormControl><Textarea placeholder="Ej: Rayón en puerta del conductor, llanta trasera derecha baja, etc." {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)}/>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="fuelLevel" render={({ field }) => (<FormItem><FormLabel>Nivel de Combustible</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar nivel..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Vacío">Vacío</SelectItem><SelectItem value="1/8">1/8</SelectItem><SelectItem value="1/4">1/4</SelectItem><SelectItem value="3/8">3/8</SelectItem><SelectItem value="1/2">1/2</SelectItem><SelectItem value="5/8">5/8</SelectItem><SelectItem value="3/4">3/4</SelectItem><SelectItem value="7/8">7/8</SelectItem><SelectItem value="Lleno">Lleno</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                          <FormField control={form.control} name="customerItems" render={({ field }) => (<FormItem><FormLabel>Pertenencias del Cliente (Opcional)</FormLabel><FormControl><Textarea placeholder="Ej: Gato, llanta de refacción, cargador de celular en la guantera, etc." {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)}/>
                      </div>
                      <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div><Label>Firma de Recepción</Label><div className="mt-2 p-2 h-24 border rounded-md bg-muted/50 flex items-center justify-center">{customerSignatureReception ? (<Image src={customerSignatureReception} alt="Firma de recepción" width={150} height={75} style={{objectFit: 'contain'}}/>) : (<span className="text-sm text-muted-foreground">Pendiente de firma del cliente</span>)}</div></div>
                          <div><Label>Firma de Entrega</Label><div className="mt-2 p-2 h-24 border rounded-md bg-muted/50 flex items-center justify-center">{customerSignatureDelivery ? (<Image src={customerSignatureDelivery} alt="Firma de entrega" width={150} height={75} style={{objectFit: 'contain'}}/>) : (<span className="text-sm text-muted-foreground">Pendiente de firma del cliente</span>)}</div></div>
                      </div>
                  </CardContent>
                </Card>

              </TabsContent>
            )}
          </Tabs>

          <div className="flex justify-between items-center pt-4">
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
                          {mode === 'service' && (
                            <div className="mt-4">
                              <Label htmlFor="cancellation-reason" className="text-left font-semibold">Motivo de la cancelación (obligatorio)</Label>
                              <Textarea id="cancellation-reason" value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} placeholder="Ej: El cliente no se presentó..." className="mt-2" />
                            </div>
                          )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCancellationReason('')}>No, volver</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} disabled={mode === 'service' && !cancellationReason.trim()} className="bg-destructive hover:bg-destructive/90">
                           Sí, proceder
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
              <ServiceSheetContent service={serviceForSheet} vehicle={localVehicles.find(v => v.id === serviceForSheet.id)} workshopInfo={workshopInfo as WorkshopInfo} />
          )}
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
            const currentItemPrice = form.getValues(`serviceItems.${serviceIndex}.price`) || 0;
            const priceToAdd = sellingPriceToApply * supply.quantity;
            form.setValue(`serviceItems.${serviceIndex}.price`, currentItemPrice + priceToAdd, { shouldDirty: true });
        }
        
        setIsAddSupplyDialogOpen(false);
    };

    const formatCurrency = (amount: number | undefined) => {
      if (amount === undefined) return '';
      return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
                <FormField control={control} name={`serviceItems.${serviceIndex}.name`} render={({ field }) => ( <FormItem><FormLabel>Nombre del Servicio</FormLabel><FormControl><Input placeholder="Afinación Mayor" {...field} disabled={isReadOnly}/></FormControl><FormMessage/></FormItem> )}/>
                <FormField control={control} name={`serviceItems.${serviceIndex}.price`} render={({ field }) => ( <FormItem><FormLabel>Precio Cliente (IVA Inc.)</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
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

