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
import type { InventoryItem } from "@/types";

const inventoryItemFormSchema = z.object({
  name: z.string().min(3, "El nombre del artículo debe tener al menos 3 caracteres."),
  sku: z.string().min(1, "El SKU es obligatorio."),
  description: z.string().optional(),
  quantity: z.coerce.number().int().min(0, "La cantidad no puede ser negativa."),
  unitPrice: z.coerce.number().min(0, "El precio unitario no puede ser negativo."),
  lowStockThreshold: z.coerce.number().int().min(0, "El umbral de stock bajo no puede ser negativo."),
  category: z.string().optional(),
  supplier: z.string().optional(),
});

type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;

interface InventoryItemFormProps {
  initialData?: InventoryItem | null;
  onSubmit: (values: InventoryItemFormValues) => Promise<void>;
  onClose: () => void;
}

export function InventoryItemForm({ initialData, onSubmit, onClose }: InventoryItemFormProps) {
  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: initialData || {
      name: "",
      sku: "",
      description: "",
      quantity: 0,
      unitPrice: 0,
      lowStockThreshold: 5,
      category: "",
      supplier: "",
    },
  });

  const handleFormSubmit = async (values: InventoryItemFormValues) => {
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
                <FormLabel>Nombre del Artículo</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Filtro de Aceite XYZ" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU / Código de Barras</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: FA-XYZ-001" {...field} />
                </FormControl>
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
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalles adicionales sobre el artículo..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cantidad en Stock</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ej: 50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio Unitario</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ej: 15.99" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lowStockThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Umbral de Stock Bajo</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ej: 5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Filtros, Frenos" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="supplier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proveedor (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Repuestos Acme" {...field} />
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
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Artículo" : "Crear Artículo")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
