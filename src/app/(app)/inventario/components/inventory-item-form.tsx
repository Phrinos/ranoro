
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
import type { InventoryCategory, Supplier } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, PlusCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { capitalizeWords } from '@/lib/utils';

const inventoryItemFormSchema = z.object({
  name: z.string().min(3, "El nombre del producto debe tener al menos 3 caracteres."),
  brand: z.string().min(2, "La marca es obligatoria."),
  sku: z.string().optional(),
  description: z.string().optional(),
  isService: z.boolean().default(false).optional(),
  quantity: z.coerce.number().int().min(0, "La cantidad no puede ser negativa.").optional(),
  unitPrice: z.coerce.number().min(0, "El precio de compra no puede ser negativo.").optional(),
  sellingPrice: z.coerce.number().min(0, "El precio de venta no puede ser negativo.").optional(),
  lowStockThreshold: z.coerce.number().int().min(0, "El umbral de stock bajo no puede ser negativo."),
  unitType: z.enum(['units', 'ml', 'liters']).default('units'),
  category: z.string().min(1, "La categoría es obligatoria."),
  supplier: z.string().min(1, "El proveedor es obligatorio."),
  rendimiento: z.coerce.number().int().min(0, "El rendimiento debe ser un número positivo.").optional(),
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
  initialData?: Partial<InventoryItemFormValues> | null;
  onSubmit: (values: InventoryItemFormValues) => Promise<void>;
  onClose: () => void;
  categories: InventoryCategory[];
  suppliers: Supplier[];
  onNewSupplier: () => void;
  onNewCategory: () => void;
}

export function InventoryItemForm({ initialData, onSubmit, onClose, categories, suppliers, onNewSupplier, onNewCategory }: InventoryItemFormProps) {
  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: initialData ? {
        ...initialData,
        unitType: initialData.unitType || 'units',
        rendimiento: 'rendimiento' in initialData ? initialData.rendimiento : undefined
    } : {
      name: "",
      brand: "",
      sku: "",
      description: "",
      isService: false,
      quantity: undefined,
      unitPrice: undefined,
      sellingPrice: undefined,
      lowStockThreshold: 5,
      unitType: 'units',
      category: categories.length > 0 ? categories[0].name : "", 
      supplier: suppliers.length > 0 ? suppliers[0].name : "",
      rendimiento: undefined,
    },
  });

  const { watch, setValue } = form;
  const unitPrice = watch("unitPrice");
  const isServiceWatch = watch("isService");
  const unitTypeWatch = watch("unitType");
  const categoryWatch = watch("category");
  const suppliersWatch = watch("supplier"); // Watch for changes to update default

  useEffect(() => {
    if (unitPrice !== undefined && unitPrice >= 0) {
      const markup = 1.20; // 20% markup
      const newSellingPrice = unitPrice * markup;
      const roundedSellingPrice = parseFloat(newSellingPrice.toFixed(2));
      setValue('sellingPrice', roundedSellingPrice, { shouldValidate: true });
    }
  }, [unitPrice, setValue]);
  
  useEffect(() => {
    if (isServiceWatch) {
      form.setValue('unitType', 'units');
    }
  }, [isServiceWatch, form]);

  const handleFormSubmit = async (values: InventoryItemFormValues) => {
    const submissionValues = {
      ...values,
      quantity: values.isService ? 0 : values.quantity || 0,
      lowStockThreshold: values.isService ? 0 : values.lowStockThreshold,
      unitPrice: values.unitPrice || 0,
      sellingPrice: values.sellingPrice || 0,
    };
    await onSubmit(submissionValues);
  };
  
  useEffect(() => {
    // Set default category if not set and categories are available
    if (!form.getValues('category') && categories.length > 0) {
      form.setValue('category', categories[0].name);
    }
  }, [categories, form]);
  
  useEffect(() => {
     // Set default supplier if not set and suppliers are available
    if (!form.getValues('supplier') && suppliers.length > 0) {
      form.setValue('supplier', suppliers[0].name);
    }
  }, [suppliers, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
            <CardDescription>Detalles básicos del producto o servicio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Seleccione un proveedor" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.name}>{supplier.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon" onClick={onNewSupplier}><PlusCircle className="h-4 w-4"/></Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Seleccione una categoría" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon" onClick={onNewCategory}><PlusCircle className="h-4 w-4"/></Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl><Input placeholder="Ej: Gonher" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Producto/Servicio</FormLabel>
                    <FormControl><Input placeholder="Ej: Filtro de Aceite XYZ" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código / SKU (Opcional)</FormLabel>
                  <FormControl><Input placeholder="Ej: FA-XYZ-001" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl><Input placeholder="Detalles adicionales..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <FormField
                control={form.control}
                name="unitType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad de Medida</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isServiceWatch}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Seleccione una unidad" /></SelectTrigger>
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
              <FormField
                control={form.control}
                name="isService"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-muted/30 dark:bg-muted/50 h-full mt-auto">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} id="isServiceCheckbox" />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel htmlFor="isServiceCheckbox" className="cursor-pointer">Es un servicio</FormLabel>
                      <FormDescription>No se rastreará stock para este ítem.</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            {!isServiceWatch && categoryWatch?.toLowerCase().includes('aceite') && (
              <FormField
                control={form.control}
                name="rendimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rendimiento del Aceite (km)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ej: 10000" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>Duración estimada del aceite en kilómetros antes del próximo cambio.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>
        
        {!isServiceWatch && (
          <Card>
            <CardHeader>
              <CardTitle>Precios y Stock</CardTitle>
              <CardDescription>Define los costos y controla el inventario del producto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" step="0.01" placeholder="10.50" {...field} value={field.value ?? ''} className="pl-8" />
                        </div>
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
                        {unitTypeWatch === 'ml' ? 'Precio de Venta (por ml)' : unitTypeWatch === 'liters' ? 'Precio de Venta (por L)' : 'Precio de Venta (por unidad)'}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" step="0.01" placeholder="15.99" {...field} value={field.value ?? ''} className="pl-8" />
                        </div>
                      </FormControl>
                      <FormDescription>Calculado automáticamente con 20% de ganancia sobre el costo. Puede modificarlo.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                        <Input type="number" placeholder="Ej: 50" {...field} value={field.value ?? ''} />
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
                        <Input type="number" placeholder="Ej: 5" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Ítem" : "Crear Ítem")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
