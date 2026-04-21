// src/app/(app)/punto-de-venta/nueva-venta/components/pos-form.tsx
"use client";

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import type { POSFormValues } from '@/schemas/pos-form-schema';
import type { Supplier } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Trash2, PlusCircle, ShoppingCart, Plus, Minus,
  User, CreditCard, Receipt,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { PAYMENT_METHODS } from '@/types';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

// ── Pastel palette (same system across the app) ──────────────────────────────
const ITEM_PALETTES = [
  { card: "bg-amber-50 border-amber-200",   dot: "bg-amber-400",   price: "text-amber-700"   },
  { card: "bg-sky-50 border-sky-200",       dot: "bg-sky-400",     price: "text-sky-700"     },
  { card: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-400", price: "text-emerald-700" },
  { card: "bg-violet-50 border-violet-200", dot: "bg-violet-400",  price: "text-violet-700"  },
  { card: "bg-rose-50 border-rose-200",     dot: "bg-rose-400",    price: "text-rose-700"    },
  { card: "bg-orange-50 border-orange-200", dot: "bg-orange-400",  price: "text-orange-700"  },
  { card: "bg-teal-50 border-teal-200",     dot: "bg-teal-400",    price: "text-teal-700"    },
  { card: "bg-fuchsia-50 border-fuchsia-200", dot: "bg-fuchsia-400", price: "text-fuchsia-700" },
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

export function PosForm({ onSaleComplete, onOpenAddItemDialog }: PosFormProps) {
  const {
    register, control, watch, setValue, handleSubmit,
    formState: { errors, isSubmitting },
  } = useFormContext<POSFormValues>();

  const { fields: itemFields, remove: removeItem } = useFieldArray({ control, name: 'items' });
  const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({ control, name: 'payments' });

  const watchedItems   = watch('items')    || [];
  const watchedPayments = watch('payments') || [];

  // Compute totals directly — NO useMemo (watch ref doesn't change on nested setValue)
  const saleTotal = watchedItems
    .filter(i => i.inventoryItemId !== 'COMMISSION_FEE')
    .reduce((acc, i) => acc + ((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)), 0);

  const paymentTotal = watchedPayments
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const balance = paymentTotal - saleTotal;

  // ── Quantity ─────────────────────────────────────────────────────────────
  const setQty = (index: number, qty: number) => {
    const safe = Math.max(1, Math.round(qty));  // enteros ≥ 1
    const unit = Number(watchedItems[index]?.unitPrice) || 0;
    setValue(`items.${index}.quantity`,   safe,                              { shouldDirty: true });
    setValue(`items.${index}.totalPrice`, parseFloat((safe * unit).toFixed(2)), { shouldDirty: true });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit(onSaleComplete)}
      className="flex gap-5 h-[calc(100vh-220px)] min-h-[520px]"
    >

      {/* ══════════════════════════════════════════════════════════════
          LEFT COLUMN — Products / Cart
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 rounded-2xl border bg-white shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20 shrink-0">
          <div>
            <h2 className="font-black text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              Artículos
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {itemFields.length === 0 ? 'Sin artículos' : `${itemFields.length} artículo${itemFields.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <Button
            type="button"
            onClick={onOpenAddItemDialog}
            className="gap-1.5 shadow-sm"
          >
            <PlusCircle className="h-4 w-4" /> Agregar
          </Button>
        </div>

        {/* Items list */}
        <ScrollArea className="flex-1">
          {itemFields.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-56 gap-3 text-muted-foreground cursor-pointer hover:bg-muted/10 transition-colors mx-5 my-6 rounded-xl border-2 border-dashed"
              onClick={onOpenAddItemDialog}
            >
              <ShoppingCart className="h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">Haz clic en Agregar para buscar</p>
              <p className="text-xs opacity-60">El inventario está listo</p>
            </div>
          ) : (
            <div className="p-4 space-y-2.5">
              {/* Column headers */}
              <div
                className="px-3 pb-1 grid text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                style={{ gridTemplateColumns: "1fr 130px 88px 84px 32px" }}
              >
                <div>Artículo</div>
                <div className="text-center">Cantidad</div>
                <div className="text-right">Precio Unit.</div>
                <div className="text-right">Total</div>
                <div />
              </div>

              {itemFields.map((field, index) => {
                const item    = watchedItems[index];
                const palette = ITEM_PALETTES[index % ITEM_PALETTES.length];
                const qty     = Number(item?.quantity ?? 1);
                const unit    = Number(item?.unitPrice ?? 0);
                const total   = qty * unit;

                return (
                  <div
                    key={field.id}
                    className={cn(
                      "grid items-center gap-2 px-3 py-2.5 rounded-xl border",
                      palette.card
                    )}
                    style={{ gridTemplateColumns: "1fr 130px 88px 84px 32px" }}
                  >
                    {/* Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", palette.dot)} />
                      <p className="text-sm font-semibold truncate">{item?.itemName}</p>
                    </div>

                    {/* Qty +/- */}
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        type="button" variant="outline" size="icon"
                        className="h-7 w-7 rounded-lg bg-white border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                        onClick={() => setQty(index, qty - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number" step="1" min="1"
                        className="w-14 h-7 text-center text-xs bg-white border-slate-200"
                        value={qty}
                        onChange={(e) => setQty(index, Number(e.target.value))}
                      />
                      <Button
                        type="button" variant="outline" size="icon"
                        className="h-7 w-7 rounded-lg bg-white border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600"
                        onClick={() => setQty(index, qty + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Unit price */}
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatCurrency(unit)}
                      </span>
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <span className={cn("text-sm font-black tabular-nums", palette.price)}>
                        {formatCurrency(total)}
                      </span>
                    </div>

                    {/* Delete */}
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-7 w-7 text-destructive hover:bg-red-50"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {errors.items?.root && (
            <p className="text-sm text-destructive px-5 pb-3">{errors.items.root.message}</p>
          )}
        </ScrollArea>

        {/* Cart total footer */}
        <div className="shrink-0 border-t px-5 py-4 bg-muted/10 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{itemFields.length} artículo{itemFields.length !== 1 ? 's' : ''}</span>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-black tabular-nums">{formatCurrency(saleTotal)}</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT COLUMN — Customer + Payment + Finalize
      ══════════════════════════════════════════════════════════════ */}
      <div className="w-80 xl:w-96 shrink-0 flex flex-col gap-4">

        {/* Customer card */}
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <h3 className="font-black text-sm flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-muted-foreground" /> Cliente
          </h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Nombre
              </Label>
              <Input
                {...register('customerName')}
                placeholder="Cliente Mostrador"
                className="bg-white border-slate-200 h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                WhatsApp
              </Label>
              <Input
                {...register('whatsappNumber')}
                placeholder="4491232233"
                className="bg-white border-slate-200 h-10"
              />
            </div>
          </div>
        </div>

        {/* Payment card */}
        <div className="rounded-2xl border bg-white shadow-sm p-5 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" /> Cobro
            </h3>
            <Button
              type="button" size="sm" variant="ghost"
              className="text-xs h-7 px-2 gap-1"
              onClick={() => appendPayment({ method: 'Efectivo', amount: undefined })}
            >
              <PlusCircle className="h-3.5 w-3.5" /> Otro pago
            </Button>
          </div>

          <div className="space-y-2.5 flex-1">
            {paymentFields.map((field, index) => {
              const method = watchedPayments[index]?.method;
              const needsFolio = method?.includes('Tarjeta') || method?.includes('Transferencia');
              return (
                <div key={field.id} className="space-y-1.5">
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
                      className="w-28 h-9 bg-white border-slate-200 text-right tabular-nums"
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
          </div>

          {/* Balance */}
          <div className={cn(
            "flex justify-between items-center font-bold text-sm pt-3 mt-3 border-t",
            balance < -0.01 ? "text-destructive" : balance > 0.01 ? "text-emerald-600" : "text-foreground"
          )}>
            <span>{balance > 0.01 ? 'Cambio' : balance < -0.01 ? 'Falta' : '✓ Cuadrado'}</span>
            <span className="tabular-nums">{formatCurrency(Math.abs(balance))}</span>
          </div>
        </div>

        {/* Finalize button */}
        <Button
          type="submit"
          size="lg"
          className="w-full h-14 text-base font-black gap-2 shadow-lg"
          disabled={isSubmitting || itemFields.length === 0}
        >
          <Receipt className="h-5 w-5" />
          {isSubmitting ? 'Procesando...' : `Finalizar Venta · ${formatCurrency(saleTotal)}`}
        </Button>
      </div>

    </form>
  );
}
