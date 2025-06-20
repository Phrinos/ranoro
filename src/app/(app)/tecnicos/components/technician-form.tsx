
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Technician } from "@/types";

const technicianFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  area: z.string().min(3, "El área es obligatoria."),
  specialty: z.string().min(3, "La especialidad es obligatoria."),
  contactInfo: z.string().min(7, "El teléfono debe tener al menos 7 caracteres.").optional().or(z.literal('')),
  hireDate: z.string().optional(), 
  monthlySalary: z.coerce.number().min(0, "El sueldo no puede ser negativo.").optional(),
  commissionRate: z.coerce.number().min(0, "La comisión no puede ser negativa.").max(1, "La comisión no puede ser mayor a 1 (100%).").optional(),
  notes: z.string().optional(),
});

export type TechnicianFormValues = z.infer<typeof technicianFormSchema>;

interface TechnicianFormProps {
  initialData?: Technician | null;
  onSubmit: (values: TechnicianFormValues) => Promise<void>;
  onClose: () => void;
}

export function TechnicianForm({ initialData, onSubmit, onClose }: TechnicianFormProps) {
  const form = useForm<TechnicianFormValues>({
    resolver: zodResolver(technicianFormSchema),
    defaultValues: initialData ? {
        ...initialData,
        hireDate: initialData.hireDate ? new Date(initialData.hireDate).toISOString().split('T')[0] : '',
        monthlySalary: initialData.monthlySalary ?? undefined,
        commissionRate: initialData.commissionRate ?? undefined,
        contactInfo: initialData.contactInfo ?? '',
        notes: initialData.notes ?? '',
    } : {
      name: "",
      area: "",
      specialty: "",
      contactInfo: "",
      hireDate: new Date().toISOString().split('T')[0],
      monthlySalary: undefined,
      commissionRate: 0.05, // Default 5%
      notes: "",
    },
  });

  const handleFormSubmit = async (values: TechnicianFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre Completo</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Carlos Rodríguez" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Área</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Mecánica General, Electrónica" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <FormField
            control={form.control}
            name="specialty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Especialidad</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Motores, Diagnóstico" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contactInfo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: 555-123456" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hireDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Contratación</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="monthlySalary"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Sueldo Mensual (Opcional)</FormLabel>
                    <FormControl>
                    <Input type="number" step="0.01" placeholder="Ej: 50000" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="commissionRate"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Porcentaje de Comisión (Opcional)</FormLabel>
                    <FormControl>
                    <Input type="number" step="0.01" min="0" max="1" placeholder="Ej: 0.05 (para 5%)" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>Ingrese como decimal (ej: 0.05 para 5%).</FormDescription>
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
                <Textarea placeholder="Notas adicionales sobre el miembro del staff..." {...field} />
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
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Staff" : "Crear Staff")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

