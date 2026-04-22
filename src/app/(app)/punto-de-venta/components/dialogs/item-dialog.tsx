// src/app/(app)/punto-de-venta/components/dialogs/item-dialog.tsx
"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Package, Wrench, Trash2, DollarSign, Boxes, Package2,
  Tag, Store, Building2,
} from "lucide-react";
import type { PosInventoryItem, PosCategory } from "../../hooks/use-pos-data";
import type { Supplier } from "@/types";

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
  supplierName: z.string().optional(),
});

export type ItemFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: Partial<PosInventoryItem> | null;
  categories: PosCategory[];
  suppliers?: Supplier[];
  onSave: (values: ItemFormValues, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const UNIT_TYPES = ["pieza", "litro", "metro", "kg", "caja", "juego", "par", "otro"];

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-3", color)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

function PriceInput({ label, field, required }: { label: string; field: any; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
        {label}{required && " *"}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
        <Input
          type="number" step="0.01" min="0"
          className="bg-white border-slate-200 h-10 pl-7 text-right font-mono tabular-nums"
          {...field}
        />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function ItemDialog({ open, onOpenChange, item, categories, suppliers = [], onSave, onDelete }: Props) {
  const isEditing = !!item?.id;

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: "", sku: "", description: "", category: "", brand: "",
      isService: false, unitType: "pieza",
      costPrice: 0, salePrice: 0, stock: 0, lowStockThreshold: 5,
      supplierId: "", supplierName: "",
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
        brand: (item as any)?.brand ?? "",
        isService: item?.isService ?? false,
        unitType: item?.unitType ?? "pieza",
        costPrice: item?.costPrice ?? 0,
        salePrice: item?.salePrice ?? 0,
        stock: item?.stock ?? 0,
        lowStockThreshold: item?.lowStockThreshold ?? 5,
        supplierId: item?.supplierId ?? "",
        supplierName: (item as any)?.supplierName ?? "",
      });
    }
  }, [open, item, form]);

  const onSubmit = async (values: ItemFormValues) => {
    // Auto-set supplierName from selected supplier
    if (values.supplierId) {
      const sup = suppliers.find((s) => s.id === values.supplierId);
      if (sup) values.supplierName = sup.name;
    }
    await onSave(values, item?.id);
    onOpenChange(false);
  };

  const productCats = categories.filter((c) => c.type === "product");
  const serviceCats = categories.filter((c) => c.type === "service");
  const activeCats = isService ? serviceCats : productCats;

  const iCls = "bg-white border-slate-200 h-10 focus:border-primary focus:ring-1 focus:ring-primary/10";
  const sCls = "bg-white border-slate-200 h-10";

  // Color scheme based on type
  const accent = isService
    ? { header: "from-purple-600 to-violet-600", pill: "bg-purple-600", icon: "text-purple-100", badge: "bg-purple-100 text-purple-700" }
    : { header: "from-blue-600 to-sky-600", pill: "bg-blue-600", icon: "text-blue-100", badge: "bg-blue-100 text-blue-700" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Wide horizontal layout — no X button */}
      <DialogContent hideClose className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full min-h-[500px]">

          {/* ── Top: gradient header + type selector ────────────────── */}
          <div className={cn("px-6 py-5 bg-gradient-to-r text-white flex items-center justify-between gap-6 flex-shrink-0", accent.header)}>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                {isService
                  ? <Wrench className="h-5 w-5 text-white" />
                  : <Package className="h-5 w-5 text-white" />}
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-black">
                  {isEditing ? "Editar" : "Nuevo"} {isService ? "Servicio" : "Producto"}
                </DialogTitle>
                <DialogDescription className="text-white/70 text-xs mt-0.5">
                  {isEditing ? "Modifica los datos del ítem." : isService ? "Agrega un servicio al catálogo." : "Agrega un producto al inventario."}
                </DialogDescription>
              </div>
            </div>

            {/* Type toggle */}
            <div className="flex gap-1.5 p-1 bg-white/15 rounded-xl">
              <button
                type="button"
                onClick={() => { form.setValue("isService", false); form.setValue("category", ""); }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  !isService ? "bg-white text-blue-700 shadow-md" : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                <Package className="h-4 w-4" /> Producto
              </button>
              <button
                type="button"
                onClick={() => { form.setValue("isService", true); form.setValue("category", ""); }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  isService ? "bg-white text-purple-700 shadow-md" : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                <Wrench className="h-4 w-4" /> Servicio
              </button>
            </div>
          </div>

          {/* ── Body: 2 columns ─────────────────────────────────────── */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex flex-1 overflow-hidden">

                {/* LEFT column — identification fields */}
                {/* Using plain div instead of Radix ScrollArea to avoid double-click-to-focus bug */}
                <div className="flex-1 border-r overflow-y-auto">
                  <div className="px-6 py-5 space-y-4">
                    <SectionHeader icon={Tag} label="Identificación" color="text-slate-500" />

                    {/* Row 1: Categoría + Proveedor */}
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoría *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={sCls}>
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {activeCats.map((c) => (
                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                              ))}
                              {activeCats.length === 0 && (
                                <SelectItem value="_none" disabled>Sin categorías</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="supplierId" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Proveedor</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={sCls}>
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Sin proveedor</SelectItem>
                              {suppliers.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* Row 2: Marca + Nombre (products) or just Nombre (services) */}
                    {!isService ? (
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="brand" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Marca</FormLabel>
                            <FormControl>
                              <Input className={iCls} placeholder="Castrol, Bosch…" {...field} />
                            </FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre *</FormLabel>
                            <FormControl>
                              <Input className={iCls} placeholder="Ej: Aceite 5W30" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    ) : (
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre del Servicio *</FormLabel>
                          <FormControl>
                            <Input className={iCls} placeholder="Ej: Cambio de aceite, Afinación…" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {/* Row 3: Unidad + SKU (products only) */}
                    {!isService && (
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="unitType" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Unidad</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className={sCls}><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {UNIT_TYPES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="sku" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU / Código</FormLabel>
                            <FormControl>
                              <Input className={iCls} placeholder="SKU-001" {...field} />
                            </FormControl>
                          </FormItem>
                        )} />
                      </div>
                    )}

                    {/* Descripción */}
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={isService ? 5 : 3}
                            className="bg-white border-slate-200 focus:border-primary resize-none text-sm"
                            placeholder={isService ? "Describe qué incluye este servicio…" : "Especificaciones, compatibilidad, notas…"}
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* RIGHT column — prices & stock */}
                <div className="w-56 xl:w-64 shrink-0 flex flex-col bg-slate-50/60">
                  <div className="flex-1 overflow-y-auto">
                    <div className="px-5 py-5 space-y-5">

                      {/* Prices */}
                      <div>
                        <SectionHeader icon={DollarSign} label="Precios" color="text-emerald-600" />
                        <div className="space-y-3">
                          {/* Services also have a cost price (outsourced providers) */}
                          <FormField control={form.control} name="costPrice" render={({ field }) => (
                            <PriceInput label="Precio Costo" field={field} />
                          )} />
                          <FormField control={form.control} name="salePrice" render={({ field }) => (
                            <PriceInput label="Precio Venta" field={field} required />
                          )} />
                        </div>
                      </div>

                      {/* Stock — products only */}
                      {!isService && (
                        <div>
                          <SectionHeader icon={Boxes} label="Inventario" color="text-blue-600" />
                          <div className="space-y-3">
                            <FormField control={form.control} name="stock" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock Actual</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" className={iCls} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Alerta Mínimo</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" className={iCls} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </div>
                      )}

                      {/* Service info note */}
                      {isService && (
                        <div className="rounded-xl bg-purple-50 border border-purple-100 p-3.5">
                          <div className="flex gap-2.5">
                            <Wrench className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-purple-700 mb-1">Servicio de mano de obra</p>
                              <p className="text-[11px] text-purple-600 leading-relaxed">
                                Los servicios no llevan control de stock ni precio de costo. Solo se requiere el precio de venta.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer buttons — inside right column */}
                  <div className="border-t p-4 space-y-2 bg-white">
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className={cn(
                        "w-full font-bold",
                        isService ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"
                      )}
                    >
                      {form.formState.isSubmitting
                        ? "Guardando…"
                        : isEditing
                          ? `Actualizar ${isService ? "Servicio" : "Producto"}`
                          : `Crear ${isService ? "Servicio" : "Producto"}`}
                    </Button>
                    <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                    {isEditing && onDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full text-destructive hover:bg-red-50 gap-1.5"
                        onClick={() => { onDelete(item!.id!); onOpenChange(false); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar ítem
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
