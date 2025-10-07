
// src/app/(app)/pos/components/pos-items-table.tsx
"use client";

import * as React from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import type { POSFormValues } from "@/schemas/pos-form-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Minus, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function PosItemsTable() {
  const { control, watch, setValue } = useFormContext<POSFormValues>();
  const { fields, remove } = useFieldArray({ control, name: "items" as const });
  const items = watch("items") ?? [];

  const updateQty = (index: number, nextQty: number) => {
    const safeQty = Math.max(1, Math.floor(Number(nextQty) || 1));
    const unit = Number(items[index]?.unitPrice || 0);
    setValue(`items.${index}.quantity`, safeQty, { shouldDirty: true, shouldTouch: true });
    setValue(`items.${index}.totalPrice`, unit * safeQty, { shouldDirty: true, shouldTouch: true });
  };

  if (!fields.length) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
        No hay artículos. Usa “Añadir Artículo/Servicio”.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-black text-white">
          <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
            <th className="min-w-[220px]">Artículo</th>
            <th className="w-[220px]">Cantidad</th>
            <th className="w-[150px] text-right">Precio unitario</th>
            <th className="w-[150px] text-right">Total</th>
            <th className="w-[48px] text-right"></th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => {
            const name  = items[i]?.itemName ?? "Artículo";
            const sku   = (items[i] as any)?.sku;
            const unit  = Number(items[i]?.unitPrice || 0);
            const qty   = Number(items[i]?.quantity || 1);
            const total = Number(items[i]?.totalPrice ?? unit * qty);

            return (
              <tr key={f.id} className="border-t [&>td]:px-3 [&>td]:py-3 align-middle">
                <td>
                  <div className="flex flex-col">
                    <span className="font-medium truncate">{name}</span>
                    {sku && <span className="text-xs text-muted-foreground">{sku}</span>}
                  </div>
                </td>

                <td>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-white"
                      onClick={() => updateQty(i, qty - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <Input
                      value={qty}
                      onChange={(e) => updateQty(i, Number(e.target.value))}
                      inputMode="numeric"
                      className="h-8 w-20 text-center bg-white"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-white"
                      onClick={() => updateQty(i, qty + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </td>

                <td className="text-right tabular-nums">
                  {formatCurrency(unit)}
                </td>
                <td className="text-right font-semibold tabular-nums">
                  {formatCurrency(total)}
                </td>

                <td className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600"
                    onClick={() => remove(i)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
