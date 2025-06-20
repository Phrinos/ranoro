
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
import type { AdministrativeStaff } from "@/types";

const administrativeStaffFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  roleOrArea: z.string().min(3, "El rol o área es obligatorio."),
  contactInfo: z.string().min(7, "El teléfono debe tener al menos 7 caracteres.").optional().or(z.literal('')),
  hireDate: z.string().optional(), 
  monthlySalary: z.coerce.number().min(0, "El sueldo no puede ser negativo.").optional(),
  notes: z.string().optional(),
});

export type AdministrativeStaffFormValues = z.infer<typeof administrativeStaffFormSchema>;

interface AdministrativeStaffFormProps {
  initialData?: AdministrativeStaff | null;
  onSubmit: (values: AdministrativeStaffFormValues) => Promise<void>;
  onClose: () => void;
}

export function AdministrativeStaffForm({ initialData, onSubmit, onClose }: AdministrativeStaffFormProps) {
  const form = useForm<AdministrativeStaffFormValues>({
    resolver: zodResolver(administrativeStaffFormSchema),
    defaultValues: initialData ? {
        ...initialData,
        hireDate: initialData.hireDate ? new Date(initialData.hireDate).toISOString().split('T')[0] : '',
        monthlySalary: initialData.monthlySalary ?? undefined,
        contactInfo: initialData.contactInfo ?? '',
        notes: initialData.notes ?? '',
    } : {
      name: "",
      roleOrArea: "",
      contactInfo: "",
      hireDate: new Date().toISOString().split('T')[0],
      monthlySalary: undefined,
      notes: "",
    },
  });

  const handleFormSubmit = async (values: AdministrativeStaffFormValues) => {
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
                  <Input placeholder="Ej: Ana López" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="roleOrArea"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol o Área</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Gerente, Recepción" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
        <FormField
            control={form.control}
            name="monthlySalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sueldo Mensual (Opcional)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ej: 15000" {...field} value={field.value ?? ''} />
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
              <FormLabel>Notas (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Notas adicionales sobre el personal..." {...field} />
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
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Personal" : "Crear Personal")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
