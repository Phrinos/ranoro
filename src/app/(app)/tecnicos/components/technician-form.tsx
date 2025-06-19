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
import type { Technician } from "@/types";

const technicianFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  specialty: z.string().min(3, "La especialidad es obligatoria."),
  contactInfo: z.string().optional(),
  hireDate: z.string().optional(), // Consider using a date picker if complex date logic is needed
});

type TechnicianFormValues = z.infer<typeof technicianFormSchema>;

interface TechnicianFormProps {
  initialData?: Technician | null;
  onSubmit: (values: TechnicianFormValues) => Promise<void>;
  onClose: () => void;
}

export function TechnicianForm({ initialData, onSubmit, onClose }: TechnicianFormProps) {
  const form = useForm<TechnicianFormValues>({
    resolver: zodResolver(technicianFormSchema),
    defaultValues: initialData || {
      name: "",
      specialty: "",
      contactInfo: "",
      hireDate: new Date().toISOString().split('T')[0], // Default to today
    },
  });

  const handleFormSubmit = async (values: TechnicianFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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
          name="specialty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Especialidad</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Mecánica General, Electricidad" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Información de Contacto (Email/Teléfono)</FormLabel>
              <FormControl>
                <Input placeholder="Ej: tecnico@email.com o 555-1234" {...field} />
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
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Técnico" : "Crear Técnico")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
