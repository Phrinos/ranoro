
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
  totalServicePrice: z.coerce.number().min(0, "El precio del servicio no puede ser negativo."), 
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
    for (let hour = 8; hour <= 18; hour++) { // Adjust range as needed, e.g. 8 AM to 6:30 PM
        if (hour === 8) { // Start at 8:30 for example
            slots.push({ value: `${hour}:30`, label: `08:30 AM`});
        } else if (hour === 18) { // End at 6:30 PM for example
            slots.push({ value: `${hour}:00`, label: `${hour}:00 PM`});
            slots.push({ value: `${hour}:30`, label: `${hour}:30 PM`});
        }
         else { // Regular slots
            slots.push({ value: `${hour}:00`, label: `${String(hour).padStart(2, '0')}:00 ${hour < 12 ? 'AM' : 'PM'}`});
            slots.push({ value: `${hour}:30`, label: `${String(hour).padStart(2, '0')}:30 ${hour < 12 ? 'AM' : 'PM'}`});
        }
    }
    return slots;
};
const timeSlots = generateTimeSlots();


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
  const watchedTotalServicePrice = form.watch("totalServicePrice"); 

  const totalSuppliesCost = React.useMemo(() => {
    return watchedSupplies?.reduce((sum, supply) => {
      const item = inventoryItems.find(i => i.id === supply.supplyId);
      return sum + (item?.unitPrice || 0) * supply.quantity; 
    }, 0) || 0;
  }, [watchedSupplies, inventoryItems]);

  const serviceSubTotal = React.useMemo(() => {
    return watchedTotalServicePrice / (1 + IVA_RATE);
  }, [watchedTotalServicePrice]);
  
  const serviceTaxAmount = React.useMemo(() => {
    return watchedTotalServicePrice - serviceSubTotal;
  }, [watchedTotalServicePrice, serviceSubTotal]);


  const serviceProfit = React.useMemo(() => {
    return serviceSubTotal - totalSuppliesCost;
  }, [serviceSubTotal, totalSuppliesCost]);

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
          unitPrice: itemDetails?.unitPrice || 0, 
          supplyName: itemDetails?.name || s.supplyName,
        };
      }) || [],
      totalCost: values.totalServicePrice,
      subTotal: serviceSubTotal,
      taxAmount: serviceTaxAmount,
      totalSuppliesCost: totalSuppliesCost,
      serviceProfit: serviceProfit,
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

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        
        <Card>
            <CardHeader>
                <CardTitle>Información del Vehículo y Servicio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                 <FormField
                    control={form.control}
                    name="vehicleId"
                    render={() => ( <FormMessage /> )} 
                  />
                {selectedVehicle && (
                    <div className="p-3 border rounded-md bg-muted text-sm">
                        <p><strong>Vehículo Seleccionado:</strong> {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})</p>
                        <p><strong>Placa:</strong> {selectedVehicle.licensePlate}</p>
                        <p><strong>Propietario:</strong> {selectedVehicle.ownerName}</p>
                    </div>
                )}
                {vehicleNotFound && !selectedVehicle && !isReadOnly && (
                    <div className="p-3 border border-orange-500 rounded-md bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 text-sm text-orange-700 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 shrink-0"/>
                            <p>Vehículo con placa "{vehicleLicensePlateSearch}" no encontrado.</p>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => setIsVehicleDialogOpen(true)} className="w-full sm:w-auto">
                            <CarIcon className="mr-2 h-4 w-4"/> Registrar Nuevo Vehículo
                        </Button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
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
                    name="totalServicePrice"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-base font-semibold">Precio Total del Servicio (Cobro al Cliente, IVA Incluido)</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.01" placeholder="Ej: 1740.00" {...field} disabled={isReadOnly} className="text-lg font-medium"/>
                            </FormControl>
                            <FormDescription>Este es el monto final que pagará el cliente por el servicio completo (IVA incluido).</FormDescription>
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
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="technicianId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Técnico Asignado</FormLabel>
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
                    {["Agendado", "Pendiente", "En Progreso", "Completado", "Cancelado"].map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
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
                <CardTitle>Insumos Utilizados</CardTitle>
            </CardHeader>
            <CardContent>
                {fields.map((item, index) => (
                    <div key={item.id} className="flex items-end gap-2 mb-2 p-2 border rounded-md">
                    <FormField
                        control={form.control}
                        name={`suppliesUsed.${index}.supplyId`}
                        render={({ field }) => (
                        <FormItem className="flex-1">
                            <FormLabel className="text-xs">Insumo</FormLabel>
                            <Select 
                            onValueChange={(value) => {
                                field.onChange(value);
                                const selectedSupply = inventoryItems.find(s => s.id === value);
                                form.setValue(`suppliesUsed.${index}.unitPrice`, selectedSupply?.unitPrice || 0); 
                                form.setValue(`suppliesUsed.${index}.supplyName`, selectedSupply?.name || '');
                            }} 
                            defaultValue={field.value}
                            disabled={isReadOnly}
                            >
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Seleccione insumo" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {inventoryItems.map((supply) => (
                                <SelectItem key={supply.id} value={supply.id} disabled={(supply.quantity === 0 && supply.id !== item.supplyId) || isReadOnly}> 
                                    {supply.name} (Stock: {supply.quantity}) - Costo: {formatCurrency(supply.unitPrice)}
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
                        name={`suppliesUsed.${index}.quantity`}
                        render={({ field }) => (
                        <FormItem>
                             <FormLabel className="text-xs">Cantidad</FormLabel>
                            <Input type="number" placeholder="Cant." {...field} className="w-20" disabled={isReadOnly} />
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    {!isReadOnly && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Eliminar insumo">
                        <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                    </div>
                ))}
                {!isReadOnly && (
                    <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ supplyId: "", quantity: 1, unitPrice: 0, supplyName: "" })}
                    className="mt-2"
                    >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Insumo
                    </Button>
                )}
                 <div className="mt-4 text-sm font-medium">
                    <p>Costo Total de Insumos (para el taller): <span className="font-semibold">{formatCurrency(totalSuppliesCost)}</span></p>
                </div>
            </CardContent>
        </Card>
        
        <Card className="bg-muted/30 dark:bg-muted/20">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600"/>
                    Resumen Financiero del Servicio
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal Servicio (sin IVA):</span> <span className="font-medium">{formatCurrency(serviceSubTotal)}</span></div>
                <div className="flex justify-between"><span>IVA ({IVA_RATE * 100}%):</span> <span className="font-medium">{formatCurrency(serviceTaxAmount)}</span></div>
                <div className="flex justify-between text-base font-semibold pt-1 border-t mt-1"><span>Precio Total (IVA Incluido):</span> <span className="text-primary">{formatCurrency(watchedTotalServicePrice)}</span></div>
                <hr className="my-2 border-dashed"/>
                <div className="flex justify-between text-lg font-bold text-green-700 dark:text-green-400"><span>Ganancia Estimada del Servicio:</span> <span>{formatCurrency(serviceProfit)}</span></div>
                <p className="text-xs text-muted-foreground text-right">(Precio Total - IVA - Costo de Insumos)</p>
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
    </>
  );
}
