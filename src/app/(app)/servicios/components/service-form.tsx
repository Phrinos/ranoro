
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
import { Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import { CalendarIcon, PlusCircle, Search, Trash2, AlertCircle, Car as CarIcon, Clock, DollarSign, PackagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, setHours, setMinutes, isValid, startOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, ServiceSupply, QuoteRecord, InventoryCategory, Supplier } from "@/types";
import React, { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { VehicleDialog } from "../../vehiculos/components/vehicle-dialog";
import type { VehicleFormValues } from "../../vehiculos/components/vehicle-form";
import { placeholderVehicles as defaultPlaceholderVehicles, placeholderInventory, placeholderCategories, placeholderSuppliers } from "@/lib/placeholder-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InventoryItemDialog } from "../../inventario/components/inventory-item-dialog";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";


const supplySchema = z.object({
  supplyId: z.string().min(1, "Seleccione un insumo"),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  unitPrice: z.coerce.number().optional(), 
  supplyName: z.string().optional(),
  isService: z.boolean().optional(), // To know if it's a service
});

const serviceFormSchemaBase = z.object({
  vehicleId: z.number({invalid_type_error: "Debe seleccionar o registrar un vehículo."}).positive("Debe seleccionar o registrar un vehículo.").optional(),
  vehicleLicensePlateSearch: z.string().optional(), 
  serviceDate: z.date({ required_error: "La fecha es obligatoria." }),
  mileage: z.coerce.number().int().min(0, "El kilometraje no puede ser negativo.").optional(),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres."),
  totalServicePrice: z.coerce.number().min(0, "El costo no puede ser negativo."),
  notes: z.string().optional(),
  technicianId: z.string().optional(), 
  suppliesUsed: z.array(supplySchema).optional(),
  status: z.enum(["Agendado", "Reparando", "Completado", "Cancelado"]).optional(),
  deliveryDateTime: z.date().optional(),
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
            slots.push({ value: `${hour}:00`, label: `${String(hour).padStart(2, '0')}:00 ${hour < 12 ? 'AM' : 'PM'}`});
            slots.push({ value: `${hour}:30`, label: `${String(hour).padStart(2, '0')}:30 ${hour < 12 ? 'AM' : 'PM'}`});
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
  onInventoryItemCreatedFromService
}: ServiceFormProps) {
  const { toast } = useToast();
  const initialData = mode === 'service' ? initialDataService : initialDataQuote;
  const initialVehicleIdentifier = mode === 'service' ? initialDataService?.vehicleIdentifier : initialDataQuote?.vehicleIdentifier;

  const [vehicleLicensePlateSearch, setVehicleLicensePlateSearch] = useState(initialVehicleIdentifier || "");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleNotFound, setVehicleNotFound] = useState(false);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>(parentVehicles);
  
  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>(inventoryItemsProp);

  const [isAddSupplyDialogOpen, setIsAddSupplyDialogOpen] = useState(false);
  const [addSupplySearchTerm, setAddSupplySearchTerm] = useState('');
  const [addSupplyQuantity, setAddSupplyQuantity] = useState(1);
  const [filteredInventoryForDialog, setFilteredInventoryForDialog] = useState<InventoryItem[]>([]);
  const [selectedInventoryItemForDialog, setSelectedInventoryItemForDialog] = useState<InventoryItem | null>(null);

  const [isNewInventoryItemDialogOpen, setIsNewInventoryItemDialogOpen] = useState(false);
  const [newSupplyInitialData, setNewSupplyInitialData] = useState<Partial<InventoryItemFormValues> | null>(null);


  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchemaBase),
    defaultValues: initialData
      ? {
          ...initialData,
          vehicleId: initialData.vehicleId,
          vehicleLicensePlateSearch: initialVehicleIdentifier || "",
          serviceDate: initialData.serviceDate || initialData.quoteDate ? parseISO(initialData.serviceDate || initialData.quoteDate!) : new Date(),
          deliveryDateTime: mode === 'service' && initialDataService?.deliveryDateTime ? parseISO(initialDataService.deliveryDateTime) : undefined,
          mileage: initialData.mileage ?? undefined, 
          suppliesUsed: (mode === 'service' ? initialDataService?.suppliesUsed : initialDataQuote?.suppliesProposed)?.map(s => ({
              supplyId: s.supplyId,
              quantity: s.quantity,
              supplyName: currentInventoryItems.find(i => i.id === s.supplyId)?.name || s.supplyName || '', 
              unitPrice: currentInventoryItems.find(i => i.id === s.supplyId)?.unitPrice || s.unitPrice || 0,
              isService: currentInventoryItems.find(i => i.id === s.supplyId)?.isService || false,
          })) || [],
          totalServicePrice: mode === 'service' ? initialDataService?.totalCost : initialDataQuote?.estimatedTotalCost, 
          status: mode === 'service' ? initialDataService?.status : undefined,
          technicianId: mode === 'service' ? initialDataService?.technicianId : (initialDataQuote as QuoteRecord)?.preparedByTechnicianId,
        }
      : {
          vehicleId: undefined,
          vehicleLicensePlateSearch: "",
          serviceDate: setHours(setMinutes(new Date(), 30), 8), 
          deliveryDateTime: undefined,
          mileage: undefined, 
          description: "",
          technicianId: "",
          suppliesUsed: [],
          totalServicePrice: 0,
          status: mode === 'service' ? "Agendado" : undefined, 
          notes: "",
        },
  });

  useEffect(() => {
    setLocalVehicles(parentVehicles); 
  }, [parentVehicles]);

  useEffect(() => {
    setCurrentInventoryItems(inventoryItemsProp);
  }, [inventoryItemsProp]);


  useEffect(() => {
    const currentInitialData = mode === 'service' ? initialDataService : initialDataQuote;
    if (currentInitialData && currentInitialData.vehicleId) {
      const foundVehicle = localVehicles.find(v => v.id === currentInitialData.vehicleId);
      if (foundVehicle) {
        setSelectedVehicle(foundVehicle);
        form.setValue('vehicleId', foundVehicle.id);
        setVehicleLicensePlateSearch(foundVehicle.licensePlate);
      }
    }
     if (currentInitialData && (currentInitialData.serviceDate || currentInitialData.quoteDate)) {
      const parsedDate = parseISO(currentInitialData.serviceDate || currentInitialData.quoteDate!);
      if (isValid(parsedDate)) {
        form.setValue('serviceDate', parsedDate);
      }
    }
  }, [initialDataService, initialDataQuote, mode, localVehicles, form]);
  
  const watchedStatus = form.watch("status");

  useEffect(() => {
    if (mode === 'service' && watchedStatus === "Completado" && !form.getValues("deliveryDateTime")) {
      form.setValue("deliveryDateTime", new Date());
    }
  }, [watchedStatus, form, mode]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "suppliesUsed",
  });

  const watchedSupplies = form.watch("suppliesUsed");
  const watchedTotalServicePrice = form.watch("totalServicePrice") || 0; 

  const totalSuppliesCost = React.useMemo(() => {
    return watchedSupplies?.reduce((sum, supply) => {
      const item = currentInventoryItems.find(i => i.id === supply.supplyId);
      // Use unitPrice for services (cost to workshop), sellingPrice for quotes (cost to client)
      const costBasis = mode === 'quote' 
        ? (item?.sellingPrice || supply.unitPrice || 0) 
        : (item?.unitPrice || supply.unitPrice || 0);
      return sum + costBasis * supply.quantity; 
    }, 0) || 0;
  }, [watchedSupplies, currentInventoryItems, mode]);


  const serviceProfit = React.useMemo(() => {
    // For profit calculation, always use the workshop's cost for supplies (item.unitPrice).
    const actualSuppliesWorkshopCost = watchedSupplies?.reduce((sum, supply) => {
        const item = currentInventoryItems.find(i => i.id === supply.supplyId);
        return sum + (item?.unitPrice || 0) * supply.quantity; // Always use workshop cost for profit calc
    }, 0) || 0;
    return watchedTotalServicePrice - actualSuppliesWorkshopCost;
  }, [watchedTotalServicePrice, watchedSupplies, currentInventoryItems]);


  const handleSearchVehicle = () => {
    if (!vehicleLicensePlateSearch.trim()) {
      toast({ title: "Ingrese Placa", description: "Por favor ingrese una placa para buscar.", variant: "destructive" });
      return;
    }
    const found = localVehicles.find(v => v.licensePlate.toLowerCase() === vehicleLicensePlateSearch.trim().toLowerCase());
    if (found) {
      setSelectedVehicle(found);
      form.setValue('vehicleId', found.id, { shouldValidate: true });
      setVehicleNotFound(false);
      toast({ title: "Vehículo Encontrado", description: `${found.make} ${found.model} (${found.licensePlate})`});
    } else {
      setSelectedVehicle(null);
      form.setValue('vehicleId', undefined, { shouldValidate: true });
      setVehicleNotFound(true);
      toast({ title: "Vehículo No Encontrado", description: "Puede registrarlo si es nuevo.", variant: "default"});
    }
  };
  
  const handleSaveNewVehicle = async (vehicleData: VehicleFormValues) => {
    const newVehicle: Vehicle = {
      id: defaultPlaceholderVehicles.reduce((maxId, v) => Math.max(v.id, maxId), 0) + 1,
      ...vehicleData,
      year: Number(vehicleData.year),
    };
    
    defaultPlaceholderVehicles.push(newVehicle);
    setLocalVehicles(prev => [...prev, newVehicle]); 

    setSelectedVehicle(newVehicle);
    form.setValue('vehicleId', newVehicle.id, { shouldValidate: true });
    setVehicleLicensePlateSearch(newVehicle.licensePlate); 
    setVehicleNotFound(false);
    setIsVehicleDialogOpen(false);
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
    
    const isValidForm = await form.trigger();
    if (!isValidForm || (!values.vehicleId && mode === 'service') ) { 
        if (mode === 'service' && !values.vehicleId) {
            form.setError("vehicleId", { type: "manual", message: "Debe seleccionar o registrar un vehículo." });
        }
      toast({ title: "Formulario Incompleto", description: "Por favor, revise los campos marcados.", variant: "destructive"});
      return;
    }
    
    const currentTotalServicePrice = values.totalServicePrice || 0;
    // Recalculate actualSuppliesWorkshopCost for saving, ensuring it always uses workshop cost
    const actualSuppliesWorkshopCostForSave = values.suppliesUsed?.reduce((sum, s) => {
        const itemDetails = currentInventoryItems.find(invItem => invItem.id === s.supplyId);
        return sum + (itemDetails?.unitPrice || 0) * s.quantity; 
    }, 0) || 0;
    const calculatedProfitForSave = currentTotalServicePrice - actualSuppliesWorkshopCostForSave;


    if (mode === 'service') {
      const serviceData: ServiceRecord = {
        id: initialDataService?.id || `S_NEW_${Date.now()}`, 
        vehicleId: values.vehicleId!,
        vehicleIdentifier: selectedVehicle?.licensePlate || values.vehicleLicensePlateSearch,
        serviceDate: values.serviceDate.toISOString(),
        deliveryDateTime: values.deliveryDateTime ? values.deliveryDateTime.toISOString() : undefined,
        description: values.description,
        technicianId: values.technicianId!,
        technicianName: technicians.find(t => t.id === values.technicianId)?.name,
        status: values.status!, 
        mileage: values.mileage,
        notes: values.notes,
        suppliesUsed: values.suppliesUsed?.map(s => {
          const itemDetails = currentInventoryItems.find(invItem => invItem.id === s.supplyId);
          return {
            supplyId: s.supplyId,
            quantity: s.quantity,
            unitPrice: itemDetails?.unitPrice || s.unitPrice || 0, 
            supplyName: itemDetails?.name || s.supplyName,
          };
        }) || [],
        totalCost: currentTotalServicePrice, 
        subTotal: currentTotalServicePrice / (1 + IVA_RATE), 
        taxAmount: currentTotalServicePrice - (currentTotalServicePrice / (1 + IVA_RATE)), 
        totalSuppliesCost: actualSuppliesWorkshopCostForSave, 
        serviceProfit: calculatedProfitForSave, 
      };
      await onSubmit(serviceData);
    } else { 
      const quoteData: QuoteRecord = {
        id: (initialDataQuote as QuoteRecord)?.id || `Q_NEW_${Date.now()}`,
        quoteDate: values.serviceDate.toISOString(), 
        vehicleId: values.vehicleId,
        vehicleIdentifier: selectedVehicle?.licensePlate || values.vehicleLicensePlateSearch,
        description: values.description,
        preparedByTechnicianId: values.technicianId, 
        preparedByTechnicianName: technicians.find(t => t.id === values.technicianId)?.name, 
        suppliesProposed: values.suppliesUsed?.map(s => {
          const itemDetails = currentInventoryItems.find(invItem => invItem.id === s.supplyId);
          return {
            supplyId: s.supplyId,
            quantity: s.quantity,
            unitPrice: itemDetails?.sellingPrice || 0, // Cost to client (selling price)
            supplyName: itemDetails?.name || s.supplyName,
          };
        }) || [],
        estimatedTotalCost: currentTotalServicePrice, 
        estimatedSubTotal: currentTotalServicePrice / (1 + IVA_RATE),
        estimatedTaxAmount: currentTotalServicePrice - (currentTotalServicePrice / (1 + IVA_RATE)),
        estimatedTotalSuppliesCost: actualSuppliesWorkshopCostForSave, // Cost to workshop
        estimatedProfit: calculatedProfitForSave, // Profit based on workshop cost
        notes: values.notes,
        mileage: values.mileage,
      };
      await onSubmit(quoteData);
    }
  };
  
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

  const cardTitleText = mode === 'quote' ? "Información del Vehículo y Cotización" : "Información del Vehículo y Servicio";
  const dateLabelText = mode === 'quote' ? "Fecha de Cotización" : "Fecha y Hora de Recepción";
  const totalCostLabelText = mode === 'quote' ? "Costo Estimado (IVA incluido)" : "Costo del Servicio (IVA incluido)";
  const technicianLabelText = mode === 'service' ? "Técnico Asignado" : ""; 
  const submitButtonText = mode === 'quote' ? "Generar PDF de Cotización" : (initialDataService ? "Actualizar Servicio" : "Crear Servicio");

  // --- Add Supply Dialog Logic ---
  useEffect(() => {
    if (addSupplySearchTerm.trim() === '') {
        setFilteredInventoryForDialog(currentInventoryItems.filter(item => item.isService || item.quantity > 0).slice(0,10));
        return;
    }
    const lowerSearchTerm = addSupplySearchTerm.toLowerCase();
    setFilteredInventoryForDialog(
        currentInventoryItems.filter(item =>
            (item.name.toLowerCase().includes(lowerSearchTerm) ||
            item.sku.toLowerCase().includes(lowerSearchTerm)) && (item.isService || item.quantity > 0)
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
          toast({ title: "Stock Insuficiente", description: `Solo hay ${selectedInventoryItemForDialog.quantity} unidades de ${selectedInventoryItemForDialog.name}.`, variant: "destructive" });
          return;
      }
      append({
          supplyId: selectedInventoryItemForDialog.id,
          supplyName: selectedInventoryItemForDialog.name,
          quantity: addSupplyQuantity,
          unitPrice: mode === 'quote' ? selectedInventoryItemForDialog.sellingPrice : selectedInventoryItemForDialog.unitPrice,
          isService: selectedInventoryItemForDialog.isService || false,
      });
      setIsAddSupplyDialogOpen(false);
      setAddSupplySearchTerm('');
      setAddSupplyQuantity(1);
      setSelectedInventoryItemForDialog(null);
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
      };
      placeholderInventory.push(newInventoryItem);
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
          quantity: 1, 
          unitPrice: mode === 'quote' ? newInventoryItem.sellingPrice : newInventoryItem.unitPrice,
          isService: newInventoryItem.isService,
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    {mode === 'service' && (
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Estado del Servicio</FormLabel>
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
                                    <SelectTrigger>
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
                    <div className={`flex flex-col sm:flex-row items-end gap-2 ${mode === 'quote' || (mode === 'service' && !form.watch('status')) ? 'md:col-span-2' : ''} ${mode === 'service' && form.watch('status') ? '' : 'md:col-span-2'}`}>
                        <FormField
                            control={form.control}
                            name="vehicleLicensePlateSearch"
                            render={({ field }) => (
                            <FormItem className="flex-1 w-full sm:w-auto">
                                <FormLabel>Placa del Vehículo</FormLabel>
                                <FormControl>
                                <Input 
                                    placeholder="Buscar o ingresar placa..." 
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
                        {!isReadOnly && (
                            <Button type="button" onClick={handleSearchVehicle} variant="outline" size="icon" className="w-10 h-10 sm:w-10 sm:h-10 mt-2 sm:mt-0 shrink-0">
                                <Search className="h-4 w-4" />
                                <span className="sr-only">Buscar Placa</span>
                            </Button>
                        )}
                    </div>
                </div>
                 <FormField
                    control={form.control}
                    name="vehicleId"
                    render={() => ( <FormMessage /> )} 
                  />
                {selectedVehicle && (
                    <div className="p-3 border rounded-md bg-muted text-sm space-y-1">
                        <p><strong>Placa:</strong> {selectedVehicle.licensePlate}</p>
                        <p><strong>Vehículo Seleccionado:</strong> {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})</p>
                        <p><strong>Propietario:</strong> {selectedVehicle.ownerName}</p>
                    </div>
                )}
                {vehicleNotFound && !selectedVehicle && !isReadOnly && (
                    <div className="p-3 border border-orange-500 rounded-md bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 text-sm flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 shrink-0"/>
                            <p>Vehículo con placa "{vehicleLicensePlateSearch}" no encontrado.</p>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => setIsVehicleDialogOpen(true)} className="w-full sm:w-auto">
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
                    <FormField
                    control={form.control}
                    name="mileage"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Kilometraje (Opcional)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="Ej: 55000" {...field} disabled={isReadOnly} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Descripción del {mode === 'quote' ? 'Trabajo a Cotizar' : 'Servicio'}</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Ej: Cambio de aceite y filtros, revisión de frenos..." {...field} disabled={isReadOnly} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder={mode === 'quote' ? "Ej: Validez de la cotización, condiciones..." : "Notas internas o para el cliente..."} {...field} disabled={isReadOnly} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 items-end">
                    {mode === 'service' && ( 
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
                    )}
                    <FormField
                        control={form.control}
                        name="totalServicePrice"
                        render={({ field }) => (
                            <FormItem className={mode === 'service' ? "md:col-span-1" : "md:col-span-2"}>
                                <FormLabel className="text-lg">{totalCostLabelText}</FormLabel>
                                <FormControl>
                                <Input type="number" step="0.01" placeholder="Ej: 1740.00" {...field} disabled={isReadOnly} className="text-lg font-medium"/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>
        
        {mode === 'service' && watchedStatus === "Completado" && (
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
                                    <TableHead className="text-center">Cant.</TableHead>
                                    <TableHead className="text-right">{mode === 'quote' ? 'Precio Venta Unit. (IVA Inc.)' : 'Costo Unit. (Taller)'}</TableHead>
                                    <TableHead className="text-right">{mode === 'quote' ? 'Precio Total (IVA Inc.)' : 'Costo Total (Taller)'}</TableHead>
                                    {!isReadOnly && <TableHead className="text-right">Acción</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => {
                                    const currentItemDetails = currentInventoryItems.find(invItem => invItem.id === item.supplyId);
                                    const unitPriceForCalc = mode === 'quote' 
                                        ? (item.unitPrice || currentItemDetails?.sellingPrice || 0) 
                                        : (item.unitPrice || currentItemDetails?.unitPrice || 0); 
                                    const totalItemPrice = unitPriceForCalc * item.quantity;
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.supplyName || currentItemDetails?.name || 'N/A'}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(unitPriceForCalc)}</TableCell>
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
                        setFilteredInventoryForDialog(currentInventoryItems.filter(item => item.isService || item.quantity > 0).slice(0,10)); 
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
                        {mode === 'quote' ? "Costo Total de Insumos/Servicios (para cotización, IVA Inc.):" : "Costo Total de Insumos/Servicios (para el taller):"}
                        <span className="font-semibold">
                            {formatCurrency(totalSuppliesCost)}
                        </span>
                    </p>
                </div>
            </CardContent>
        </Card>
        
        <Card className="bg-card">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600"/>
                    Resumen Financiero
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-lg">
                <div className="flex justify-between pt-1">
                    <span>{totalCostLabelText}:</span> 
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(watchedTotalServicePrice)}</span>
                </div>
                <div className="flex justify-between">
                    <span>(-) Costo Insumos (Taller):</span> 
                    <span className="font-medium text-red-600 dark:text-red-400">
                         {formatCurrency(
                            watchedSupplies?.reduce((sum, supply) => {
                                const item = currentInventoryItems.find(i => i.id === supply.supplyId);
                                return sum + (item?.unitPrice || 0) * supply.quantity; // Always use workshop cost for this line
                            }, 0) || 0
                        )}
                    </span>
                </div>
                <hr className="my-2 border-dashed"/>
                <div className="flex justify-between font-bold text-green-700 dark:text-green-400">
                    <span>(=) Ganancia Estimada del {mode === 'quote' ? 'Trabajo Cotizado' : 'Servicio'}:</span> 
                    <span>{formatCurrency(serviceProfit)}</span>
                </div>
            </CardContent>
        </Card>


        <div className="flex justify-end gap-2 pt-4">
          {isReadOnly ? (
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || (mode === 'service' && !form.getValues('vehicleId') && !initialDataService) }>
                {form.formState.isSubmitting ? "Guardando..." : submitButtonText}
              </Button>
            </>
          )}
        </div>
      </form>
    </Form>

    <VehicleDialog
        open={isVehicleDialogOpen}
        onOpenChange={setIsVehicleDialogOpen}
        onSave={handleSaveNewVehicle}
        vehicle={null} 
    />

    <Dialog open={isAddSupplyDialogOpen} onOpenChange={setIsAddSupplyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Añadir Insumo/Servicio al {mode === 'quote' ? 'Presupuesto' : 'Servicio'}</DialogTitle>
                <DialogDescription>Busque por nombre o SKU. Si no existe, puede crearlo.</DialogDescription>
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
                                            {item.isService ? 'Servicio' : `Stock: ${item.quantity}`} | {mode === 'quote' ? `Venta: ${formatCurrency(item.sellingPrice)}` : `Costo: ${formatCurrency(item.unitPrice)}`}
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
                    <Label htmlFor="supply-quantity">Cantidad</Label>
                    <Input
                        id="supply-quantity"
                        type="number"
                        min="1"
                        value={addSupplyQuantity}
                        onChange={(e) => setAddSupplyQuantity(parseInt(e.target.value,10) || 1 )}
                    />
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
    </>
  );
}
