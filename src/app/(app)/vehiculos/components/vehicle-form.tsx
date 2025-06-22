
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

const vehicleFormSchema = z.object({
  make: z.string().min(2, "La marca debe tener al menos 2 caracteres."),
  model: z.string().min(1, "El modelo es obligatorio."),
  year: z.coerce.number().min(1900, "El año debe ser posterior a 1900.").max(new Date().getFullYear() + 1, `El año no puede ser mayor a ${new Date().getFullYear() + 1}.`),
  vin: z.string().length(17, "El VIN debe tener 17 caracteres.").optional().or(z.literal('')),
  licensePlate: z.string().min(3, "La placa debe tener al menos 3 caracteres."),
  color: z.string().optional(), // Added
  ownerName: z.string().min(2, "El nombre del propietario es obligatorio."),
  ownerPhone: z.string().min(7, "Ingrese un número de teléfono válido."),
  ownerEmail: z.string().email("Ingrese un correo electrónico válido.").optional().or(z.literal('')),
  notes: z.string().optional(), // Added
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>; // Export type

interface VehicleFormProps {
  initialData?: Vehicle | null;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
  onClose: () => void;
}

// Helper functions for text transformation
const capitalizeWords = (str: string) => {
  if (!str) return '';
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

const capitalizeSentences = (str: string) => {
    if (!str) return '';
    let processedStr = str.trim();
    // Capitalize the very first letter of the whole string
    processedStr = processedStr.charAt(0).toUpperCase() + processedStr.slice(1);
    // Capitalize the letter after each period and one or more spaces
    processedStr = processedStr.replace(/(\.\s+)([a-z])/g, (_match, p1, p2) => p1 + p2.toUpperCase());
    return processedStr;
};


export function VehicleForm({ initialData, onSubmit, onClose }: VehicleFormProps) {
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: initialData ?
    {
      ...initialData,
      ownerPhone: initialData.ownerPhone || "",
      ownerEmail: initialData.ownerEmail || "",
      color: initialData.color || "", // Added
      notes: initialData.notes || "", // Added
    }
    : {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      vin: "",
      licensePlate: "",
      color: "", // Added
      ownerName: "",
      ownerPhone: "",
      ownerEmail: "",
      notes: "", // Added
    },
  });

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
                  <Input type="number" placeholder="Ej: 2020" {...field} />
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
                  <Input placeholder="17 caracteres" {...field} />
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
                  <Textarea placeholder="Notas adicionales sobre el vehículo..." {...field} onChange={(e) => field.onChange(capitalizeSentences(e.target.value))} />
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
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Vehículo" : "Crear Vehículo")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
