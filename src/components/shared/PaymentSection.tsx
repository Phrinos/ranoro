// src/components/shared/PaymentSection.tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, CreditCard, Landmark, CheckCircle } from "lucide-react";
import type { Payment } from "@/types";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, PlusCircle, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const paymentMethods: Payment["method"][] = ["Efectivo", "Tarjeta", "Tarjeta MSI", "Transferencia"];

const paymentMethodIcons: Record<Payment["method"], React.ElementType> = {
  Efectivo: Wallet,
  Tarjeta: CreditCard,
  "Tarjeta MSI": CreditCard,
  Transferencia: Landmark,
};

interface PaymentSectionProps {
  onOpenValidateDialog?: (index: number) => void;
  validatedFolios?: Record<number, boolean>;
  /** Opcional: si no viene, calculamos el total en vivo desde serviceItems */
  totalAmount?: number;
}

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export function PaymentSection({
  onOpenValidateDialog,
  validatedFolios = {},
  totalAmount: totalAmountProp = 0,
}: PaymentSectionProps) {
  const { control, watch, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "payments" });

  // Observa items para calcular total en vivo si no viene por prop
  const items = useWatch({ control, name: "serviceItems" }) as any[] | undefined;

  const totalAmountLive = useMemo(
    () => (items ?? []).reduce((s, i) => s + toNumber(i?.sellingPrice), 0),
    [items]
  );

  // Escoge el total a usar: en vivo si existe, si no el prop
  const totalAmount = totalAmountLive > 0 ? totalAmountLive : toNumber(totalAmountProp);

  const watchedPayments = watch("payments") as Payment[] | undefined;

  // Total pagado y faltante
  const totalPaid = useMemo(
    () => (watchedPayments ?? []).reduce((acc, p) => acc + toNumber(p?.amount), 0),
    [watchedPayments]
  );
  const remaining = Math.max(0, totalAmount - totalPaid);

  // Autorrelleno: si hay UNA línea y está vacía, la llenamos con el total
  useEffect(() => {
    if (!watchedPayments || watchedPayments.length === 0) return;
    if (totalAmount <= 0) return;

    // Solo si el primer pago está undefined / null / "" / 0
    const v = watchedPayments[0]?.amount;
    const isEmpty = v === undefined || v === null || v === "" || toNumber(v) === 0;

    if (watchedPayments.length === 1 && isEmpty) {
      setValue(`payments.0.amount`, totalAmount, { shouldValidate: true, shouldDirty: true });
    }
  }, [totalAmount, watchedPayments, setValue]);

  const availablePaymentMethods = paymentMethods.filter(
    (method) => !(watchedPayments ?? []).some((p) => p?.method === method)
  );

  const handleAddPayment = () => {
    const remainingAmount = Math.max(0, totalAmount - totalPaid);
    append({
      method: availablePaymentMethods[0] ?? "Efectivo",
      amount: remainingAmount > 0.01 ? remainingAmount : undefined,
      folio: "",
    } as any);
  };

  return (
    <Card className="p-4">
      <FormLabel>Métodos de Pago</FormLabel>
      <div className="space-y-4 mt-2">
        {fields.map((field, index) => {
          const selectedMethod = watchedPayments?.[index]?.method;
          const showFolio =
            selectedMethod === "Tarjeta" ||
            selectedMethod === "Tarjeta MSI" ||
            selectedMethod === "Transferencia";
          const folioLabel = selectedMethod === "Transferencia" ? "Folio de Transferencia" : "Folio de Voucher";
          const isFolioValidated = validatedFolios[index];

          return (
            <div key={field.id} className="space-y-2 p-3 border rounded-md bg-background">
              <div className="flex gap-2 items-end">
                <FormField
                  control={control}
                  name={`payments.${index}.amount`}
                  render={({ field: formField }) => (
                    <FormItem className="flex-grow">
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...formField}
                            value={formField.value ?? ""}
                            className="pl-8 bg-white"
                            onChange={(e) => {
                              const raw = e.target.value;
                              formField.onChange(raw === "" ? "" : toNumber(raw));
                            }}
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`payments.${index}.method`}
                  render={({ field: formField }) => (
                    <FormItem className="w-48">
                      <Select onValueChange={formField.onChange} value={formField.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentMethods.map((method) => {
                            const Icon = paymentMethodIcons[method];
                            const disabled =
                              availablePaymentMethods.indexOf(method) === -1 && method !== selectedMethod;
                            return (
                              <SelectItem key={method} value={method} disabled={disabled}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <span>{method}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                {fields.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              {showFolio && (
                <div className="flex items-end gap-2 mt-2">
                  <FormField
                    control={control}
                    name={`payments.${index}.folio`}
                    render={({ field: formField }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder={folioLabel}
                              {...formField}
                              value={formField.value ?? ""}
                              className="bg-white"
                            />
                            {isFolioValidated && (
                              <CheckCircle className="absolute right-2 top-2.5 h-5 w-5 text-green-500" />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {(selectedMethod === "Tarjeta" || selectedMethod === "Tarjeta MSI") &&
                    onOpenValidateDialog && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => onOpenValidateDialog(index)}
                      >
                        Validar
                      </Button>
                    )}
                </div>
              )}

              <FormMessage className="text-red-500">
                {/* errores por campo si tu schema los define */}
              </FormMessage>
            </div>
          );
        })}

        {availablePaymentMethods.length > 0 && fields.length < paymentMethods.length && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleAddPayment}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir método de pago
            </Button>
          </div>
        )}

        <div className="flex justify-between font-semibold pt-2 border-t">
          <span>Total Pagado:</span>
          <span>{formatCurrency(totalPaid)}</span>
        </div>
        <div className="flex justify-between font-semibold text-destructive">
          <span>Faltante por Pagar:</span>
          <span>{formatCurrency(remaining)}</span>
        </div>
      </div>
    </Card>
  );
}
