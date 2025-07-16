
"use client";

import { useEffect } from "react";
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
import type { AdministrativeStaff } from "@/types";
import { DollarSign } from "lucide-react";
import { capitalizeWords } from "@/lib/utils";

const administrativeStaffFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  roleOrArea: z.string().min(3, "El rol o área es obligatorio."),
  contactInfo: z.string().min(7, "El teléfono debe tener al menos 7 caracteres.").optional().or(z.literal('')),
  hireDate: z.string().optional(), 
  monthlySalary: z.coerce.number().min(0, "El sueldo no puede ser negativo.").optional(),
  commissionRate: z.coerce.number().min(0, "La comisión no puede ser negativa.").max(1, "La comisión no puede ser mayor a 1 (100%).").optional(),
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
        commissionRate: initialData.commissionRate ?? undefined,
        contactInfo: initialData.contactInfo ?? '',
        notes: initialData.notes ?? '',
    } : {
      name: "",
      roleOrArea: "",
      contactInfo: "",
      hireDate: "", // Set to empty initially
      monthlySalary: undefined,
      commissionRate: 0.01, // Default 1%
      notes: "",
    },
  });
  
  useEffect(() => {
    // If it's a new form, set the default date on the client side to prevent hydration errors.
    if (!initialData) {
      form.setValue('hireDate', new Date().toISOString().split('T')[0]);
    }
  }, [initialData, form]);


  const handleFormSubmit = async (values: AdministrativeStaffFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form id="admin-staff-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre Completo</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Ana López" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} />
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
                  <Input placeholder="Ej: Gerente, Recepción" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="monthlySalary"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Sueldo Mensual (Opcional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" step="0.01" placeholder="15000.00" {...field} value={field.value ?? ''} className="pl-8" />
                      </div>
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
                    <Input type="number" step="0.001" min="0" max="1" placeholder="0.01 (para 1%)" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>Ingrese como decimal (ej: 0.01 para 1%).</FormDescription>
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
                <Textarea placeholder="Notas adicionales sobre el personal..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* The submit buttons are now in the dialog footer */}
      </form>
    </Form>
  );
}
