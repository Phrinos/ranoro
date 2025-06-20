
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
import { CalendarIcon, PlusCircle, Search, Trash2, AlertCircle, Car as CarIcon, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, setHours, setMinutes, isValid, startOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, ServiceSupply } from "@/types";
import React, { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { VehicleDialog } from "../../vehiculos/components/vehicle-dialog";
import type { VehicleFormValues } from "../../vehiculos/components/vehicle-form";
import { placeholderVehicles as defaultPlaceholderVehicles } from "@/lib/placeholder-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";


const supplySchema = z.object({
  supplyId: z.string().min(1, "Seleccione un insumo"),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  unitPrice: z.coerce.number().optional(), 
  supplyName: z.string().optional(), 
});

const serviceFormSchema = z.object({
  vehicleId: z.number({invalid_type_error: "Debe seleccionar o registrar un vehículo."}).positive("Debe seleccionar o registrar un vehículo.").optional(),
  vehicleLicensePlateSearch: z.string().optional(), 
  serviceDate: z.date({ required_error: "La fecha y hora de servicio son obligatorias." }),
  mileage: z.coerce.number().int().min(0, "El kilometraje no puede ser negativo.").optional(),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres."),
  totalServicePrice: z.coerce.number().min(0, "El costo del servicio no puede ser negativo."), 
  notes: z.string().optional(),
  technicianId: z.string().min(1, "Seleccione un técnico"),
  suppliesUsed: z.array(supplySchema).optional(),
  status: z.enum(["Agendado", "Pendiente", "En Progreso", "Completado", "Cancelado"]),
  deliveryDateTime: z.date().optional(),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface ServiceFormProps {
  initialData?: ServiceRecord | null;
  vehicles: Vehicle[]; 
  technicians: Technician[];
  inventoryItems: InventoryItem[];
  onSubmit: (data: ServiceRecord) => Promise<void>; 
  onClose: () => void;
  isReadOnly?: boolean; 
  onVehicleCreated?: (newVehicle: Vehicle) => void; 
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


interface AddSupplyDialogState {
  selectedSupplyId: string;
  quantity: number;
}

export function ServiceForm({ 
  initialData, 
  vehicles: parentVehicles, 
  technicians, 
  inventoryItems, 
  onSubmit, 
  onClose, 
  isReadOnly = false,
  onVehicleCreated
}: ServiceFormProps) {
  const { toast } = useToast();
  const [vehicleLicensePlateSearch, setVehicleLicensePlateSearch] = useState(initialData?.vehicleIdentifier || "");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleNotFound, setVehicleNotFound] = useState(false);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>(parentVehicles);

  const [isAddSupplyDialogOpen, setIsAddSupplyDialogOpen] = useState(false);
  const [addSupplyDialogState, setAddSupplyDialogState] = useState<AddSupplyDialogState>({ selectedSupplyId: '', quantity: 1 });


  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          vehicleId: initialData.vehicleId,
          vehicleLicensePlateSearch: initialData.vehicleIdentifier || "",
          serviceDate: initialData.serviceDate ? parseISO(initialData.serviceDate) : new Date(),
          deliveryDateTime: initialData.deliveryDateTime ? parseISO(initialData.deliveryDateTime) : undefined,
          mileage: initialData.mileage ?? undefined, 
          suppliesUsed: initialData.suppliesUsed.map(s => ({
              supplyId: s.supplyId,
              quantity: s.quantity,
              supplyName: inventoryItems.find(i => i.id === s.supplyId)?.name || s.supplyName || '', 
              unitPrice: inventoryItems.find(i => i.id === s.supplyId)?.unitPrice || s.unitPrice || 0 
          })) || [],
          totalServicePrice: initialData.totalCost, 
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
          status: "Agendado", 
          notes: "",
        },
  });

  useEffect(() => {
    setLocalVehicles(parentVehicles); 
  }, [parentVehicles]);


  useEffect(() => {
    if (initialData && initialData.vehicleId) {
      const foundVehicle = localVehicles.find(v => v.id === initialData.vehicleId);
      if (foundVehicle) {
        setSelectedVehicle(foundVehicle);
        form.setValue('vehicleId', foundVehicle.id);
        setVehicleLicensePlateSearch(foundVehicle.licensePlate);
      }
    }
     if (initialData && initialData.serviceDate) {
      const parsedDate = parseISO(initialData.serviceDate);
      if (isValid(parsedDate)) {
        form.setValue('serviceDate', parsedDate);
      }
    }
  }, [initialData, localVehicles, form]);
  
  const watchedStatus = form.watch("status");

  useEffect(() => {
    if (watchedStatus === "Completado" && !form.getValues("deliveryDateTime")) {
      form.setValue("deliveryDateTime", new Date());
    }
  }, [watchedStatus, form]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "suppliesUsed",
  });

  const watchedSupplies = form.watch("suppliesUsed");
  const watchedTotalServicePrice = form.watch("totalServicePrice") || 0; 

  const totalSuppliesCost = React.useMemo(() => {
    return watchedSupplies?.reduce((sum, supply) => {
      const item = inventoryItems.find(i => i.id === supply.supplyId);
      return sum + (item?.unitPrice || supply.unitPrice || 0) * supply.quantity; 
    }, 0) || 0;
  }, [watchedSupplies, inventoryItems]);

  const serviceProfit = React.useMemo(() => {
    return watchedTotalServicePrice - totalSuppliesCost;
  }, [watchedTotalServicePrice, totalSuppliesCost]);

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
    if (!isValidForm || !values.vehicleId) {
         if (!values.vehicleId) {
            form.setError("vehicleId", { type: "manual", message: "Debe seleccionar o registrar un vehículo." });
        }
      toast({ title: "Formulario Incompleto", description: "Por favor, revise los campos marcados.", variant: "destructive"});
      return;
    }
    
    const currentTotalServicePrice = values.totalServicePrice || 0;
    const currentTotalSuppliesCost = totalSuppliesCost; 

    const completeServiceData: ServiceRecord = {
      id: initialData?.id || `S_NEW_${Date.now()}`, 
      vehicleId: values.vehicleId!,
      vehicleIdentifier: selectedVehicle?.licensePlate || values.vehicleLicensePlateSearch,
      serviceDate: values.serviceDate.toISOString(),
      deliveryDateTime: values.deliveryDateTime ? values.deliveryDateTime.toISOString() : undefined,
      description: values.description,
      technicianId: values.technicianId,
      technicianName: technicians.find(t => t.id === values.technicianId)?.name,
      status: values.status,
      mileage: values.mileage,
      notes: values.notes,
      suppliesUsed: values.suppliesUsed?.map(s => {
        const itemDetails = inventoryItems.find(invItem => invItem.id === s.supplyId);
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
      totalSuppliesCost: currentTotalSuppliesCost, 
      serviceProfit: currentTotalServicePrice - currentTotalSuppliesCost, 
    };
    
    await onSubmit(completeServiceData);
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
  
  const handleAddSupplyFromDialog = () => {
    const { selectedSupplyId, quantity } = addSupplyDialogState;
    if (!selectedSupplyId || quantity <= 0) {
      toast({ title: "Datos incompletos", description: "Seleccione un insumo y una cantidad válida.", variant: "destructive" });
      return;
    }
    const supplyItem = inventoryItems.find(item => item.id === selectedSupplyId);
    if (!supplyItem) {
      toast({ title: "Insumo no encontrado", variant: "destructive" });
      return;
    }

    append({
      supplyId: supplyItem.id,
      supplyName: supplyItem.name,
      quantity: quantity,
      unitPrice: supplyItem.unitPrice,
    });
    
    setAddSupplyDialogState({ selectedSupplyId: '', quantity: 1 }); 
    setIsAddSupplyDialogOpen(false);
  };

  const handleVehiclePlateKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearchVehicle();
    }
  };


  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Información del Vehículo y Servicio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
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
                                {["Agendado", "Pendiente", "En Progreso", "Completado", "Cancelado"].map((statusVal) => (
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
                    <div className="flex flex-col sm:flex-row items-end gap-2">
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
                            <Button type="button" onClick={handleSearchVehicle} variant="outline" className="w-full sm:w-auto mt-2 sm:mt-0">
                                <Search className="mr-2 h-4 w-4" /> Buscar
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
                        <FormLabel>Fecha y Hora de Recepción</FormLabel>
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
                        <FormLabel>Descripción del Servicio</FormLabel>
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
                            <Textarea placeholder="Notas internas o para el cliente..." {...field} disabled={isReadOnly} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 items-end">
                    <FormField
                        control={form.control}
                        name="technicianId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg">Técnico Asignado</FormLabel>
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
                            <FormItem>
                                <FormLabel className="text-lg">Costo del Servicio (IVA incluido)</FormLabel>
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
        
        {watchedStatus === "Completado" && (
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
                <CardTitle className="text-lg">Insumos Utilizados</CardTitle>
            </CardHeader>
            <CardContent>
                {fields.length > 0 && (
                    <div className="rounded-md border mb-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Insumo</TableHead>
                                    <TableHead className="text-center">Cant.</TableHead>
                                    <TableHead className="text-right">Costo Unit.</TableHead>
                                    <TableHead className="text-right">Costo Total</TableHead>
                                    {!isReadOnly && <TableHead className="text-right">Acción</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => {
                                    const currentItem = inventoryItems.find(invItem => invItem.id === item.supplyId);
                                    const unitCost = item.unitPrice || currentItem?.unitPrice || 0;
                                    const totalCost = unitCost * item.quantity;
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.supplyName || currentItem?.name || 'N/A'}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(unitCost)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(totalCost)}</TableCell>
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
                        setAddSupplyDialogState({ selectedSupplyId: '', quantity: 1 }); 
                        setIsAddSupplyDialogOpen(true);
                    }}
                    className="mt-4"
                    >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Insumo
                    </Button>
                )}
                <div className="mt-4 text-sm font-medium text-right">
                    <p>Costo Total de Insumos (para el taller): <span className="font-semibold">{formatCurrency(totalSuppliesCost)}</span></p>
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
            <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between pt-1">
                    <span>Costo del Servicio (Cliente, IVA Incluido):</span> 
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(watchedTotalServicePrice)}</span>
                </div>
                <div className="flex justify-between">
                    <span>(-) Costo Insumos (Taller):</span> 
                    <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(totalSuppliesCost)}</span>
                </div>
                <hr className="my-2 border-dashed"/>
                <div className="flex justify-between font-bold text-green-700 dark:text-green-400 text-base">
                    <span>(=) Ganancia Estimada del Servicio:</span> 
                    <span>{formatCurrency(serviceProfit)}</span>
                </div>
                <p className="text-xs text-muted-foreground text-right">(Costo del Servicio (Cliente, IVA Inc) - Costo Insumos (Taller, sin IVA))</p>
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
              <Button type="submit" disabled={form.formState.isSubmitting || (!form.getValues('vehicleId') && !initialData) }>
                {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Servicio" : "Crear Servicio")}
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
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Añadir Insumo al Servicio</DialogTitle>
                <DialogDescription>Seleccione el insumo y la cantidad a utilizar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="supply-select">Insumo</Label>
                    <Select
                        value={addSupplyDialogState.selectedSupplyId}
                        onValueChange={(value) => setAddSupplyDialogState(prev => ({...prev, selectedSupplyId: value}))}
                    >
                        <SelectTrigger id="supply-select">
                            <SelectValue placeholder="Seleccione un insumo" />
                        </SelectTrigger>
                        <SelectContent>
                            {inventoryItems.map((supply) => (
                                <SelectItem key={supply.id} value={supply.id} disabled={supply.quantity === 0}>
                                    {supply.name} (Stock: {supply.quantity}) - Costo: {formatCurrency(supply.unitPrice)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="supply-quantity">Cantidad</Label>
                    <Input
                        id="supply-quantity"
                        type="number"
                        min="1"
                        value={addSupplyDialogState.quantity}
                        onChange={(e) => setAddSupplyDialogState(prev => ({...prev, quantity: parseInt(e.target.value,10) || 1 }))}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddSupplyDialogOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={handleAddSupplyFromDialog}>Añadir Insumo</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

