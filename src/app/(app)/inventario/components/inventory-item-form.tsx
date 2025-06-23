
"use client";

import { useEffect } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";

const inventoryItemFormSchema = z.object({
  name: z.string().min(3, "El nombre del producto debe tener al menos 3 caracteres."),
  sku: z.string().optional(),
  description: z.string().optional(),
  isService: z.boolean().default(false).optional(),
  quantity: z.coerce.number().int().min(0, "La cantidad no puede ser negativa."),
  unitPrice: z.coerce.number().min(0, "El precio de compra no puede ser negativo."),
  sellingPrice: z.coerce.number().min(0, "El precio de venta no puede ser negativo."),
  lowStockThreshold: z.coerce.number().int().min(0, "El umbral de stock bajo no puede ser negativo."),
  unitType: z.enum(['units', 'ml', 'liters']).default('units').optional(),
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
      unitType: 'units',
      category: categories.length > 0 ? categories[0].name : "", 
      supplier: suppliers.length > 0 ? suppliers[0].name : "", 
    },
  });

  const isServiceWatch = form.watch("isService");
  const unitTypeWatch = form.watch("unitType");
  
  useEffect(() => {
    if (isServiceWatch) {
      form.setValue('unitType', 'units');
    }
  }, [isServiceWatch, form]);

  const handleFormSubmit = async (values: InventoryItemFormValues) => {
    const submissionValues = {
      ...values,
      quantity: values.isService ? 0 : values.quantity,
      lowStockThreshold: values.isService ? 0 : values.lowStockThreshold,
    };
    await onSubmit(submissionValues);
  };
  
  useEffect(() => { 
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="isService"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-muted/30 dark:bg-muted/50 h-full">
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
                    Marque esta casilla si el artículo es un servicio.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unitType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad de Medida</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  disabled={isServiceWatch}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una unidad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="units">Unidades (piezas, botellas)</SelectItem>
                    <SelectItem value="ml">Mililitros (líquidos)</SelectItem>
                    <SelectItem value="liters">Litros (líquidos a granel)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                    {unitTypeWatch === 'ml' 
                        ? 'Para líquidos. Los precios y cantidades serán por mililitro.'
                        : unitTypeWatch === 'liters'
                        ? 'Para líquidos a granel. Los precios y cantidades serán por litro.'
                        : 'Para productos que se venden como una sola pieza.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Producto/Servicio</FormLabel>
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
                <FormLabel>Código / SKU (Opcional)</FormLabel>
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
                <Textarea placeholder="Detalles adicionales..." {...field} />
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
                   <FormLabel>
                    {unitTypeWatch === 'ml' ? 'Cantidad Total en Stock (ml)' : unitTypeWatch === 'liters' ? 'Cantidad Total en Stock (L)' : 'Cantidad en Stock'}
                  </FormLabel>
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
                  <FormLabel>
                    {unitTypeWatch === 'ml' ? 'Umbral de Stock Bajo (ml)' : unitTypeWatch === 'liters' ? 'Umbral de Stock Bajo (L)' : 'Umbral de Stock Bajo'}
                  </FormLabel>
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
                 <FormLabel>
                  {unitTypeWatch === 'ml' ? 'Precio de Compra (por ml)' : unitTypeWatch === 'liters' ? 'Precio de Compra (por L)' : 'Precio de Compra (por unidad)'}
                </FormLabel>
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
                 <FormLabel>
                  {unitTypeWatch === 'ml' ? 'Precio de Venta (por ml, IVA Inc.)' : unitTypeWatch === 'liters' ? 'Precio de Venta (por L, IVA Inc.)' : 'Precio de Venta (por unidad, IVA Inc.)'}
                </FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ej: 15.99" {...field} />
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
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Producto/Servicio" : "Crear Producto/Servicio")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
