
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

const purchaseEntryFormSchema = z.object({
  sku: z.string().min(1, "El Código es obligatorio."),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1."),
  purchasePrice: z.coerce.number().min(0, "El precio de compra no puede ser negativo."),
});

export type PurchaseEntryFormValues = z.infer<typeof purchaseEntryFormSchema>;

interface PurchaseEntryFormProps {
  onSubmit: (values: PurchaseEntryFormValues) => Promise<void>;
  onClose: () => void;
}

export function PurchaseEntryForm({ onSubmit, onClose }: PurchaseEntryFormProps) {
  const form = useForm<PurchaseEntryFormValues>({
    resolver: zodResolver(purchaseEntryFormSchema),
    defaultValues: {
      sku: "",
      quantity: 1,
      purchasePrice: 0,
    },
  });

  const handleFormSubmit = async (values: PurchaseEntryFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código del Artículo (SKU)</FormLabel>
              <FormControl>
                <Input placeholder="Ej: FA-XYZ-001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cantidad Comprada</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ej: 10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="purchasePrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nuevo Precio de Costo Unitario</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="Ej: 6.50" {...field} />
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
            {form.formState.isSubmitting ? "Procesando..." : "Registrar Compra"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
