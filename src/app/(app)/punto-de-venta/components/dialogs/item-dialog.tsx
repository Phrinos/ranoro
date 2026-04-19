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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar" : "Nuevo"} {isService ? "Servicio" : "Producto"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica los datos del ítem." : "Agrega un nuevo ítem al inventario."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo toggle */}
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
              <Label htmlFor="isService-toggle" className="text-sm font-medium flex-1">
                ¿Es un servicio? (sin stock físico)
              </Label>
              <FormField
                control={form.control}
                name="isService"
                render={({ field }) => (
                  <Switch
                    id="isService-toggle"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Name */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre *</FormLabel>
                <FormControl><Input placeholder="Nombre del producto o servicio" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              {/* SKU */}
              <FormField control={form.control} name="sku" render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl><Input placeholder="SKU-001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Marca */}
              <FormField control={form.control} name="brand" render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl><Input placeholder="Marca" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Categoría */}
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecciona categoría" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isService ? (
                      serviceCategories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)
                    ) : (
                      productCategories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)
                    )}
                    {(isService ? serviceCategories : productCategories).length === 0 && (
                      <SelectItem value="_none" disabled>Sin categorías disponibles</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Precios */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="costPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Costo</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="salePrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Venta *</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Stock — solo productos */}
            {!isService && (
              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="stock" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Actual</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mín. Stock</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="unitType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNIT_TYPES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {/* Descripción */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Descripción opcional..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {isEditing && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  className="sm:mr-auto"
                  onClick={() => { onDelete(item!.id!); onOpenChange(false); }}
                >
                  Eliminar
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando…" : isEditing ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
