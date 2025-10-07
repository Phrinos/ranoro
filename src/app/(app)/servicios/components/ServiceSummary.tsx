// src/app/(app)/servicios/components/ServiceSummary.tsx
"use client";

import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { PaymentSection } from "@/components/shared/PaymentSection";
import { Separator } from "@/components/ui/separator";

interface ServiceSummaryProps {
  onOpenValidateDialog: (index: number) => void;
  validatedFolios: Record<number, boolean>;
  /** Opcional. Si lo pasas, se ignora cuando el cálculo interno detecta cambios. */
  totalAmount?: number;
}

const IVA_RATE = 0.16;

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export function ServiceSummary({
  onOpenValidateDialog,
  validatedFolios,
  totalAmount: totalAmountProp,
}: ServiceSummaryProps) {
  const { control } = useFormContext();

  // Observa ítems y comisión para reactividad total
  const items = useWatch({ control, name: "serviceItems" }) as any[] | undefined;
  const cardCommission = useWatch({ control, name: "cardCommission" }) || 0;

  // Total con IVA (sumando sellingPrice de cada trabajo) EN VIVO
  const totalAmount = useMemo(
    () => (items ?? []).reduce((s, i) => s + toNumber(i?.sellingPrice), 0),
    [items]
  );

  const { subTotal, taxAmount, serviceProfit } = useMemo(() => {
    const costOfSupplies = (items ?? [])
      .flatMap((i) => (Array.isArray(i?.suppliesUsed) ? i.suppliesUsed : []))
      .reduce(
        (s, su) =>
          s + toNumber(su?.unitCost ?? su?.unitPrice) * toNumber(su?.quantity),
        0
      );

    const sub = totalAmount / (1 + IVA_RATE);
    const tax = totalAmount - sub;
    const profit = totalAmount - costOfSupplies - toNumber(cardCommission);

    return { subTotal: sub, taxAmount: tax, serviceProfit: profit };
  }, [totalAmount, items, cardCommission]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Resumen y Pago</CardTitle>
      </CardHeader>

      <CardContent className="pt-0 flex flex-col space-y-4 flex-grow">
        <PaymentSection
          onOpenValidateDialog={onOpenValidateDialog}
          validatedFolios={validatedFolios}
          totalAmount={totalAmount} // pasamos el total reactivo
        />

        <div className="w-full mt-auto space-y-2 text-sm border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-medium">{formatCurrency(subTotal)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">IVA ({(IVA_RATE * 100).toFixed(0)}%):</span>
            <span className="font-medium">{formatCurrency(taxAmount)}</span>
          </div>

          {toNumber(cardCommission) > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Comisión Tarjeta:</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(toNumber(cardCommission))}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Ganancia:</span>
            <span className="font-medium text-green-600">
              {formatCurrency(serviceProfit)}
            </span>
          </div>

          <Separator className="my-2" />

          <div className="flex justify-between items-center text-lg font-bold pt-1">
            <span>Total:</span>
            <span className="text-primary">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
