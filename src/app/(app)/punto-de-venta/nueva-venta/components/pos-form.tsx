// src/app/(app)/punto-de-venta/nueva-venta/components/pos-form.tsx
"use client";

import React, { useMemo } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import type { POSFormValues } from '@/schemas/pos-form-schema';
import type { Supplier } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Trash2, PlusCircle, ShoppingCart, User, Package,
  CreditCard, Plus, Minus,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { PAYMENT_METHODS } from '@/types';
import { Label } from '@/components/ui/label';

// Pastel palette — same system as ServiceItemCard
const ITEM_PALETTES = [
  { card: "bg-amber-50 border-amber-200", dot: "bg-amber-400", label: "text-amber-700" },
  { card: "bg-sky-50 border-sky-200", dot: "bg-sky-400", label: "text-sky-700" },
  { card: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-400", label: "text-emerald-700" },
  { card: "bg-violet-50 border-violet-200", dot: "bg-violet-400", label: "text-violet-700" },
  { card: "bg-rose-50 border-rose-200", dot: "bg-rose-400", label: "text-rose-700" },
  { card: "bg-orange-50 border-orange-200", dot: "bg-orange-400", label: "text-orange-700" },
  { card: "bg-teal-50 border-teal-200", dot: "bg-teal-400", label: "text-teal-700" },
  { card: "bg-fuchsia-50 border-fuchsia-200", dot: "bg-fuchsia-400", label: "text-fuchsia-700" },
];

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
  const {
    register, control, watch, setValue, handleSubmit,
    formState: { errors, isSubmitting },
  } = useFormContext<POSFormValues>();

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

  // ── Quantity helpers ──────────────────────────────────────────────────────
  const setQty = (index: number, qty: number) => {
    const safeQty = Math.max(0.001, qty);
    const unit = Number(watchedItems[index]?.unitPrice) || 0;
    setValue(`items.${index}.quantity`, safeQty, { shouldDirty: true });
    setValue(`items.${index}.totalPrice`, parseFloat((safeQty * unit).toFixed(2)), { shouldDirty: true });
  };

  const adjustQty = (index: number, delta: number) => {
    const current = Number(watchedItems[index]?.quantity ?? 1);
    setQty(index, current + delta);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSaleComplete)} className="space-y-6">

      {/* ── Customer ── */}
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

      {/* ── Items ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Artículos
              {itemFields.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({itemFields.length})
                </span>
              )}
            </CardTitle>
            <Button type="button" size="sm" onClick={onOpenAddItemDialog}
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
              <PlusCircle className="h-3.5 w-3.5" /> Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {itemFields.length === 0 ? (
            <div
              className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/10 transition-colors"
              onClick={onOpenAddItemDialog}
            >
              <ShoppingCart className="h-10 w-10 mx-auto opacity-20 mb-3" />
              <p className="text-sm font-medium">Toca Agregar para buscar artículos</p>
              <p className="text-xs opacity-60 mt-1">El inventario está listo para buscar</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Column headers */}
              <div className="hidden sm:grid text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 pb-0"
                style={{ gridTemplateColumns: "1fr 130px 90px 90px 36px" }}>
                <div>Artículo</div>
                <div className="text-center">Cantidad</div>
                <div className="text-right">Precio Unit.</div>
                <div className="text-right">Total</div>
                <div />
              </div>

              {itemFields.map((field, index) => {
                const item = watchedItems[index];
                const palette = ITEM_PALETTES[index % ITEM_PALETTES.length];
                const qty = Number(item?.quantity ?? 1);
                const unit = Number(item?.unitPrice ?? 0);
                const total = qty * unit;

                return (
                  <div
                    key={field.id}
                    className={cn(
                      "border rounded-xl p-3 transition-all",
                      palette.card
                    )}
                  >
                    {/* Mobile layout (stacked) */}
                    <div className="flex items-start gap-3 sm:hidden">
                      <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 shrink-0", palette.dot)} />
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm font-bold truncate">{item?.itemName}</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* +/- qty */}
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="outline" size="icon"
                              className="h-7 w-7 rounded-lg bg-white border-slate-200"
                              onClick={() => adjustQty(index, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number" step="0.001" min="0.001"
                              className="w-14 h-7 text-center text-sm bg-white border-slate-200"
                              value={qty}
                              onChange={(e) => setQty(index, Number(e.target.value))}
                            />
                            <Button type="button" variant="outline" size="icon"
                              className="h-7 w-7 rounded-lg bg-white border-slate-200"
                              onClick={() => adjustQty(index, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-xs text-muted-foreground">× {formatCurrency(unit)}</span>
                          <span className={cn("text-sm font-black ml-auto", palette.label)}>{formatCurrency(total)}</span>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive shrink-0 mt-0.5"
                        onClick={() => removeItem(index)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Desktop layout (grid) */}
                    <div className="hidden sm:grid items-center gap-2"
                      style={{ gridTemplateColumns: "1fr 130px 90px 90px 36px" }}>
                      {/* Name */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", palette.dot)} />
                        <p className="text-sm font-bold truncate">{item?.itemName}</p>
                      </div>

                      {/* Qty +/- */}
                      <div className="flex items-center justify-center gap-1">
                        <Button type="button" variant="outline" size="icon"
                          className="h-7 w-7 rounded-lg bg-white border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                          onClick={() => adjustQty(index, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number" step="0.001" min="0.001"
                          className="w-14 h-7 text-center text-xs bg-white border-slate-200"
                          value={qty}
                          onChange={(e) => setQty(index, Number(e.target.value))}
                        />
                        <Button type="button" variant="outline" size="icon"
                          className="h-7 w-7 rounded-lg bg-white border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600"
                          onClick={() => adjustQty(index, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Unit price */}
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground tabular-nums">{formatCurrency(unit)}</span>
                      </div>

                      {/* Total */}
                      <div className="text-right">
                        <span className={cn("text-sm font-black tabular-nums", palette.label)}>{formatCurrency(total)}</span>
                      </div>

                      {/* Delete */}
                      <div className="flex justify-center">
                        <Button type="button" variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeItem(index)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {errors.items?.root && (
            <p className="text-sm text-destructive mt-2">{errors.items.root.message}</p>
          )}
        </CardContent>
      </Card>

      {/* ── Total summary ── */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total a cobrar</span>
            <span className="text-2xl font-black tabular-nums text-primary">{formatCurrency(saleTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Payments ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Cobro
            </CardTitle>
            <Button type="button" size="sm" variant="ghost"
              onClick={() => appendPayment({ method: 'Efectivo', amount: undefined })}>
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
                    <SelectTrigger className="flex-1 h-9 bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" step="0.01" min="0"
                    className="w-32 h-9 bg-white border-slate-200"
                    placeholder="Monto"
                    {...register(`payments.${index}.amount`, { valueAsNumber: true })}
                  />
                  {paymentFields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon"
                      className="h-9 w-9 text-destructive shrink-0"
                      onClick={() => removePayment(index)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {needsFolio && (
                  <Input
                    {...register(`payments.${index}.folio`)}
                    placeholder="Folio / referencia *"
                    className="h-8 text-sm bg-white border-slate-200"
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
            <span className="tabular-nums">{formatCurrency(Math.abs(balance))}</span>
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        size="lg"
        className="w-full text-base font-bold h-14"
        disabled={isSubmitting || itemFields.length === 0}
      >
        {isSubmitting ? 'Procesando...' : `Finalizar Venta · ${formatCurrency(saleTotal)}`}
      </Button>
    </form>
  );
}
