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
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, ServicePart } from "@/types";

const partSchema = z.object({
  partId: z.string().min(1, "Seleccione un repuesto"),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1"),
  unitPrice: z.coerce.number().optional(), // Will be populated
  partName: z.string().optional(), // Will be populated
});

const serviceFormSchema = z.object({
  vehicleId: z.string().min(1, "Seleccione un vehículo"),
  serviceDate: z.date({ required_error: "La fecha de servicio es obligatoria." }),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres."),
  technicianId: z.string().min(1, "Seleccione un técnico"),
  partsUsed: z.array(partSchema).optional(),
  laborHours: z.coerce.number().min(0, "Las horas de mano de obra no pueden ser negativas."),
  laborRate: z.coerce.number().min(0, "La tarifa por hora no puede ser negativa.").optional().default(2000), // Default rate
  status: z.enum(["Pendiente", "En Progreso", "Completado", "Cancelado"]),
  notes: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface ServiceFormProps {
  initialData?: ServiceRecord | null;
  vehicles: Vehicle[];
  technicians: Technician[];
  inventoryItems: InventoryItem[];
  onSubmit: (values: ServiceFormValues) => Promise<void>;
  onClose: () => void;
}

export function ServiceForm({ initialData, vehicles, technicians, inventoryItems, onSubmit, onClose }: ServiceFormProps) {
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          serviceDate: new Date(initialData.serviceDate),
          partsUsed: initialData.partsUsed.map(p => ({...p, partName: inventoryItems.find(i => i.id === p.partId)?.name || '', unitPrice: inventoryItems.find(i => i.id === p.partId)?.unitPrice || 0 })) || [],
        }
      : {
          vehicleId: "",
          serviceDate: new Date(),
          description: "",
          technicianId: "",
          partsUsed: [],
          laborHours: 0,
          laborRate: 2000,
          status: "Pendiente",
          notes: "",
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "partsUsed",
  });

  const handleFormSubmit = async (values: ServiceFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehículo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un vehículo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
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
            name="serviceDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Servicio</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
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
                        date > new Date() || date < new Date("1900-01-01")
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
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción del Servicio</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej: Cambio de aceite y filtros, revisión de frenos..." {...field} />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        
        <FormItem>
          <FormLabel>Repuestos Utilizados</FormLabel>
          {fields.map((item, index) => (
            <div key={item.id} className="flex items-end gap-2 mb-2 p-2 border rounded-md">
              <FormField
                control={form.control}
                name={`partsUsed.${index}.partId`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        const selectedPart = inventoryItems.find(p => p.id === value);
                        form.setValue(`partsUsed.${index}.unitPrice`, selectedPart?.unitPrice || 0);
                        form.setValue(`partsUsed.${index}.partName`, selectedPart?.name || '');
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione repuesto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventoryItems.map((part) => (
                          <SelectItem key={part.id} value={part.id} disabled={part.quantity === 0}>
                            {part.name} (Stock: {part.quantity}) - ${part.unitPrice}
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
                name={`partsUsed.${index}.quantity`}
                render={({ field }) => (
                  <FormItem>
                    <Input type="number" placeholder="Cant." {...field} className="w-20" />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Eliminar repuesto">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ partId: "", quantity: 1, unitPrice: 0, partName: "" })}
            className="mt-2"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Repuesto
          </Button>
        </FormItem>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="laborHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horas de Mano de Obra</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" placeholder="Ej: 2.5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="laborRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tarifa por Hora (Mano de Obra)</FormLabel>
                <FormControl>
                  <Input type="number" step="100" placeholder="Ej: 2000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas Adicionales</FormLabel>
              <FormControl>
                <Textarea placeholder="Notas internas o para el cliente..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Servicio" : "Crear Servicio")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
