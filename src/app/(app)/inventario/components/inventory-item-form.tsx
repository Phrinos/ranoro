//src/app/(app)/inventario/components/inventory-item-form.tsx
"use client";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import * as z from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel,
  FormMessage, FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryItem, InventoryCategory, Supplier } from "@/types";
import { capitalizeWords, cn } from "@/lib/utils";
import { DollarSign, Package, Wrench } from "lucide-react";
import { inventoryItemFormSchema } from '@/schemas/inventory-item-form-schema';

export type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;

interface InventoryItemFormProps {
  id: string;
  initialData?: Partial<InventoryItem> | null;
  onSubmit: (values: InventoryItemFormValues) => Promise<void>;
  categories: InventoryCategory[];
  suppliers: Supplier[];
}

export function InventoryItemForm({ id, initialData, onSubmit, categories, suppliers }: InventoryItemFormProps) {
  const form = useForm<InventoryItemFormValues, any, InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemFormSchema) as Resolver<InventoryItemFormValues, any, InventoryItemFormValues>,
    defaultValues: {
      name: initialData?.name || "",
      brand: (initialData as any)?.brand || "",
      sku: initialData?.sku || "",
      description: initialData?.description || "",
      isService: initialData?.isService || false,
      quantity: initialData?.quantity ?? 0,
      unitPrice: initialData?.unitPrice ?? undefined,
      sellingPrice: initialData?.sellingPrice ?? undefined,
      lowStockThreshold: initialData?.lowStockThreshold ?? 5,
      unitType: (initialData as any)?.unitType || 'units',
      category: initialData?.category || (categories.length > 0 ? categories[0].name : ""),
      supplier: initialData?.supplier || (suppliers.length > 0 ? suppliers[0].name : ""),
      rendimiento: (initialData as any)?.rendimiento ?? undefined,
    },
  });

  const isService = form.watch("isService");
  const unitType = form.watch("unitType");

  React.useEffect(() => {
    if (isService) {
      form.setValue("quantity", undefined, { shouldValidate: false, shouldDirty: true });
      form.setValue("lowStockThreshold", undefined, { shouldValidate: false, shouldDirty: true });
      form.setValue("unitType", "units" as any, { shouldValidate: false, shouldDirty: true });
      form.setValue("rendimiento", undefined, { shouldValidate: false, shouldDirty: true });
    } else {
      if (form.getValues("quantity") == null) form.setValue("quantity", 0, { shouldValidate: false });
      if (form.getValues("lowStockThreshold") == null) form.setValue("lowStockThreshold", 5, { shouldValidate: false });
      if (!form.getValues("unitType")) form.setValue("unitType", "units" as any, { shouldValidate: false });
    }
  }, [isService, form]);

  const sortedSuppliers = React.useMemo(() =>
    [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
  [suppliers]);

  const sortedCategories = React.useMemo(() =>
    [...categories].sort((a, b) => a.name.localeCompare(b.name)),
  [categories]);

  // Filter categories by type
  const productCategories = sortedCategories.filter(c => c.type === 'product');
  const serviceCategories = sortedCategories.filter(c => c.type === 'service');
  const visibleCategories = isService ? serviceCategories : productCategories;

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Selector tipo: Producto vs Servicio ── */}
        <FormField
          control={form.control}
          name="isService"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => field.onChange(false)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
                    !field.value
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Package className={cn("w-4 h-4", !field.value ? "text-primary" : "text-slate-400")} />
                  Producto Físico
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange(true)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
                    field.value
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Wrench className={cn("w-4 h-4", field.value ? "text-white" : "text-slate-400")} />
                  Servicio
                </button>
              </div>
            </FormItem>
          )}
        />

        {/* ── Layout 2 columnas ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── COLUMNA IZQUIERDA ── */}
          <div className="space-y-4">

            {/* Categoría + Proveedor */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Categoría</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="bg-white h-10"><SelectValue placeholder="Selecciona" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {visibleCategories.length > 0
                        ? visibleCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)
                        : sortedCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="supplier" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Proveedor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="bg-white h-10"><SelectValue placeholder="Selecciona" /></SelectTrigger></FormControl>
                    <SelectContent>{sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Marca + Nombre */}
            <div className="grid grid-cols-2 gap-3">
              {!isService && (
                <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Marca</FormLabel>
                    <FormControl>
                      <Input placeholder="Gonher, LTH…" {...field} value={field.value ?? ''}
                        onChange={e => field.onChange(capitalizeWords(e.target.value))} className="bg-white h-10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className={isService ? "col-span-2" : ""}>
                  <FormLabel className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nombre / Producto</FormLabel>
                  <FormControl>
                    <Input placeholder={isService ? "Mano de Obra" : "Filtro de Aceite"} {...field}
                      onChange={e => field.onChange(capitalizeWords(e.target.value))} className="bg-white h-10 font-medium" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Unidad + SKU */}
            {!isService && (
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="unitType" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Unidad</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value as any}>
                      <FormControl><SelectTrigger className="bg-white h-10"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="units">Piezas / Cajas</SelectItem>
                        <SelectItem value="ml">Mililitros (ml)</SelectItem>
                        <SelectItem value="liters">Litros (L)</SelectItem>
                        <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU / Código</FormLabel>
                    <FormControl>
                      <Input placeholder="G-123" {...field} value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value.toUpperCase())} className="bg-white h-10 font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {/* Rendimiento para litros */}
            {!isService && unitType === 'liters' && (
              <FormField control={form.control} name="rendimiento" render={({ field }) => (
                <FormItem className="animate-in fade-in duration-200">
                  <FormLabel className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Rendimiento (ml)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="5000" {...field} value={field.value ?? ''} className="bg-purple-50 border-purple-200 h-10" />
                  </FormControl>
                  <FormDescription className="text-[11px] text-purple-600">Ml totales en esta unidad física. Ej: bidón 5L = 5000.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            )}
          </div>

          {/* ── COLUMNA DERECHA ── */}
          <div className="space-y-4">

            {/* Card Stock — solo para productos */}
            {!isService && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Control de Stock</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock Inicial</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ''} className="bg-white border-blue-200 h-10 font-bold text-blue-900" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Alerta Mínimo</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ''} className="bg-white border-amber-200 h-10 font-bold text-amber-700" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            )}

            {/* Card Precios */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 space-y-3">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Precios</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="unitPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Costo (Taller)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} value={field.value ?? ''}
                        leftIcon={<DollarSign className="w-4 h-4 text-slate-400" />}
                        className="bg-white border-slate-200 h-10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sellingPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Precio (Público)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} value={field.value ?? ''}
                        leftIcon={<DollarSign className="w-4 h-4 text-emerald-500" />}
                        className="bg-white border-emerald-200 h-10 font-bold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Notas */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Notas / Descripción</FormLabel>
                <FormControl>
                  <Textarea placeholder="Información adicional…" {...field} value={field.value ?? ''}
                    className="bg-white resize-none min-h-[90px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>
      </form>
    </Form>
  );
}
