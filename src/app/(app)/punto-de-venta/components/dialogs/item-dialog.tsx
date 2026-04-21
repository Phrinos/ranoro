// src/app/(app)/punto-de-venta/components/dialogs/item-dialog.tsx
"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Package, Wrench, Trash2, DollarSign, Tag, Boxes, Info } from "lucide-react";
import type { PosInventoryItem, PosCategory } from "../../hooks/use-pos-data";

const schema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  sku: z.string().optional(),
  description: z.string().optional(),
  category: z.string().min(1, "Categoría requerida"),
  brand: z.string().optional(),
  isService: z.boolean(),
  unitType: z.string().optional(),
  costPrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  stock: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().min(0),
  supplierId: z.string().optional(),
});

export type ItemFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: Partial<PosInventoryItem> | null;
  categories: PosCategory[];
  onSave: (values: ItemFormValues, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const UNIT_TYPES = ["pieza", "litro", "metro", "kg", "caja", "servicio", "otro"];

export function ItemDialog({ open, onOpenChange, item, categories, onSave, onDelete }: Props) {
  const isEditing = !!item?.id;

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: "", sku: "", description: "", category: "", brand: "",
      isService: false, unitType: "pieza",
      costPrice: 0, salePrice: 0, stock: 0, lowStockThreshold: 5,
      supplierId: "",
    },
  });

  const isService = form.watch("isService");

  useEffect(() => {
    if (open) {
      form.reset({
        name: item?.name ?? "",
        sku: item?.sku ?? "",
        description: item?.description ?? "",
        category: item?.category ?? "",
        brand: item?.brand ?? "",
        isService: item?.isService ?? false,
        unitType: item?.unitType ?? "pieza",
        costPrice: item?.costPrice ?? 0,
        salePrice: item?.salePrice ?? 0,
        stock: item?.stock ?? 0,
        lowStockThreshold: item?.lowStockThreshold ?? 5,
        supplierId: item?.supplierId ?? "",
      });
    }
  }, [open, item, form]);

  const onSubmit = async (values: ItemFormValues) => {
    await onSave(values, item?.id);
    onOpenChange(false);
  };

  const productCategories = categories.filter((c) => c.type === "product");
  const serviceCategories = categories.filter((c) => c.type === "service");
  const activeCats = isService ? serviceCategories : productCategories;

  // Input style helper
  const inputCls = "bg-white border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 h-10";
  const selectTriggerCls = "bg-white border-slate-200 focus:border-primary h-10";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0">
        {/* Header con color según tipo */}
        <div className={cn(
          "px-6 py-5 border-b",
          isService
            ? "bg-gradient-to-r from-purple-50 to-violet-50"
            : "bg-gradient-to-r from-blue-50 to-sky-50"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className={cn(
                "p-2 rounded-lg",
                isService ? "bg-purple-100" : "bg-blue-100"
              )}>
                {isService
                  ? <Wrench className="h-4 w-4 text-purple-600" />
                  : <Package className="h-4 w-4 text-blue-600" />
                }
              </div>
              {isEditing ? "Editar" : "Nuevo"} {isService ? "Servicio" : "Producto"}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {isEditing ? "Modifica los datos del ítem." : "Agrega un nuevo ítem al inventario."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {/* Tab tipo: Producto / Servicio */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => form.setValue("isService", false)}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
                    !isService
                      ? "bg-white shadow-sm text-blue-700 border border-blue-100"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Package className="h-4 w-4" /> Producto
                </button>
                <button
                  type="button"
                  onClick={() => form.setValue("isService", true)}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
                    isService
                      ? "bg-white shadow-sm text-purple-700 border border-purple-100"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Wrench className="h-4 w-4" /> Servicio
                </button>
              </div>

              {/* Sección: Identificación */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Info className="h-3.5 w-3.5" /> Información General
                </div>

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Nombre *</FormLabel>
                    <FormControl>
                      <Input className={inputCls} placeholder={isService ? "Ej: Cambio de aceite" : "Ej: Aceite Castrol 5W30"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="sku" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">SKU / Código</FormLabel>
                      <FormControl>
                        <Input className={inputCls} placeholder="SKU-001" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="brand" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Marca</FormLabel>
                      <FormControl>
                        <Input className={inputCls} placeholder="Castrol, Mobil…" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Categoría *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={selectTriggerCls}>
                          <SelectValue placeholder="Selecciona categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeCats.map((c) => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                        {activeCats.length === 0 && (
                          <SelectItem value="_none" disabled>Sin categorías disponibles</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        className="bg-white border-slate-200 focus:border-primary resize-none"
                        placeholder="Descripción opcional..."
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              {/* Sección: Precios */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" /> Precios
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="costPrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Precio Costo</FormLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" className={cn(inputCls, "pl-7")} {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="salePrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Precio Venta *</FormLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" className={cn(inputCls, "pl-7")} {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Sección: Stock — solo productos */}
              {!isService && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Boxes className="h-3.5 w-3.5" /> Inventario
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField control={form.control} name="stock" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Stock Actual</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" className={inputCls} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Mín. Stock</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" className={inputCls} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="unitType" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Unidad</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={selectTriggerCls}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UNIT_TYPES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {/* Sección: Tags */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" /> Identificación adicional
                </div>
              </div>

              {/* Footer */}
              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t mt-2">
                {isEditing && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="sm:mr-auto gap-1.5"
                    onClick={() => { onDelete(item!.id!); onOpenChange(false); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className={cn(
                    isService
                      ? "bg-purple-600 hover:bg-purple-700"
                      : ""
                  )}
                >
                  {form.formState.isSubmitting ? "Guardando…" : isEditing ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
