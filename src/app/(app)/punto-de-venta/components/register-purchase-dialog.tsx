// src/app/(app)/punto-de-venta/components/register-purchase-dialog.tsx
"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerPurchaseSchema, type RegisterPurchaseFormValues } from '@/schemas/register-purchase-schema';
import type { Supplier, InventoryItem, InventoryCategory } from '@/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, PlusCircle, ShoppingCart, Receipt } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

export type { RegisterPurchaseFormValues as PurchaseFormValues };

const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Tarjeta 3 MSI", "Tarjeta 6 MSI", "Transferencia", "Crédito"];

const inputCls = "bg-white border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 h-10";
const selectTriggerCls = "bg-white border-slate-200 focus:border-primary h-10";

interface RegisterPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  onSave: (data: RegisterPurchaseFormValues) => Promise<void>;
  onInventoryItemCreated?: (data: any) => Promise<any>;
}

export function RegisterPurchaseDialog({
  open,
  onOpenChange,
  suppliers,
  inventoryItems,
  onSave,
}: RegisterPurchaseDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<RegisterPurchaseFormValues>({
    resolver: zodResolver(registerPurchaseSchema) as any,
    defaultValues: {
      supplierId: '',
      invoiceId: '',
      purchaseDate: new Date(),
      items: [{ inventoryItemId: '', itemName: '', quantity: 1, purchasePrice: 0, sellingPrice: 0 }],
      paymentMethod: 'Efectivo',
      note: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');
  const total = watchedItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.purchasePrice || 0), 0);

  const handleSubmit = async (data: RegisterPurchaseFormValues) => {
    setIsSaving(true);
    try {
      await onSave({ ...data, total });
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const itemOptions = inventoryItems.map(i => ({
    value: i.id,
    label: `${i.name}${i.sku ? ` (${i.sku})` : ''}`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="px-6 py-5 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Receipt className="h-4 w-4 text-emerald-600" />
              </div>
              Registrar Compra
            </DialogTitle>
            <DialogDescription className="mt-1">
              Registra una compra de productos o materiales.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">

              {/* Header fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Proveedor *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={selectTriggerCls}>
                            <SelectValue placeholder="Seleccionar proveedor..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Fecha de compra *</FormLabel>
                      <FormControl>
                        <DatePicker date={field.value} onDateChange={(d) => field.onChange(d ?? new Date())} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Folio / Factura</FormLabel>
                      <FormControl>
                        <Input className={inputCls} {...field} placeholder="Ej: FAC-001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Método de Pago *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={selectTriggerCls}>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_METHODS.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Items section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {/* ✅ Label nativo — no FormLabel fuera de FormField */}
                  <Label className="text-sm font-medium">Artículos *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ inventoryItemId: '', itemName: '', quantity: 1, purchasePrice: 0, sellingPrice: 0 })}
                    className="gap-1.5"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Agregar
                  </Button>
                </div>

                <div className="border rounded-xl overflow-hidden bg-slate-50">
                  {/* Column headers */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground bg-muted/60 px-3 py-2.5 border-b">
                    <div className="col-span-5">Artículo</div>
                    <div className="col-span-2 text-center">Cant.</div>
                    <div className="col-span-2 text-right">Costo U.</div>
                    <div className="col-span-2 text-right">Precio V.</div>
                    <div className="col-span-1" />
                  </div>

                  <div className="divide-y bg-white">
                    {fields.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-7 w-7 mb-2 opacity-30" />
                        <p className="text-sm">Agrega artículos a la compra</p>
                      </div>
                    ) : fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2">
                        <div className="col-span-5">
                          <FormField
                            control={form.control}
                            name={`items.${index}.inventoryItemId`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormControl>
                                  <Select
                                    value={f.value}
                                    onValueChange={(v) => {
                                      f.onChange(v);
                                      const it = inventoryItems.find(i => i.id === v);
                                      if (it) {
                                        form.setValue(`items.${index}.itemName`, it.name);
                                        form.setValue(`items.${index}.sellingPrice`, it.sellingPrice || 0);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                                      <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {itemOptions.map(o => (
                                        <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number" step="0.001" min="0.001"
                                    className="h-8 text-xs text-center bg-white border-slate-200"
                                    {...f}
                                    onChange={e => f.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.purchasePrice`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number" step="0.01" min="0"
                                    className="h-8 text-xs text-right bg-white border-slate-200"
                                    {...f}
                                    onChange={e => f.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.sellingPrice`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number" step="0.01" min="0"
                                    className="h-8 text-xs text-right bg-white border-slate-200"
                                    {...f}
                                    onChange={e => f.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Button
                            type="button" variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:bg-red-50"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total row */}
                  <div className="flex justify-end px-3 py-2.5 bg-muted/30 border-t">
                    <span className="text-sm font-bold">Total: {formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {/* Nota */}
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        className="bg-white border-slate-200 focus:border-primary resize-none"
                        {...field}
                        placeholder="Observaciones opcionales..."
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="border-t pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving} className="gap-2">
                  <Receipt className="h-4 w-4" />
                  {isSaving ? 'Guardando...' : 'Registrar Compra'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
