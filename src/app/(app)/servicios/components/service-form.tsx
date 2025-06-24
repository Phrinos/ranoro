
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
import { CalendarIcon, PlusCircle, Search, Trash2, AlertCircle, Car as CarIcon, Clock, DollarSign, PackagePlus, BrainCircuit, Loader2, Printer, Plus, Minus, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, setHours, setMinutes, isValid, startOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, ServiceSupply, QuoteRecord, InventoryCategory, Supplier, User } from "@/types";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { VehicleDialog } from "../../vehiculos/components/vehicle-dialog";
import type { VehicleFormValues } from "../../vehiculos/components/vehicle-form";
import { placeholderVehicles as defaultPlaceholderVehicles, placeholderInventory, placeholderCategories, placeholderSuppliers, placeholderQuotes, placeholderServiceRecords as defaultServiceRecords, persistToFirestore, AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
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
import { ServiceSheetContent } from './service-sheet-content';
import { Checkbox } from "@/components/ui/checkbox";


const supplySchema = z.object({
  supplyId: z.string().min(1, "Seleccione un insumo"),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  unitPrice: z.coerce.number().optional(),
  supplyName: z.string().optional(),
  isService: z.boolean().optional(),
  unitType: z.enum(['units', 'ml', 'liters']).optional(),
});

const serviceFormSchemaBase = z.object({
  id: z.string().optional(), // For identifying existing records
  vehicleId: z.string({required_error: "Debe seleccionar o registrar un vehículo."}).min(1, "Debe seleccionar o registrar un vehículo.").optional(),
  vehicleLicensePlateSearch: z.string().optional(),
  serviceDate: z.date({ required_error: "La fecha es obligatoria." }).optional(),
  quoteDate: z.date().optional(), // For quote mode
  mileage: z.coerce.number().int().min(0, "El kilometraje no puede ser negativo.").optional(),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres."),
  totalServicePrice: z.coerce.number().min(0, "El costo no puede ser negativo.").optional(), // Quote: estimatedTotalCost, Service: totalCost
  notes: z.string().optional(),
  technicianId: z.string().optional(),
  suppliesUsed: z.array(supplySchema).optional(), // Quote: suppliesProposed, Service: suppliesUsed
  status: z.enum(["Agendado", "Reparando", "Completado", "Cancelado"]).optional(),
  serviceType: z.enum(["Servicio General", "Cambio de Aceite", "Pintura"]).optional(),
  deliveryDateTime: z.date().optional(),
  vehicleConditions: z.string().optional(),
  fuelLevel: z.string().optional(),
  customerItems: z.string().optional(),
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

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>(inventoryItemsProp);

  const [isAddSupplyDialogOpen, setIsAddSupplyDialogOpen] = useState(false);
  const [addSupplySearchTerm, setAddSupplySearchTerm] = useState('');
  const [addSupplyQuantity, setAddSupplyQuantity] = useState(1);
  const [filteredInventoryForDialog, setFilteredInventoryForDialog] = useState<InventoryItem[]>([]);
  const [selectedInventoryItemForDialog, setSelectedInventoryItemForDialog] = useState<InventoryItem | null>(null);

  const [isNewInventoryItemDialogOpen, setIsNewInventoryItemDialogOpen] = useState(false);
  const [newSupplyInitialData, setNewSupplyInitialData] = useState<Partial<InventoryItemFormValues> | null>(null);
  const [isSuggestingPrice, setIsSuggestingPrice] = useState(false);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [serviceForSheet, setServiceForSheet] = useState<ServiceRecord | null>(null);


  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchemaBase),
    // This defaultValues block will be overridden by useEffect, but it's good practice.
    defaultValues: {
        id: initialData?.id || undefined,
        vehicleId: initialData?.vehicleId || undefined,
        vehicleLicensePlateSearch: initialVehicleIdentifier || "",
        serviceDate: undefined,
        mileage: initialData?.mileage || undefined,
        description: initialData?.description || "",
        totalServicePrice: undefined,
        notes: initialData?.notes || "",
        technicianId: (initialData as ServiceRecord)?.technicianId || (initialData as QuoteRecord)?.preparedByTechnicianId || "",
        suppliesUsed: [],
        status: mode === 'service' ? ((initialData as ServiceRecord)?.status || 'Agendado') : undefined,
        serviceType: mode === 'service' ? ((initialData as ServiceRecord)?.serviceType || 'Servicio General') : undefined,
        deliveryDateTime: undefined,
        vehicleConditions: (initialData as ServiceRecord)?.vehicleConditions || "",
        fuelLevel: (initialData as ServiceRecord)?.fuelLevel || undefined,
        customerItems: (initialData as ServiceRecord)?.customerItems || "",
    }
  });

  const { fields, append, remove, replace, update } = useFieldArray({
    control: form.control,
    name: "suppliesUsed",
  });
  
  useEffect(() => {
    if (typeof window !== "undefined") {
        const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
        if (authUserString) {
            setCurrentUser(JSON.parse(authUserString));
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

        const supplies = (isConverting || mode === 'quote') ? (data as QuoteRecord).suppliesProposed : (data as ServiceRecord).suppliesUsed;
        const mappedSupplies = supplies?.map(s => {
            const itemDetails = currentInventoryItems.find(i => i.id === s.supplyId);
            const unitPrice = (isConverting || mode === 'quote') 
                ? (itemDetails?.sellingPrice ?? s.unitPrice ?? 0) // Use selling price for quotes/conversion
                : (itemDetails?.unitPrice ?? s.unitPrice ?? 0); // Use cost price for existing services
            return {
                supplyId: s.supplyId,
                supplyName: itemDetails?.name || s.supplyName || '',
                quantity: s.quantity,
                unitPrice: unitPrice,
                isService: itemDetails?.isService || false,
                unitType: itemDetails?.unitType || 'units',
            };
        }) || [];
        
        const rawServiceDate = data.serviceDate || data.quoteDate;
        const parsedServiceDate = rawServiceDate ? parseISO(rawServiceDate) : undefined;
        
        const rawDeliveryDate = (data as ServiceRecord)?.deliveryDateTime;
        const parsedDeliveryDate = rawDeliveryDate ? parseISO(rawDeliveryDate) : undefined;

        const dataToReset: Partial<ServiceFormValues> = {
            id: data.id,
            vehicleId: data.vehicleId ? String(data.vehicleId) : undefined,
            vehicleLicensePlateSearch: vehicle?.licensePlate || data.vehicleIdentifier || "",
            serviceDate: parsedServiceDate && isValid(parsedServiceDate) ? parsedServiceDate : undefined,
            deliveryDateTime: parsedDeliveryDate && isValid(parsedDeliveryDate) ? parsedDeliveryDate : undefined,
            mileage: data.mileage || undefined,
            description: data.description || "",
            notes: data.notes || "",
            technicianId: (data as ServiceRecord)?.technicianId || (data as QuoteRecord)?.preparedByTechnicianId || undefined,
            totalServicePrice: (data as ServiceRecord)?.totalCost ?? (data as QuoteRecord)?.estimatedTotalCost ?? undefined,
            status: mode === 'service' ? ((data as ServiceRecord)?.status || 'Agendado') : undefined,
            serviceType: mode === 'service' ? ((data as ServiceRecord)?.serviceType || 'Servicio General') : undefined,
            vehicleConditions: (data as ServiceRecord)?.vehicleConditions || "",
            fuelLevel: (data as ServiceRecord)?.fuelLevel || undefined,
            customerItems: (data as ServiceRecord)?.customerItems || '',
        };

        // Reset all form fields except the array
        form.reset(dataToReset);
        // Explicitly replace the array content
        replace(mappedSupplies);

    } else {
      // Set default for new forms
      form.setValue('serviceDate', setHours(setMinutes(new Date(), 30), 8));
      if (mode === 'quote') {
          if (currentUser) {
            form.setValue('technicianId', currentUser.id);
          }
      }
    }
  }, [initialDataService, initialDataQuote, mode, localVehicles, currentInventoryItems, form, replace, currentUser]);


  useEffect(() => {
    setLocalVehicles(parentVehicles);
  }, [parentVehicles]);

  useEffect(() => {
    setCurrentInventoryItems(inventoryItemsProp);
  }, [inventoryItemsProp]);

  const watchedStatus = form.watch("status");

  useEffect(() => {
    if (mode === 'service' && watchedStatus === "Completado" && !form.getValues("deliveryDateTime")) {
      form.setValue("deliveryDateTime", new Date());
    }
  }, [watchedStatus, form, mode]);


  const watchedSupplies = form.watch("suppliesUsed");
  const watchedTotalServicePrice = form.watch("totalServicePrice") || 0;

  // This calculates the cost of supplies TO THE WORKSHOP, regardless of mode.
  const totalSuppliesWorkshopCost = React.useMemo(() => {
    return watchedSupplies?.reduce((sum, supply) => {
      const item = currentInventoryItems.find(i => i.id === supply.supplyId);
      const costPerUnitOrMl = item?.unitPrice || 0;
      return sum + costPerUnitOrMl * supply.quantity;
    }, 0) || 0;
  }, [watchedSupplies, currentInventoryItems]);

  // This calculates the total price of supplies as charged TO THE CUSTOMER.
  const totalSuppliesSellingPrice = React.useMemo(() => {
      return watchedSupplies?.reduce((sum, supply) => {
          const item = currentInventoryItems.find(i => i.id === supply.supplyId);
          // For quotes/conversion, the form's unitPrice *is* the selling price. For existing services, we need to look it up.
          const sellingPricePerUnitOrMl = (mode === 'quote' || isConvertingQuote) 
            ? (supply.unitPrice || 0) 
            : (item?.sellingPrice || 0);
          return sum + sellingPricePerUnitOrMl * supply.quantity;
      }, 0) || 0;
  }, [watchedSupplies, currentInventoryItems, mode, isConvertingQuote]);


  const serviceProfit = React.useMemo(() => {
    return watchedTotalServicePrice - totalSuppliesWorkshopCost;
  }, [watchedTotalServicePrice, totalSuppliesWorkshopCost]);


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
      id: `VEH${defaultPlaceholderVehicles.length + 1}`,
      ...vehicleData,
      year: Number(vehicleData.year),
    };

    defaultPlaceholderVehicles.push(newVehicle);
    await persistToFirestore();
    
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


  const handleFormSubmit = async (values: ServiceFormValues) => {
    if (isReadOnly) {
        onClose();
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

    const finalTotalCost = values.totalServicePrice || 0;
    const finalSubTotal = finalTotalCost / (1 + IVA_RATE);
    const finalTaxAmount = finalTotalCost - finalSubTotal;
    
    if (mode === 'service') {
      const serviceData: ServiceRecord = {
        id: initialDataService?.id || `SER${defaultServiceRecords.length + 1}`,
        vehicleId: vehicleIdToSave,
        vehicleIdentifier: selectedVehicle?.licensePlate || values.vehicleLicensePlateSearch,
        serviceDate: values.serviceDate!.toISOString(),
        deliveryDateTime: values.deliveryDateTime ? values.deliveryDateTime.toISOString() : undefined,
        description: values.description,
        technicianId: values.technicianId!,
        technicianName: technicians.find(t => t.id === values.technicianId)?.name,
        status: values.status!,
        serviceType: values.serviceType || 'Servicio General',
        mileage: values.mileage,
        suppliesUsed: values.suppliesUsed?.map(s => ({
          supplyId: s.supplyId,
          quantity: s.quantity,
          unitPrice: currentInventoryItems.find(i => i.id === s.supplyId)?.unitPrice || 0, // Ensure cost price
          supplyName: s.supplyName,
        })) || [],
        totalCost: finalTotalCost,
        subTotal: finalSubTotal,
        taxAmount: finalTaxAmount,
        totalSuppliesCost: totalSuppliesWorkshopCost,
        serviceProfit: finalTotalCost - totalSuppliesWorkshopCost,
        notes: values.notes,
        vehicleConditions: values.vehicleConditions,
        fuelLevel: values.fuelLevel,
        customerItems: values.customerItems,
        serviceAdvisorName: currentUser?.name || 'N/A',
      };
      await onSubmit(serviceData);
    } else { // mode === 'quote'
      const quoteData: QuoteRecord = {
        id: (initialDataQuote as QuoteRecord)?.id || `COT${placeholderQuotes.length + 1}`,
        publicId: (initialDataQuote as QuoteRecord)?.publicId || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`,
        quoteDate: values.serviceDate!.toISOString(),
        vehicleId: vehicleIdToSave,
        vehicleIdentifier: selectedVehicle?.licensePlate || values.vehicleLicensePlateSearch,
        description: values.description,
        preparedByTechnicianId: values.technicianId,
        preparedByTechnicianName: technicians.find(t => t.id === values.technicianId)?.name,
        suppliesProposed: values.suppliesUsed?.map(s => ({
          supplyId: s.supplyId,
          quantity: s.quantity,
          unitPrice: s.unitPrice || 0, // This is already the selling price
          supplyName: s.supplyName,
        })) || [],
        estimatedTotalCost: finalTotalCost,
        estimatedSubTotal: finalSubTotal,
        estimatedTaxAmount: finalTaxAmount,
        estimatedTotalSuppliesCost: totalSuppliesWorkshopCost,
        estimatedProfit: finalTotalCost - totalSuppliesWorkshopCost,
        notes: values.notes,
        mileage: values.mileage,
      };
      await onSubmit(quoteData);
    }
  };
  
  const handlePrintSheet = useCallback(() => {
    const vehicleForSheet = selectedVehicle;

    if (!vehicleForSheet) {
      toast({ title: "Error", description: "No se puede imprimir la hoja sin un vehículo seleccionado.", variant: "destructive" });
      return;
    }
    
    const formValues = form.getValues();

    const serviceDataForSheet: ServiceRecord = {
      id: formValues.id || 'N/A',
      vehicleId: vehicleForSheet.id,
      serviceDate: formValues.serviceDate ? formValues.serviceDate.toISOString() : new Date().toISOString(),
      description: formValues.description,
      technicianId: formValues.technicianId || 'N/A',
      suppliesUsed: formValues.suppliesUsed || [],
      totalCost: formValues.totalServicePrice || 0,
      status: formValues.status || 'Agendado',
      mileage: formValues.mileage,
      vehicleConditions: formValues.vehicleConditions,
      fuelLevel: formValues.fuelLevel,
      customerItems: formValues.customerItems,
      serviceAdvisorName: currentUser?.name || 'N/A',
    };
    
    setServiceForSheet({ ...serviceDataForSheet, vehicleIdentifier: vehicleForSheet.licensePlate });
    setIsSheetOpen(true);
  }, [form, currentUser, selectedVehicle, toast]);


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

  const handleSuggestPrice = async () => {
    setIsSuggestingPrice(true);
    try {
        const description = form.getValues('description');
        if (!description) {
            toast({ title: "Falta Descripción", description: "Por favor, escribe una descripción del servicio para poder sugerir un precio.", variant: "destructive" });
            return;
        }

        const suppliesForAI = form.getValues('suppliesUsed')?.map(supply => {
            const itemDetails = currentInventoryItems.find(i => i.id === supply.supplyId);
            return {
                supplyName: itemDetails?.name || 'N/A',
                quantity: supply.quantity,
                unitPrice: itemDetails?.unitPrice || 0 // Cost price for the workshop
            };
        }) || [];

        const input: SuggestPriceInput = {
            description,
            supplies: suppliesForAI,
            totalSuppliesCost: totalSuppliesWorkshopCost,
        };

        const result = await suggestPrice(input);

        form.setValue('totalServicePrice', result.suggestedPrice, { shouldValidate: true });
        toast({
            title: "Sugerencia de Precio IA",
            description: result.reasoning,
            duration: 8000
        });

    } catch (e) {
        console.error("Error suggesting price:", e);
        toast({
            title: "Error de IA",
            description: "No se pudo obtener una sugerencia de precio en este momento.",
            variant: "destructive"
        });
    } finally {
        setIsSuggestingPrice(false);
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
            suppliesUsed: ('suppliesUsed' in h ? h.suppliesUsed : h.suppliesProposed)?.map(s => ({
                supplyName: s.supplyName || currentInventoryItems.find(i => i.id === s.supplyId)?.name || 'Unknown',
                quantity: s.quantity
            })) || [],
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

        const newSupplies = result.suppliesProposed.map(supply => {
            const itemDetails = currentInventoryItems.find(i => i.id === supply.supplyId);
            return {
                supplyId: supply.supplyId,
                quantity: supply.quantity,
                supplyName: itemDetails?.name || 'N/A',
                unitPrice: itemDetails?.sellingPrice || 0,
                isService: itemDetails?.isService || false,
                unitType: itemDetails?.unitType || 'units'
            };
        });
        
        replace(newSupplies);
        form.setValue('totalServicePrice', result.estimatedTotalCost, { shouldValidate: true });

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

  const handleConfirmDelete = () => {
    if (onDelete && mode === 'quote' && initialDataQuote?.id) {
        onDelete(initialDataQuote.id);
        onClose(); // This will close the main dialog
    }
  };

  const cardTitleText = mode === 'quote' ? "Información del Vehículo y Cotización" : "Información del Vehículo y Servicio";
  const dateLabelText = mode === 'quote' ? "Fecha de Cotización" : "Fecha y Hora de Recepción";
  const totalCostLabelText = mode === 'quote' ? "Costo Estimado (IVA incluido)" : "Costo del Servicio (IVA incluido)";
  const technicianLabelText = mode === 'quote' ? "Preparado por" : "Técnico Asignado";
  const submitButtonText = mode === 'quote' ? "Guardar Cotización" : (initialDataService ? "Actualizar Servicio" : "Crear Servicio");

  // --- Add Supply Dialog Logic ---
  useEffect(() => {
    if (addSupplySearchTerm.trim() === '') {
        setFilteredInventoryForDialog(currentInventoryItems.slice(0,10));
        return;
    }
    const lowerSearchTerm = addSupplySearchTerm.toLowerCase();
    setFilteredInventoryForDialog(
        currentInventoryItems.filter(item =>
            (item.name.toLowerCase().includes(lowerSearchTerm) ||
            item.sku.toLowerCase().includes(lowerSearchTerm))
        ).slice(0, 10)
    );
  }, [addSupplySearchTerm, currentInventoryItems]);

  const handleSelectSupplyFromSearch = (item: InventoryItem) => {
      setSelectedInventoryItemForDialog(item);
      setAddSupplySearchTerm(item.name);
      setFilteredInventoryForDialog([]);
  };

  const handleAddSupplyConfirmed = () => {
      if (!selectedInventoryItemForDialog || addSupplyQuantity <= 0) {
          toast({ title: "Datos incompletos", description: "Seleccione un insumo de la búsqueda y una cantidad válida.", variant: "destructive" });
          return;
      }
      if (!selectedInventoryItemForDialog.isService && selectedInventoryItemForDialog.quantity < addSupplyQuantity) {
          toast({ title: "Stock Insuficiente", description: `Solo hay ${selectedInventoryItemForDialog.quantity.toLocaleString()} ${selectedInventoryItemForDialog.unitType === 'ml' ? 'ml' : selectedInventoryItemForDialog.unitType === 'liters' ? 'L' : 'unidades'} de ${selectedInventoryItemForDialog.name}.`, variant: "destructive" });
          return;
      }
      append({
          supplyId: selectedInventoryItemForDialog.id,
          supplyName: selectedInventoryItemForDialog.name,
          quantity: addSupplyQuantity,
          unitPrice: mode === 'quote' ? selectedInventoryItemForDialog.sellingPrice : selectedInventoryItemForDialog.unitPrice,
          isService: selectedInventoryItemForDialog.isService || false,
          unitType: selectedInventoryItemForDialog.unitType || 'units'
      });
      setIsAddSupplyDialogOpen(false);
      setAddSupplySearchTerm('');
      setAddSupplyQuantity(1);
      setSelectedInventoryItemForDialog(null);
  };
  
  const handleQuantityChange = (index: number, delta: number) => {
    const itemInFields = fields[index];
    if (!itemInFields) return;

    const currentQuantity = form.getValues(`suppliesUsed.${index}.quantity`);
    const newQuantity = currentQuantity + delta;
    
    if (newQuantity < 1) return;

    const itemDetails = currentInventoryItems.find(invItem => invItem.id === itemInFields.supplyId);
    if (itemDetails && !itemDetails.isService && newQuantity > itemDetails.quantity) {
        toast({ title: "Stock Insuficiente", description: `Solo hay ${itemDetails.quantity} unidades de ${itemDetails.name}.`, variant: "destructive", duration: 3000});
        return;
    }
    
    form.setValue(`suppliesUsed.${index}.quantity`, newQuantity, { shouldDirty: true, shouldValidate: true });
    update(index, { ...form.getValues(`suppliesUsed.${index}`), quantity: newQuantity });
  };

  const handleOpenCreateNewSupplyDialog = () => {
      setNewSupplyInitialData({
          name: addSupplySearchTerm,
          sku: '',
          quantity: 0,
          unitPrice: 0,
          sellingPrice: 0,
          lowStockThreshold: 5,
          isService: false, // Default to product, can be changed in dialog
          unitType: 'units',
          category: placeholderCategories.length > 0 ? placeholderCategories[0].name : "",
          supplier: placeholderSuppliers.length > 0 ? placeholderSuppliers[0].name : "",
      });
      setIsAddSupplyDialogOpen(false);
      setIsNewInventoryItemDialogOpen(true);
  };

  const handleNewSupplyCreated = async (newItemFormValues: InventoryItemFormValues) => {
      const newInventoryItem: InventoryItem = {
          id: `P_SVC_${Date.now()}`,
          ...newItemFormValues,
          isService: newItemFormValues.isService || false,
          quantity: newItemFormValues.isService ? 0 : Number(newItemFormValues.quantity),
          lowStockThreshold: newItemFormValues.isService ? 0 : Number(newItemFormValues.lowStockThreshold),
          unitPrice: Number(newItemFormValues.unitPrice),
          sellingPrice: Number(newItemFormValues.sellingPrice),
          unitType: newItemFormValues.unitType || 'units'
      };
      placeholderInventory.push(newInventoryItem);
      await persistToFirestore();
      
      setCurrentInventoryItems(prev => [...prev, newInventoryItem]);
      if (onInventoryItemCreatedFromService) {
          onInventoryItemCreatedFromService(newInventoryItem);
      }
      toast({
          title: "Nuevo Ítem Creado",
          description: `${newInventoryItem.name} ha sido agregado al inventario y añadido al ${mode === 'quote' ? 'presupuesto' : 'servicio'}.`,
      });
      append({
          supplyId: newInventoryItem.id,
          supplyName: newInventoryItem.name,
          quantity: addSupplyQuantity, // Use addSupplyQuantity from the dialog state
          unitPrice: mode === 'quote' ? newInventoryItem.sellingPrice : newInventoryItem.unitPrice,
          isService: newInventoryItem.isService,
          unitType: newInventoryItem.unitType,
      });
      setIsNewInventoryItemDialogOpen(false);
      setNewSupplyInitialData(null);
      setAddSupplySearchTerm('');
      setAddSupplyQuantity(1);
      setSelectedInventoryItemForDialog(null);
  };


  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">

        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{cardTitleText}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mode === 'service' && (
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold">Estado del Servicio</FormLabel>
                                <Select
                                    onValueChange={(value) => {
                                        field.onChange(value);
                                        if (value === "Completado" && !form.getValues("deliveryDateTime")) {
                                            form.setValue("deliveryDateTime", new Date());
                                        }
                                    }}
                                    defaultValue={field.value}
                                    disabled={isReadOnly}
                                >
                                <FormControl>
                                    <SelectTrigger className="font-bold">
                                    <SelectValue placeholder="Seleccione un estado" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {["Agendado", "Reparando", "Completado", "Cancelado"].map((statusVal) => (
                                    <SelectItem key={statusVal} value={statusVal}>
                                        {statusVal}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                     {mode === 'service' && (
                        <FormField
                            control={form.control}
                            name="serviceType"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold">Tipo de Servicio</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value || 'Servicio General'}
                                    disabled={isReadOnly}
                                >
                                <FormControl>
                                    <SelectTrigger className="font-bold">
                                    <SelectValue placeholder="Seleccione un tipo" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {["Servicio General", "Cambio de Aceite", "Pintura"].map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <FormField
                        control={form.control}
                        name="vehicleLicensePlateSearch"
                        render={({ field }) => (
                        <FormItem className="w-full">
                            <FormLabel>Placa del Vehículo</FormLabel>
                            <FormControl>
                            <Input
                                placeholder="Buscar/Ingresar Placas"
                                {...field}
                                value={vehicleLicensePlateSearch}
                                onChange={(e) => {
                                    setVehicleLicensePlateSearch(e.target.value.toUpperCase());
                                    field.onChange(e.target.value.toUpperCase());
                                }}
                                disabled={isReadOnly}
                                className="uppercase"
                                onKeyDown={handleVehiclePlateKeyDown}
                            />
                            </FormControl>
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="mileage"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Kilometraje (Opcional)</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="Ej: 55000 km" {...field} disabled={isReadOnly} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                 </div>
                 <FormField
                    control={form.control}
                    name="vehicleId"
                    render={() => ( <FormMessage /> )}
                  />
                  {vehicleSearchResults.length > 0 && (
                      <ScrollArea className="h-auto max-h-[150px] w-full rounded-md border">
                          <div className="p-2">
                              {vehicleSearchResults.map(v => (
                                  <button
                                      type="button"
                                      key={v.id}
                                      onClick={() => handleSelectVehicleFromSearch(v)}
                                      className="w-full text-left p-2 rounded-md hover:bg-muted"
                                  >
                                      <p className="font-semibold">{v.licensePlate}</p>
                                      <p className="text-sm text-muted-foreground">{v.make} {v.model} - {v.ownerName}</p>
                                  </button>
                              ))}
                          </div>
                      </ScrollArea>
                  )}
                {selectedVehicle && (
                    <div className="p-3 border rounded-md bg-amber-50 dark:bg-amber-950/50 text-sm space-y-1">
                        <p><strong>Vehículo Seleccionado:</strong> {selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.year} (<span className="font-bold">{selectedVehicle.licensePlate}</span>)</p>
                        <p><strong>Propietario:</strong> {selectedVehicle.ownerName}</p>
                        {lastServiceInfo && (
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">{lastServiceInfo}</p>
                        )}
                    </div>
                )}
                {vehicleNotFound && !selectedVehicle && !isReadOnly && (
                    <div className="p-3 border border-orange-500 rounded-md bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 text-sm flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 shrink-0"/>
                            <p>Vehículo con placa "{vehicleLicensePlateSearch}" no encontrado.</p>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => {
                            setNewVehicleInitialData({ licensePlate: vehicleLicensePlateSearch });
                            setIsVehicleDialogOpen(true);
                        }} className="w-full sm:w-auto">
                            <CarIcon className="mr-2 h-4 w-4"/> Registrar Nuevo Vehículo
                        </Button>
                    </div>
                )}
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 items-end">
                    <FormField
                    control={form.control}
                    name="serviceDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>{dateLabelText}</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild disabled={isReadOnly}>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                disabled={isReadOnly}
                                >
                                {field.value && isValid(field.value) ? (
                                    format(field.value, "PPPp", { locale: es })
                                ) : (
                                    <span>Seleccione fecha y hora</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                    const currentTime = field.value || setHours(setMinutes(new Date(), 30), 8);
                                    const newDateTime = date ?
                                        setHours(setMinutes(startOfDay(date), currentTime.getMinutes()), currentTime.getHours())
                                        : undefined;
                                    field.onChange(newDateTime);
                                }}
                                disabled={(date) => date < new Date("1900-01-01") || isReadOnly }
                                initialFocus
                                locale={es}
                            />
                            <div className="p-2 border-t">
                                <Select
                                    value={field.value ? `${String(field.value.getHours()).padStart(2, '0')}:${String(field.value.getMinutes()).padStart(2, '0')}` : "08:30"}
                                    onValueChange={(timeValue) => handleTimeChange(timeValue, "serviceDate")}
                                    disabled={isReadOnly}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione hora" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {timeSlots.map(slot => (
                                            <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    {mode === 'service' && (
                       <FormField
                        control={form.control}
                        name="deliveryDateTime"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Fecha y Hora de Entrega</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild disabled={isReadOnly}>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    disabled={isReadOnly}
                                    >
                                    {field.value && isValid(field.value) ? (
                                        format(field.value, "PPPp", { locale: es })
                                    ) : (
                                        <span>Seleccione fecha y hora</span>
                                    )}
                                    <Clock className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={(date) => {
                                        const currentTime = field.value || new Date();
                                        const newDateTime = date ?
                                            setHours(setMinutes(startOfDay(date), currentTime.getMinutes()), currentTime.getHours())
                                            : undefined;
                                        field.onChange(newDateTime);
                                    }}
                                    disabled={isReadOnly}
                                    initialFocus
                                    locale={es}
                                />
                                <div className="p-2 border-t">
                                    <Select
                                        value={field.value ? `${String(field.value.getHours()).padStart(2, '0')}:${String(field.value.getMinutes()).padStart(2, '0')}` : "08:30"}
                                        onValueChange={(timeValue) => handleTimeChange(timeValue, "deliveryDateTime")}
                                        disabled={isReadOnly}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione hora" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timeSlots.map(slot => (
                                                <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    )}
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex justify-between items-center">
                                <FormLabel>Descripción del {mode === 'quote' ? 'Trabajo a Cotizar' : 'Servicio'}</FormLabel>
                                {mode === 'quote' && !isReadOnly && (
                                <Button type="button" size="sm" variant="outline" onClick={handleGenerateQuoteWithAI} disabled={isGeneratingQuote}>
                                    {isGeneratingQuote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                                    Generar con IA
                                </Button>
                                )}
                            </div>
                            <FormControl>
                                <Textarea placeholder="Ej: Cambio de aceite y filtros, revisión de frenos..." {...field} disabled={isReadOnly} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Recepción de Unidad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="vehicleConditions"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Condiciones del Vehículo (al recibir)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Ej: Rayón en puerta del conductor, llanta trasera derecha baja, etc." {...field} disabled={isReadOnly} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="fuelLevel"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nivel de Combustible</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar nivel..." /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Vacío">Vacío</SelectItem>
                                        <SelectItem value="1/8">1/8</SelectItem>
                                        <SelectItem value="1/4">1/4</SelectItem>
                                        <SelectItem value="3/8">3/8</SelectItem>
                                        <SelectItem value="1/2">1/2</SelectItem>
                                        <SelectItem value="5/8">5/8</SelectItem>
                                        <SelectItem value="3/4">3/4</SelectItem>
                                        <SelectItem value="7/8">7/8</SelectItem>
                                        <SelectItem value="Lleno">Lleno</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                      control={form.control}
                      name="customerItems"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Pertenencias del Cliente (Opcional)</FormLabel>
                              <FormControl>
                                  <Textarea placeholder="Ej: Gato, llanta de refacción, cargador de celular en la guantera, etc." {...field} disabled={isReadOnly} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                    />
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{mode === 'quote' ? "Insumos/Servicios Propuestos" : "Insumos/Servicios Utilizados"}</CardTitle>
            </CardHeader>
            <CardContent>
                {fields.length > 0 && (
                    <div className="rounded-md border mb-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Insumo/Servicio</TableHead>
                                    <TableHead className="text-center w-40">Cant.</TableHead>
                                    <TableHead className="text-right">{mode === 'quote' ? 'Precio Venta Unit. (IVA Inc.)' : 'Costo Unit. (Taller)'}</TableHead>
                                    <TableHead className="text-right">{mode === 'quote' ? 'Precio Total (IVA Inc.)' : 'Costo Total (Taller)'}</TableHead>
                                    {!isReadOnly && <TableHead className="text-right">Acción</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => {
                                    const currentItemDetails = currentInventoryItems.find(invItem => invItem.id === item.supplyId);
                                    const unitPriceForCalc = item.unitPrice || 0;
                                    const totalItemPrice = unitPriceForCalc * item.quantity;
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.supplyName || currentItemDetails?.name || 'N/A'}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        type="button" variant="outline" size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleQuantityChange(index, -1)}
                                                        disabled={isReadOnly}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-12 text-center font-medium">
                                                        {item.quantity}{item.unitType === 'ml' ? 'ml' : item.unitType === 'liters' ? 'L' : ''}
                                                    </span>
                                                    <Button
                                                        type="button" variant="outline" size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleQuantityChange(index, 1)}
                                                        disabled={isReadOnly}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(unitPriceForCalc)}
                                                {item.unitType === 'ml' ? <span className="text-xs text-muted-foreground">/ml</span> : item.unitType === 'liters' ? <span className="text-xs text-muted-foreground">/L</span> : ''}
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(totalItemPrice)}</TableCell>
                                            {!isReadOnly && (
                                                <TableCell className="text-right">
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Eliminar insumo" className="text-destructive hover:text-destructive/90">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
                 {!isReadOnly && (
                    <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setSelectedInventoryItemForDialog(null);
                        setAddSupplySearchTerm('');
                        setAddSupplyQuantity(1);
                        setFilteredInventoryForDialog(currentInventoryItems.slice(0,10));
                        setIsAddSupplyDialogOpen(true);
                    }}
                    className="mt-4"
                    >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Insumo/Servicio
                    </Button>
                )}
                 <div className="mt-4 text-lg font-medium text-right">
                    <p>
                        {mode === 'quote' ? "Total de Insumos/Servicios (para cotización, IVA Inc.):" : "Costo Total de Insumos/Servicios (para el taller):"}
                        <span className="font-semibold">
                            {formatCurrency(mode === 'quote' ? totalSuppliesSellingPrice : totalSuppliesWorkshopCost)}
                        </span>
                    </p>
                </div>
            </CardContent>
        </Card>

        <Card className="bg-card">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600"/>
                    Resumen Financiero y Notas
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-1 text-lg">
                        <div className="flex justify-between pt-1">
                            <span>{totalCostLabelText}:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(watchedTotalServicePrice)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>(-) Costo Insumos (Taller):</span>
                            <span className="font-medium text-red-600 dark:text-red-400">
                                {formatCurrency(totalSuppliesWorkshopCost)}
                            </span>
                        </div>
                        <hr className="my-2 border-dashed"/>
                        <div className="flex justify-between font-bold text-green-700 dark:text-green-400">
                            <span>(=) Ganancia Estimada del {mode === 'quote' ? 'Trabajo Cotizado' : 'Servicio'}:</span>
                            <span>{formatCurrency(serviceProfit)}</span>
                        </div>
                    </div>
                     <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder={mode === 'quote' ? "Ej: Validez de la cotización, condiciones..." : "Notas internas o para el cliente..."} {...field} disabled={isReadOnly} className="min-h-[100px]"/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 items-end">
                    <FormField
                          control={form.control}
                          name="technicianId"
                          render={({ field }) => (
                            <FormItem className="md:col-span-1">
                              <FormLabel className="text-lg">{technicianLabelText}</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione un técnico" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {technicians.map((technician) => (
                                    <SelectItem key={technician.id} value={technician.id}>
                                      {technician.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    <FormField
                        control={form.control}
                        name="totalServicePrice"
                        render={({ field }) => (
                            <FormItem className="md:col-span-1">
                                <div className="flex justify-between items-center">
                                    <FormLabel className="text-lg">{totalCostLabelText}</FormLabel>
                                    {!isReadOnly && (
                                        <Button type="button" size="sm" variant="outline" onClick={handleSuggestPrice} disabled={isSuggestingPrice}>
                                            {isSuggestingPrice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                                            Sugerir con IA
                                        </Button>
                                    )}
                                </div>
                                <FormControl>
                                  <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input type="number" step="0.01" placeholder="1740.00" {...field} disabled={isReadOnly || isSuggestingPrice} className="text-lg font-medium pl-8" value={field.value ?? ''} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>

        <div className="flex justify-between items-center pt-4">
            <div>
              {mode === 'service' && !isReadOnly && (
                <Button type="button" onClick={handlePrintSheet} className="bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700">
                    <Printer className="mr-2 h-4 w-4" />
                    Hoja de Servicio
                </Button>
              )}
            </div>
            <div className="flex justify-end gap-2">
            {isReadOnly ? (
                <Button type="button" variant="outline" onClick={onClose}>
                Cerrar
                </Button>
            ) : (
                <>
                {onDelete && mode === 'quote' && initialDataQuote?.id && (
                    <div className="mr-auto">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar Cotización
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro de eliminar esta cotización?</AlertDialogTitle>
                            <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente la cotización {initialDataQuote.id}.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                            Sí, Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    </div>
                )}
                <Button type="button" variant="outline" onClick={onClose}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting || !selectedVehicle}>
                    {form.formState.isSubmitting ? "Guardando..." : submitButtonText}
                </Button>
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

    <Dialog open={isAddSupplyDialogOpen} onOpenChange={setIsAddSupplyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Añadir Insumo/Servicio al {mode === 'quote' ? 'Presupuesto' : 'Servicio'}</DialogTitle>
                <DialogDesc>Busque por nombre o SKU. Si no existe, puede crearlo.</DialogDesc>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="supply-search"
                        placeholder="Buscar insumo/servicio por nombre o SKU..."
                        value={addSupplySearchTerm}
                        onChange={(e) => {
                            setAddSupplySearchTerm(e.target.value);
                            setSelectedInventoryItemForDialog(null);
                        }}
                        className="pl-8"
                    />
                </div>
                {addSupplySearchTerm && filteredInventoryForDialog.length > 0 && !selectedInventoryItemForDialog && (
                    <ScrollArea className="h-[150px] border rounded-md">
                        <div className="p-2 space-y-1">
                            {filteredInventoryForDialog.map(item => (
                                <Button
                                    key={item.id}
                                    variant="ghost"
                                    className="w-full justify-start text-left h-auto py-1.5 px-2"
                                    onClick={() => handleSelectSupplyFromSearch(item)}
                                >
                                    <div>
                                        <p className="font-medium">{item.name} <span className="text-xs text-muted-foreground">({item.sku})</span></p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.isService ? 'Servicio' : `Stock: ${item.quantity.toLocaleString()}${item.unitType === 'ml' ? ' ml' : item.unitType === 'liters' ? ' L' : ''}`} | {mode === 'quote' ? `Venta: ${formatCurrency(item.sellingPrice)}` : `Costo: ${formatCurrency(item.unitPrice)}`}{item.unitType === 'ml' ? '/ml' : item.unitType === 'liters' ? '/L' : ''}
                                        </p>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                )}
                {selectedInventoryItemForDialog && (
                    <div className="p-2 border rounded-md bg-muted">
                        <p className="font-medium text-sm">Seleccionado: {selectedInventoryItemForDialog.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {mode === 'quote' ? `Precio Venta: ${formatCurrency(selectedInventoryItemForDialog.sellingPrice)}` : `Costo Taller: ${formatCurrency(selectedInventoryItemForDialog.unitPrice)}`}
                            {selectedInventoryItemForDialog.unitType === 'ml' ? '/ml' : selectedInventoryItemForDialog.unitType === 'liters' ? '/L' : ''}
                        </p>
                    </div>
                )}
                {addSupplySearchTerm && filteredInventoryForDialog.length === 0 && !selectedInventoryItemForDialog && (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                        <p>No se encontró el ítem "{addSupplySearchTerm}".</p>
                        <Button variant="link" size="sm" onClick={handleOpenCreateNewSupplyDialog} className="text-primary">
                            <PackagePlus className="mr-2 h-4 w-4"/>Crear Nuevo Ítem
                        </Button>
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor="supply-quantity">
                        Cantidad ({selectedInventoryItemForDialog?.unitType === 'ml' ? 'ml' : selectedInventoryItemForDialog?.unitType === 'liters' ? 'L' : 'unidades'})
                    </Label>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setAddSupplyQuantity(q => Math.max(1, q - 1))}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                            id="supply-quantity"
                            type="number"
                            min="1"
                            value={addSupplyQuantity}
                            onChange={(e) => setAddSupplyQuantity(parseInt(e.target.value, 10) || 1)}
                            className="w-20 text-center"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setAddSupplyQuantity(q => q + 1)}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddSupplyDialogOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={handleAddSupplyConfirmed} disabled={!selectedInventoryItemForDialog}>Añadir Ítem Seleccionado</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    {isNewInventoryItemDialogOpen && (
      <InventoryItemDialog
        open={isNewInventoryItemDialogOpen}
        onOpenChange={setIsNewInventoryItemDialogOpen}
        item={newSupplyInitialData}
        onSave={handleNewSupplyCreated}
        categories={placeholderCategories}
        suppliers={placeholderSuppliers}
      />
    )}

    <PrintTicketDialog
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        title="Hoja de Servicio"
        onDialogClose={() => setServiceForSheet(null)}
        dialogContentClassName="printable-quote-dialog"
        footerActions={
            <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir Hoja
            </Button>
        }
    >
        {serviceForSheet && (
            <ServiceSheetContent service={serviceForSheet} vehicle={localVehicles.find(v => v.id === serviceForSheet.vehicleId)} />
        )}
    </PrintTicketDialog>
    </>
  );
}
