// src/app/(app)/servicios/components/PaymentDetailsDialog.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PaymentSection } from "./PaymentSection";
import type { ServiceRecord, SaleReceipt } from "@/types";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentDetailsSchema, PaymentDetailsFormValues } from "@/schemas/payment-details-form-schema";
import { useToast } from "@/hooks/use-toast";
import { NextServiceInfoCard } from '@/app/(app)/servicios/components/NextServiceInfoCard';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ServiceRecord | SaleReceipt | null;
  onConfirm: (recordId: string, values: PaymentDetailsFormValues) => void;
  recordType: 'service' | 'sale';
  isCompletionFlow?: boolean; // si true, completa el servicio
}

// Parser robusto de números (soporta "$", comas, etc.)
const toNumber = (v: any) =>
  typeof v === 'number'
    ? (Number.isFinite(v) ? v : 0)
    : typeof v === 'string'
      ? (Number(v.replace(/[^\d.-]/g, '')) || 0)
      : 0;

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function PaymentDetailsDialog({
  open,
  onOpenChange,
  record,
  onConfirm,
  recordType,
  isCompletionFlow = false,
}: PaymentDetailsDialogProps) {
  const { toast } = useToast();

  // Cálculo robusto del total a cobrar
  const totalAmount = useMemo(() => {
    if (!record) return 0;

    // 1) si es venta, usa totalAmount
    if (recordType === 'sale' && 'totalAmount' in record) {
      return toNumber((record as SaleReceipt).totalAmount);
    }

    // 2) si es servicio: preferencia por total; si no hay, derive de items
    const svc = record as ServiceRecord;
    const fromTotal = toNumber((svc as any).total);
    if (fromTotal > 0) return fromTotal;

    const derived = Array.isArray(svc?.serviceItems)
      ? svc.serviceItems.reduce((acc, it: any) => {
          const qty = toNumber(it?.quantity ?? 1);
          const price = toNumber(it?.sellingPrice);
          const discount = toNumber(it?.discount);
          return acc + Math.max(price * (qty || 1) - discount, 0);
        }, 0)
      : 0;

    return derived;
  }, [record, recordType]);

  const methods = useForm<PaymentDetailsFormValues>({
    resolver: zodResolver(paymentDetailsSchema),
    defaultValues: {
      payments: [{ method: 'Efectivo', amount: totalAmount, date: new Date() }],
      nextServiceInfo: { nextServiceDate: null, nextServiceMileage: null },
    },
    mode: 'onChange'
  });

  const { handleSubmit, formState: { isSubmitting }, reset, getValues } = methods;

  // Reinicia el formulario cuando cambie el registro o el diálogo se vuelva a abrir
  useEffect(() => {
    if (!record) return;
    reset({
      payments: [{ method: 'Efectivo', amount: totalAmount, date: new Date() }],
      nextServiceInfo: getValues('nextServiceInfo') ?? { nextServiceDate: null, nextServiceMileage: null },
    });
  }, [record, totalAmount, open, reset]); // importante incluir `open` para reusar el diálogo

  const processSubmit = (values: PaymentDetailsFormValues) => {
    const normalized = {
      ...values,
      payments: (values.payments || []).map(p => ({
        ...p,
        amount: toNumber(p.amount),
        date: p.date ? new Date(p.date) : new Date(),
      })),
    };

    const totalPaid = normalized.payments.reduce((acc, p) => acc + toNumber(p.amount), 0);
    if (totalPaid < toNumber(totalAmount)) {
      toast({
        title: "Monto insuficiente",
        description: `Pagado: ${currency.format(totalPaid)} / Requerido: ${currency.format(toNumber(totalAmount))}`,
        variant: "destructive",
      });
      return;
    }

    if (record) onConfirm((record as any).id, normalized);
  };

  if (!record) return null;
  const vehicle = 'vehicle' in record ? (record as ServiceRecord).vehicle : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Completar y Cobrar {recordType === 'service' ? 'Servicio' : 'Venta'}</DialogTitle>
          <DialogDescription>
            Confirma los detalles del pago. Total a cobrar: <strong>{currency.format(toNumber(totalAmount))}</strong>.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(processSubmit)}>
            <ScrollArea className="max-h-[60vh] p-4">
              <div className="space-y-6">
                <PaymentSection totalAmount={toNumber(totalAmount)} />
                {recordType === 'service' && vehicle && (
                  <NextServiceInfoCard currentMileage={vehicle.mileage} />
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="mt-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Procesando…' : `Confirmar y ${isCompletionFlow ? 'Completar' : 'Cobrar'}`}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
