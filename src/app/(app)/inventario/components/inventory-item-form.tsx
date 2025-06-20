
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
import type { InventoryItem, InventoryCategory, Supplier } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox

const inventoryItemFormSchema = z.object({
  name: z.string().min(3, "El nombre del producto debe tener al menos 3 caracteres."),
  sku: z.string().min(1, "El Código es obligatorio."),
  description: z.string().optional(),
  isService: z.boolean().default(false).optional(),
  quantity: z.coerce.number().int().min(0, "La cantidad no puede ser negativa."),
  unitPrice: z.coerce.number().min(0, "El costo unitario no puede ser negativo."),
  sellingPrice: z.coerce.number().min(0, "El precio de venta no puede ser negativo."),
  lowStockThreshold: z.coerce.number().int().min(0, "El umbral de stock bajo no puede ser negativo."),
  category: z.string().min(1, "La categoría es obligatoria."),
  supplier: z.string().min(1, "El proveedor es obligatorio."),
}).superRefine((data, ctx) => {
  if (!data.isService && data.quantity === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La cantidad es obligatoria para productos.",
      path: ["quantity"],
    });
  }
  if (!data.isService && data.lowStockThreshold === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El umbral de stock bajo es obligatorio para productos.",
      path: ["lowStockThreshold"],
    });
  }
});


export type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;

interface InventoryItemFormProps {
  initialData?: InventoryItem | null;
  onSubmit: (values: InventoryItemFormValues) => Promise<void>;
  onClose: () => void;
  categories: InventoryCategory[];
  suppliers: Supplier[];
}

export function InventoryItemForm({ initialData, onSubmit, onClose, categories, suppliers }: InventoryItemFormProps) {
  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: initialData || {
      name: "",
      sku: "",
      description: "",
      isService: false,
      quantity: 0,
      unitPrice: 0,
      sellingPrice: 0,
      lowStockThreshold: 5,
      category: categories.length > 0 ? categories[0].name : "", // Ensure default category is set if available
      supplier: suppliers.length > 0 ? suppliers[0].name : "", // Ensure default supplier is set if available
    },
  });

  const isServiceWatch = form.watch("isService");

  const handleFormSubmit = async (values: InventoryItemFormValues) => {
    const submissionValues = {
      ...values,
      quantity: values.isService ? 0 : values.quantity,
      lowStockThreshold: values.isService ? 0 : values.lowStockThreshold,
    };
    await onSubmit(submissionValues);
  };
  
  // Set default category and supplier if not already set by initialData
  React.useEffect(() => {
    if (!form.getValues('category') && categories.length > 0) {
      form.setValue('category', categories[0].name);
    }
    if (!form.getValues('supplier') && suppliers.length > 0) {
      form.setValue('supplier', suppliers[0].name);
    }
  }, [categories, suppliers, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="isService"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-muted/30 dark:bg-muted/50">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  id="isServiceCheckbox"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel htmlFor="isServiceCheckbox" className="cursor-pointer">
                  Es un servicio (no se rastrea stock)
                </FormLabel>
                <FormDescription>
                  Marque esta casilla si el artículo es un servicio o no requiere seguimiento de inventario.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Producto/Servicio</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Filtro de Aceite XYZ / Servicio de Afinación" {...field} />
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
                <FormLabel>Código / SKU</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: FA-XYZ-001 / SERV-AFI-01" {...field} />
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
                <Textarea placeholder="Detalles adicionales sobre el producto/servicio..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isServiceWatch && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="unitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costo Unitario (para el Taller)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ej: 10.50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sellingPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio de Venta (al Cliente, IVA Inc.)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ej: 15.99" {...field} />
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
                <FormLabel>Categoría</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="supplier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proveedor</FormLabel>
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un proveedor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.name}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Producto/Servicio" : "Crear Producto/Servicio")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
