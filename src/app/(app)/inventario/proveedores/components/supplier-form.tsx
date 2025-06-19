
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
import type { Supplier } from "@/types";

const supplierFormSchema = z.object({
  name: z.string().min(2, "El nombre del proveedor es obligatorio."),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Ingrese un correo electrónico válido.").optional().or(z.literal('')),
  address: z.string().optional(),
  debtAmount: z.coerce.number().optional(),
  debtNote: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
  initialData?: Supplier | null;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
  onClose: () => void;
}

export function SupplierForm({ initialData, onSubmit, onClose }: SupplierFormProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: initialData || {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      debtAmount: undefined,
      debtNote: "",
    },
  });

  const handleFormSubmit = async (values: SupplierFormValues) => {
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
              <FormLabel>Nombre del Proveedor</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Repuestos Acme S.A." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Persona de Contacto (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Juan Pérez" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: 555-123456" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Opcional)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Ej: contacto@proveedor.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej: Calle Falsa 123, Ciudad, Provincia" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="debtAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto de Deuda (Opcional)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ej: 1500.50" {...field} value={field.value ?? ''} />
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
                <FormLabel>Nota de Deuda (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Factura #123 pendiente" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Proveedor" : "Crear Proveedor")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
