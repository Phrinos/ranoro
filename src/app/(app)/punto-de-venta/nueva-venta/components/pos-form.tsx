// src/app/(app)/punto-de-venta/nueva-venta/components/pos-form.tsx
"use client";

import React, { useMemo } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import type { POSFormValues } from '@/schemas/pos-form-schema';
import type { Supplier } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, ShoppingCart, User, Package, CreditCard } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { PAYMENT_METHODS } from '@/types';
import { Label } from '@/components/ui/label';

interface PosFormProps {
  inventoryItems: any[];
  categories: any[];
  suppliers: Supplier[];
  onSaleComplete: (data: POSFormValues) => Promise<void>;
  onInventoryItemCreated?: (data: any) => Promise<any>;
  onOpenValidateDialog?: (index: number) => void;
  validatedFolios?: Record<number, boolean>;
  onOpenAddItemDialog?: () => void;
}

export function PosForm({
  onSaleComplete,
  onOpenAddItemDialog,
  validatedFolios = {},
}: PosFormProps) {
  const { register, control, watch, setValue, handleSubmit, formState: { errors, isSubmitting } } = useFormContext<POSFormValues>();

  const { fields: itemFields, remove: removeItem } = useFieldArray({ control, name: 'items' });
  const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({ control, name: 'payments' });

  const watchedItems = watch('items') || [];
  const watchedPayments = watch('payments') || [];

  const saleTotal = useMemo(() =>
    watchedItems
      .filter(i => i.inventoryItemId !== 'COMMISSION_FEE')
      .reduce((acc, i) => acc + (Number(i.totalPrice) || 0), 0),
    [watchedItems]
  );

  const paymentTotal = useMemo(() =>
    watchedPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0),
    [watchedPayments]
  );

  const balance = paymentTotal - saleTotal;

  return (
    <form onSubmit={handleSubmit(onSaleComplete)} className="space-y-6">
      {/* Customer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-1 block">Nombre del cliente</Label>
              <Input {...register('customerName')} placeholder="Cliente Mostrador" />
            </div>
            <div>
              <Label className="text-sm mb-1 block">WhatsApp (opcional)</Label>
              <Input {...register('whatsappNumber')} placeholder="614XXXXXXX" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Artículos
            </CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={onOpenAddItemDialog}>
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {itemFields.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 border rounded-lg">
              <ShoppingCart className="h-8 w-8 mx-auto opacity-30 mb-2" />
              <p className="text-sm">Sin artículos. Toca "Agregar" para buscar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {itemFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{watchedItems[index]?.itemName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(Number(watchedItems[index]?.totalPrice) || 0)} total
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      className="w-16 h-8 text-center text-sm"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        const unit = Number(watchedItems[index]?.unitPrice) || 0;
                        setValue(`items.${index}.quantity`, qty);
                        setValue(`items.${index}.totalPrice`, qty * unit);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {errors.items?.root && (
            <p className="text-sm text-destructive mt-2">{errors.items.root.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Totals Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total a cobrar</span>
            <span>{formatCurrency(saleTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Cobro
            </CardTitle>
            <Button type="button" size="sm" variant="ghost" onClick={() => appendPayment({ method: 'Efectivo', amount: undefined })}>
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Otro pago
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentFields.map((field, index) => {
            const method = watchedPayments[index]?.method;
            const needsFolio = method?.includes('Tarjeta') || method?.includes('Transferencia');
            return (
              <div key={field.id} className="space-y-2">
                <div className="flex gap-2 items-center">
                  <Select
                    value={method || 'Efectivo'}
                    onValueChange={(v) => setValue(`payments.${index}.method`, v as any)}
                  >
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-32 h-9"
                    placeholder="Monto"
                    {...register(`payments.${index}.amount`, { valueAsNumber: true })}
                  />
                  {paymentFields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removePayment(index)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {needsFolio && (
                  <Input
                    {...register(`payments.${index}.folio`)}
                    placeholder="Folio / referencia *"
                    className="h-8 text-sm"
                  />
                )}
              </div>
            );
          })}

          <div className={cn(
            "flex justify-between items-center font-semibold text-sm pt-2 border-t",
            balance < -0.01 ? "text-destructive" : balance > 0.01 ? "text-emerald-600" : "text-foreground"
          )}>
            <span>{balance > 0.01 ? 'Cambio' : balance < -0.01 ? 'Falta' : 'Cuadrado ✓'}</span>
            <span>{formatCurrency(Math.abs(balance))}</span>
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting || itemFields.length === 0}
      >
        {isSubmitting ? 'Procesando...' : `Finalizar Venta · ${formatCurrency(saleTotal)}`}
      </Button>
    </form>
  );
}
