
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Driver } from "@/types";
import { DollarSign } from "lucide-react";
import { capitalizeWords } from "@/lib/utils";

const driverFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  address: z.string().min(5, "La dirección es obligatoria."),
  phone: z.string().min(7, "Ingrese un número de teléfono válido."),
  emergencyPhone: z.string().min(7, "Ingrese un teléfono de emergencia válido."),
  depositAmount: z.coerce.number().min(0, "El depósito no puede ser negativo.").optional(),
  contractDate: z.string().optional(),
  debtAmount: z.coerce.number().min(0, "La deuda no puede ser negativa.").optional(),
  debtNote: z.string().optional(),
});

export type DriverFormValues = z.infer<typeof driverFormSchema>;

interface DriverFormProps {
  initialData?: Driver | null;
  onSubmit: (values: DriverFormValues) => Promise<void>;
  onClose: () => void;
}

export function DriverForm({ initialData, onSubmit, onClose }: DriverFormProps) {
  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: initialData ? {
        ...initialData,
        depositAmount: initialData.depositAmount ?? undefined,
        contractDate: initialData.contractDate ? new Date(initialData.contractDate).toISOString().split('T')[0] : '',
        debtAmount: initialData.debtAmount ?? undefined,
        debtNote: initialData.debtNote ?? '',
    } : {
      name: "",
      address: "",
      phone: "",
      emergencyPhone: "",
      depositAmount: undefined,
      contractDate: '',
      debtAmount: undefined,
      debtNote: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl><Input placeholder="Ej: Juan Pérez" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl><Textarea placeholder="Calle, número, colonia, ciudad..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl><Input placeholder="Ej: 4491234567" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="emergencyPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono de Emergencia</FormLabel>
                <FormControl><Input placeholder="Ej: 4497654321" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Depósito en Garantía</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" step="0.01" placeholder="Ej: 2500.00" {...field} value={field.value ?? ''} className="pl-8" />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="contractDate"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Fecha del Contrato</FormLabel>
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
                name="debtAmount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Deuda Adicional</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" step="0.01" placeholder="Deuda manual" {...field} value={field.value ?? ''} className="pl-8" />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="debtNote"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Nota de Deuda</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Costo de llanta ponchada" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
         </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Conductor" : "Crear Conductor")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
