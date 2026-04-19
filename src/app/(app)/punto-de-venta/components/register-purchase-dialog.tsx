// src/app/(app)/punto-de-venta/components/register-purchase-dialog.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerPurchaseSchema, type RegisterPurchaseFormValues } from '@/schemas/register-purchase-schema';
import type { Supplier, InventoryItem, InventoryCategory } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, PlusCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Combobox } from '@/components/shared/Combobox';

// Re-export the type so that other files can import it from this location
export type { RegisterPurchaseFormValues as PurchaseFormValues };

const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Tarjeta 3 MSI", "Tarjeta 6 MSI", "Transferencia", "Crédito"];

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
    resolver: zodResolver(registerPurchaseSchema),
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Compra</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {/* Header fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
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
                    <FormLabel>Fecha de compra *</FormLabel>
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
                    <FormLabel>Folio / Factura</FormLabel>
                    <FormControl><Input {...field} placeholder="Ej: FAC-001" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pago *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Artículos *</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ inventoryItemId: '', itemName: '', quantity: 1, purchasePrice: 0, sellingPrice: 0 })}>
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Agregar
                </Button>
              </div>
              <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <FormField
                        control={form.control}
                        name={`items.${index}.inventoryItemId`}
                        render={({ field: f }) => (
                          <FormItem>
                            {index === 0 && <FormLabel className="text-xs">Artículo</FormLabel>}
                            <FormControl>
                              <Select
                                value={f.value}
                                onValueChange={(v) => {
                                  f.onChange(v);
                                  const item = inventoryItems.find(i => i.id === v);
                                  if (item) {
                                    form.setValue(`items.${index}.itemName`, item.name);
                                    form.setValue(`items.${index}.sellingPrice`, item.sellingPrice || 0);
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>
                                  {itemOptions.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
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
                            {index === 0 && <FormLabel className="text-xs">Cant.</FormLabel>}
                            <FormControl>
                              <Input type="number" step="0.001" min="0.001" className="h-8 text-xs" {...f} onChange={e => f.onChange(Number(e.target.value))} />
                            </FormControl>
                            <FormMessage />
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
                            {index === 0 && <FormLabel className="text-xs">Costo U.</FormLabel>}
                            <FormControl>
                              <Input type="number" step="0.01" min="0" className="h-8 text-xs" {...f} onChange={e => f.onChange(Number(e.target.value))} />
                            </FormControl>
                            <FormMessage />
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
                            {index === 0 && <FormLabel className="text-xs">Precio V.</FormLabel>}
                            <FormControl>
                              <Input type="number" step="0.01" min="0" className="h-8 text-xs" {...f} onChange={e => f.onChange(Number(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      {index === 0 && <div className="text-xs opacity-0 mb-1">X</div>}
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => fields.length > 1 && remove(index)} disabled={fields.length <= 1}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <span className="text-sm font-semibold">Total: {formatCurrency(total)}</span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Observaciones opcionales..." rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Registrar Compra'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
