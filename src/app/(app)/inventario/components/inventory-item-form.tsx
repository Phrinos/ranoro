//src/app/(app)/inventario/components/inventory-item-form.tsx
"use client";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryItem, InventoryCategory, Supplier } from "@/types";
import { capitalizeWords } from "@/lib/utils";
import { DollarSign } from "lucide-react";
import { inventoryItemFormSchema } from '@/schemas/inventory-item-form-schema';

export type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;

interface InventoryItemFormProps {
  id: string; // Form ID
  initialData?: Partial<InventoryItem> | null;
  onSubmit: (values: InventoryItemFormValues) => Promise<void>;
  categories: InventoryCategory[];
  suppliers: Supplier[];
}

export function InventoryItemForm({ id, initialData, onSubmit, categories, suppliers }: InventoryItemFormProps) {
  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemFormSchema) as Resolver<InventoryItemFormValues>,
    defaultValues: {
      name: initialData?.name || "",
      brand: (initialData as any)?.brand || "",
      sku: initialData?.sku || "",
      description: initialData?.description || "",
      isService: initialData?.isService || false,
      quantity: initialData?.quantity ?? 0,
      unitPrice: initialData?.unitPrice ?? 0,
      sellingPrice: initialData?.sellingPrice ?? 0,
      lowStockThreshold: initialData?.lowStockThreshold ?? 5,
      unitType: initialData?.unitType || 'units',
      category: initialData?.category || (categories.length > 0 ? categories[0].name : ""),
      supplier: initialData?.supplier || (suppliers.length > 0 ? suppliers[0].name : ""),
      rendimiento: (initialData as any)?.rendimiento ?? undefined,
    },
  });

  const isService = form.watch("isService");
  const unitType = form.watch("unitType");

  React.useEffect(() => {
    if (isService) {
      form.unregister(["quantity", "lowStockThreshold", "unitType", "rendimiento"]);
      form.setValue("quantity", undefined, { shouldValidate: false, shouldDirty: true });
      form.setValue("lowStockThreshold", undefined, { shouldValidate: false, shouldDirty: true });
      form.setValue("unitType", "units", { shouldValidate: false, shouldDirty: true });
      form.setValue("rendimiento", undefined, { shouldValidate: false, shouldDirty: true });
    } else {
      if (form.getValues("quantity") == null) form.setValue("quantity", 0, { shouldValidate: false });
      if (form.getValues("lowStockThreshold") == null) form.setValue("lowStockThreshold", 5, { shouldValidate: false });
      if (!form.getValues("unitType")) form.setValue("unitType", "units", { shouldValidate: false });
    }
  }, [isService, form]);

  const sortedSuppliers = React.useMemo(() => 
    [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
  [suppliers]);
  
  const sortedCategories = React.useMemo(() =>
    [...categories].sort((a, b) => a.name.localeCompare(b.name)),
  [categories]);


  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="isService"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-card">
              <div className="space-y-0.5">
                <FormLabel className="text-base">¿Es un Servicio?</FormLabel>
                <FormDescription>
                  Marque si esto es un servicio (ej. mano de obra) y no un producto físico con stock.
                </FormDescription>
              </div>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
          )}
        />
        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder={isService ? "Mano de Obra" : "Filtro de Aceite"} {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} className="bg-card"/></FormControl><FormMessage /></FormItem> )}/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><FormLabel>Categoría</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-card"><SelectValue placeholder="Seleccione categoría" /></SelectTrigger></FormControl><SelectContent>{sortedCategories.map(c=><SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
          <FormField control={form.control} name="supplier" render={({ field }) => ( <FormItem><FormLabel>Proveedor</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-card"><SelectValue placeholder="Seleccione proveedor" /></SelectTrigger></FormControl><SelectContent>{sortedSuppliers.map(s=><SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="brand" render={({ field }) => ( <FormItem><FormLabel>Marca</FormLabel><FormControl><Input placeholder="Ej: Gonher, LTH" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} className="bg-card" /></FormControl><FormMessage /></FormItem> )}/>
          <FormField control={form.control} name="sku" render={({ field }) => ( <FormItem><FormLabel>SKU / Código</FormLabel><FormControl><Input placeholder="Ej: G-123" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value.toUpperCase())} className="bg-card"/></FormControl><FormMessage /></FormItem> )}/>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="unitPrice" render={({ field }) => ( <FormItem><FormLabel>Costo (Taller)</FormLabel><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/><FormControl><Input type="number" placeholder="100.00" {...field} value={field.value ?? ''} className="pl-8 bg-card"/></FormControl></div><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="sellingPrice" render={({ field }) => ( <FormItem><FormLabel>Precio (Público)</FormLabel><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/><FormControl><Input type="number" placeholder="150.00" {...field} value={field.value ?? ''} className="pl-8 bg-card"/></FormControl></div><FormMessage /></FormItem> )}/>
        </div>
        {!isService && (
          <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem><FormLabel>Cantidad Actual</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} className="bg-card" /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="lowStockThreshold" render={({ field }) => ( <FormItem><FormLabel>Alerta Stock Bajo</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} className="bg-card" /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="unitType" render={({ field }) => ( <FormItem><FormLabel>Unidad</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-card"><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="units">Unidades</SelectItem><SelectItem value="ml">Mililitros</SelectItem><SelectItem value="liters">Litros</SelectItem><SelectItem value="kg">Kilogramos</SelectItem><SelectItem value="service">Servicio</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
              </div>
               {unitType === 'liters' && (
                <FormField
                  control={form.control}
                  name="rendimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rendimiento (ml)</FormLabel>
                      <FormControl><Input type="number" placeholder="5000" {...field} value={field.value ?? ''} className="bg-card" /></FormControl>
                      <FormDescription>Total de mililitros en esta unidad. Ej: un bidón de 5L tiene un rendimiento de 5000 ml.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
          </div>
        )}
        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea placeholder="Información adicional sobre el producto o servicio." {...field} value={field.value ?? ''} className="bg-card"/></FormControl><FormMessage /></FormItem> )}/>
      </form>
    </Form>
  );
}
