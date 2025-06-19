
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
import { CalendarIcon, PlusCircle, Search, Trash2, AlertCircle, Car as CarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, ServiceSupply } from "@/types";
import React, { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { VehicleDialog } from "../../vehiculos/components/vehicle-dialog";
import type { VehicleFormValues } from "../../vehiculos/components/vehicle-form";
import { placeholderVehicles as defaultPlaceholderVehicles } from "@/lib/placeholder-data"; // Import with alias if needed


const supplySchema = z.object({
  supplyId: z.string().min(1, "Seleccione un insumo"),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  unitPrice: z.coerce.number().optional(), // Cost price from inventory
  supplyName: z.string().optional(), 
});

const serviceFormSchema = z.object({
  vehicleId: z.number({invalid_type_error: "Debe seleccionar o registrar un vehículo."}).positive("Debe seleccionar o registrar un vehículo.").optional(),
  vehicleLicensePlateSearch: z.string().optional(), 
  serviceDate: z.date({ required_error: "La fecha de servicio es obligatoria." }),
  mileage: z.coerce.number().int().min(0, "El kilometraje no puede ser negativo.").optional(),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres."),
  technicianId: z.string().min(1, "Seleccione un técnico"),
  suppliesUsed: z.array(supplySchema).optional(),
  totalServicePrice: z.coerce.number().min(0, "El precio del servicio no puede ser negativo."), // Renamed from totalCost
  status: z.enum(["Pendiente", "En Progreso", "Completado", "Cancelado"]),
  notes: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface ServiceFormProps {
  initialData?: ServiceRecord | null;
  vehicles: Vehicle[]; 
  technicians: Technician[];
  inventoryItems: InventoryItem[];
  onSubmit: (values: Omit<ServiceFormValues, 'vehicleLicensePlateSearch'> & { totalSuppliesCost?: number; serviceProfit?: number; vehicleId: number; }) => Promise<void>; 
  onClose: () => void;
  isReadOnly?: boolean; 
  onVehicleCreated?: (newVehicle: Vehicle) => void; // Callback when a new vehicle is created
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
   // Local list of vehicles, initialized from props, can be updated by new vehicle creation
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>(parentVehicles);


  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          vehicleId: initialData.vehicleId,
          vehicleLicensePlateSearch: initialData.vehicleIdentifier || "",
          serviceDate: new Date(initialData.serviceDate),
          mileage: initialData.mileage ?? undefined, 
          suppliesUsed: initialData.suppliesUsed.map(s => ({
              supplyId: s.supplyId,
              quantity: s.quantity,
              supplyName: inventoryItems.find(i => i.id === s.supplyId)?.name || s.supplyName || '', 
              unitPrice: inventoryItems.find(i => i.id === s.supplyId)?.unitPrice || s.unitPrice || 0 
          })) || [],
          totalServicePrice: initialData.totalCost, // totalCost from record is the totalServicePrice for the form
        }
      : {
          vehicleId: undefined,
          vehicleLicensePlateSearch: "",
          serviceDate: new Date(),
          mileage: undefined, 
          description: "",
          technicianId: "",
          suppliesUsed: [],
          totalServicePrice: 0,
          status: "Pendiente",
          notes: "",
        },
  });

  useEffect(() => {
    setLocalVehicles(parentVehicles); // Sync with parent's vehicle list if it changes
  }, [parentVehicles]);


  useEffect(() => {
    // Pre-select vehicle if initialData and vehicleId are provided
    if (initialData && initialData.vehicleId) {
      const foundVehicle = localVehicles.find(v => v.id === initialData.vehicleId);
      if (foundVehicle) {
        setSelectedVehicle(foundVehicle);
        form.setValue('vehicleId', foundVehicle.id);
        setVehicleLicensePlateSearch(foundVehicle.licensePlate);
      }
    }
  }, [initialData, localVehicles, form]);

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
      id: defaultPlaceholderVehicles.reduce((maxId, v) => Math.max(v.id, maxId), 0) + 1, // Ensure unique ID for demo
      ...vehicleData,
      year: Number(vehicleData.year),
    };
    
    // Update the global placeholder list (for demo purposes, in real app this would be an API call and state update)
    defaultPlaceholderVehicles.push(newVehicle);
    setLocalVehicles(prev => [...prev, newVehicle]); // Update local list for current form session

    setSelectedVehicle(newVehicle);
    form.setValue('vehicleId', newVehicle.id, { shouldValidate: true });
    setVehicleLicensePlateSearch(newVehicle.licensePlate); // Update search bar with new plate
    setVehicleNotFound(false);
    setIsVehicleDialogOpen(false);
    toast({ title: "Vehículo Registrado", description: `Se registró ${newVehicle.make} ${newVehicle.model} (${newVehicle.licensePlate}).`});
    if (onVehicleCreated) { // Notify parent component (e.g., page)
        onVehicleCreated(newVehicle);
    }
  };


  const handleFormSubmit = async (values: ServiceFormValues) => {
    if (isReadOnly) {
      onClose(); 
      return;
    }
    // Trigger validation manually before submission, especially for vehicleId
    const isValid = await form.trigger();
    if (!isValid || !values.vehicleId) {
         if (!values.vehicleId) {
            form.setError("vehicleId", { type: "manual", message: "Debe seleccionar o registrar un vehículo." });
        }
      toast({ title: "Formulario Incompleto", description: "Por favor, revise los campos marcados.", variant: "destructive"});
      return;
    }

    const submissionData = {
      ...values, // vehicleId is already here from form state
      suppliesUsed: values.suppliesUsed?.map(s => {
        const itemDetails = inventoryItems.find(invItem => invItem.id === s.supplyId);
        return {
          supplyId: s.supplyId,
          quantity: s.quantity,
          unitPrice: itemDetails?.unitPrice || 0, 
          supplyName: itemDetails?.name || s.supplyName,
        };
      }),
      totalSuppliesCost: totalSuppliesCost,
      serviceProfit: serviceProfit,
      // totalServicePrice from form is already 'totalCost' conceptually for ServiceRecord
    };
    await onSubmit(submissionData as Omit<ServiceFormValues, 'vehicleLicensePlateSearch'> & { totalSuppliesCost?: number; serviceProfit?: number; vehicleId: number; });
  };

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        
        <Card>
            <CardHeader>
                <CardTitle>Información del Vehículo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-end gap-2">
                    <FormField
                        control={form.control}
                        name="vehicleLicensePlateSearch"
                        render={({ field }) => (
                        <FormItem className="flex-1">
                            <FormLabel>Placa del Vehículo</FormLabel>
                            <FormControl>
                            <Input 
                                placeholder="Buscar o ingresar placa..." 
                                {...field} 
                                value={vehicleLicensePlateSearch}
                                onChange={(e) => {
                                    setVehicleLicensePlateSearch(e.target.value);
                                    field.onChange(e.target.value); // Keep RHF in sync
                                }}
                                disabled={isReadOnly} 
                            />
                            </FormControl>
                             {/* FormMessage for vehicleLicensePlateSearch is not standard, vehicleId handles validation */}
                        </FormItem>
                        )}
                    />
                    {!isReadOnly && (
                        <Button type="button" onClick={handleSearchVehicle} variant="outline">
                            <Search className="mr-2 h-4 w-4" /> Buscar
                        </Button>
                    )}
                </div>
                 <FormField
                    control={form.control}
                    name="vehicleId"
                    render={() => ( <FormMessage /> )} // Only for displaying error related to vehicleId
                  />
                {selectedVehicle && (
                    <div className="p-3 border rounded-md bg-muted text-sm">
                        <p><strong>Vehículo Seleccionado:</strong> {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})</p>
                        <p><strong>Placa:</strong> {selectedVehicle.licensePlate}</p>
                        <p><strong>Propietario:</strong> {selectedVehicle.ownerName}</p>
                    </div>
                )}
                {vehicleNotFound && !selectedVehicle && !isReadOnly && (
                    <div className="p-3 border border-orange-500 rounded-md bg-orange-50 text-sm text-orange-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5"/>
                            <p>Vehículo con placa "{vehicleLicensePlateSearch}" no encontrado.</p>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => setIsVehicleDialogOpen(true)}>
                            <CarIcon className="mr-2 h-4 w-4"/> Registrar Nuevo Vehículo
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>


        <FormField
          control={form.control}
          name="serviceDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha de Servicio</FormLabel>
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
                      {field.value ? (
                        format(field.value, "PPP", { locale: es })
                      ) : (
                        <span>Seleccione una fecha</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01") || isReadOnly
                    }
                    initialFocus
                    locale={es}
                  />
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
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {["Pendiente", "En Progreso", "Completado", "Cancelado"].map((status) => (
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
                                <SelectItem key={supply.id} value={supply.id} disabled={supply.quantity === 0 || isReadOnly}> 
                                    {supply.name} (Stock: {supply.quantity}) - Costo: ${supply.unitPrice.toLocaleString('es-ES')}
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
                    <p>Costo Total de Insumos (para el taller): ${totalSuppliesCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                </div>
            </CardContent>
        </Card>

        <FormField
            control={form.control}
            name="totalServicePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">Precio Total del Servicio (Cobro al Cliente)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ej: 15000" {...field} disabled={isReadOnly} className="text-lg"/>
                </FormControl>
                <FormDescription>Este es el monto final que pagará el cliente por el servicio completo.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        
        <div className="p-4 border rounded-md bg-green-50 dark:bg-green-900/30">
            <p className="text-lg font-bold">Ganancia Estimada del Servicio: <span className="text-green-700 dark:text-green-400">${serviceProfit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span></p>
            <p className="text-xs text-muted-foreground">(Precio Total Cobrado al Cliente - Costo Total de Insumos para el Taller)</p>
        </div>

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
        vehicle={null} // Always for new vehicle creation
    />
    </>
  );
}
