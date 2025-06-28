
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Vehicle } from "@/types";
import { useEffect } from "react";
import { capitalizeWords } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

const vehicleFormSchema = z.object({
  make: z.string().min(2, "La marca debe tener al menos 2 caracteres."),
  model: z.string().min(1, "El modelo es obligatorio."),
  year: z.coerce.number().min(1900, "El año debe ser posterior a 1900.").max(2040, `El año no puede ser mayor a 2040.`),
  vin: z.string().length(17, "El VIN debe tener 17 caracteres.").optional().or(z.literal('')),
  licensePlate: z.string().min(1, "La placa no puede estar vacía. Ingrese 'SINPLACA' si es necesario."),
  color: z.string().optional(),
  ownerName: z.string().min(2, "El nombre del propietario es obligatorio."),
  ownerPhone: z.string().min(7, "Ingrese un número de teléfono válido."),
  ownerEmail: z.string().email("Ingrese un correo electrónico válido.").optional().or(z.literal('')),
  notes: z.string().optional(),
  dailyRentalCost: z.coerce.number().optional(),
  gpsMonthlyCost: z.coerce.number().optional(),
  adminMonthlyCost: z.coerce.number().optional(),
  insuranceMonthlyCost: z.coerce.number().optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

interface VehicleFormProps {
  initialData?: Partial<Vehicle> | null;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
  onClose: () => void;
}

export function VehicleForm({ initialData, onSubmit, onClose }: VehicleFormProps) {
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: initialData ?
    {
      ...initialData,
      ownerPhone: initialData.ownerPhone || "",
      ownerEmail: initialData.ownerEmail || "",
      color: initialData.color || "",
      notes: initialData.notes || "",
      dailyRentalCost: initialData.dailyRentalCost ?? undefined,
      gpsMonthlyCost: initialData.gpsMonthlyCost ?? undefined,
      adminMonthlyCost: initialData.adminMonthlyCost ?? undefined,
      insuranceMonthlyCost: initialData.insuranceMonthlyCost ?? undefined,
    }
    : {
      make: "",
      model: "",
      year: undefined,
      vin: "",
      licensePlate: "",
      color: "",
      ownerName: "",
      ownerPhone: "",
      ownerEmail: "",
      notes: "",
      dailyRentalCost: undefined,
      gpsMonthlyCost: undefined,
      adminMonthlyCost: undefined,
      insuranceMonthlyCost: undefined,
    },
  });

  useEffect(() => {
    if (!initialData?.year) {
      form.setValue('year', new Date().getFullYear());
    }
    if(initialData?.licensePlate) {
        form.setValue('licensePlate', initialData.licensePlate);
    }
  }, [initialData, form]);

  const handleFormSubmit = async (values: VehicleFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Toyota" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Corolla" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Año</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ej: 2020" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="licensePlate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placa</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: PQR-123" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Rojo" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
            control={form.control}
            name="vin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VIN (Número de Chasis) (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="17 caracteres" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        <FormField
          control={form.control}
          name="ownerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Propietario</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Juan Pérez" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ownerPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono del Propietario</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: 555-123456" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ownerEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email del Propietario (Opcional)</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Ej: juan.perez@email.com" {...field} onChange={(e) => field.onChange(e.target.value.toLowerCase())} />
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
                <FormLabel>Notas (Opcional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Notas adicionales sobre el vehículo..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        
        {initialData?.isFleetVehicle && (
          <Card>
            <CardHeader>
              <CardTitle>Costos de Flotilla</CardTitle>
              <CardDescription>Establece los costos de renta y deducciones para este vehículo de la flotilla.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="dailyRentalCost" render={({ field }) => ( <FormItem><FormLabel>Costo de Renta Diario</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" placeholder="250.00" {...field} value={field.value ?? ''} className="pl-8" /></div></FormControl><FormMessage/></FormItem> )}/>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField control={form.control} name="gpsMonthlyCost" render={({ field }) => ( <FormItem><FormLabel>Deducción GPS (Mensual)</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" placeholder="150.00" {...field} value={field.value ?? ''} className="pl-8" /></div></FormControl><FormMessage/></FormItem> )}/>
                 <FormField control={form.control} name="adminMonthlyCost" render={({ field }) => ( <FormItem><FormLabel>Deducción Admin (Mensual)</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" placeholder="200.00" {...field} value={field.value ?? ''} className="pl-8" /></div></FormControl><FormMessage/></FormItem> )}/>
                 <FormField control={form.control} name="insuranceMonthlyCost" render={({ field }) => ( <FormItem><FormLabel>Deducción Seguro (Mensual)</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" placeholder="250.00" {...field} value={field.value ?? ''} className="pl-8" /></div></FormControl><FormMessage/></FormItem> )}/>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : (initialData && 'id' in initialData ? "Actualizar Vehículo" : "Crear Vehículo")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
