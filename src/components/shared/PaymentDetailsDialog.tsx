
// src/app/(app)/servicios/components/PaymentDetailsDialog.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PaymentSection } from "./PaymentSection";
import type { ServiceRecord, SaleReceipt } from "@/types";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentDetailsSchema, PaymentDetailsFormValues } from "@/schemas/payment-details-form-schema";
import { useToast } from "@/hooks/use-toast";
import { NextServiceInfoCard } from '@/app/(app)/servicios/components/NextServiceInfoCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseISO } from 'date-fns';
import { z } from 'zod';

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  record: ServiceRecord | SaleReceipt | null;
  onConfirm: (recordId: string, values: PaymentDetailsFormValues) => void;
  recordType: 'service' | 'sale';
  isCompletionFlow?: boolean;
}

const toNumber = (v: any): number =>
  typeof v === 'number'
    ? (Number.isFinite(v) ? v : 0)
    : typeof v === 'string'
      ? (Number(v.replace(/[^\d.-]/g, '')) || 0)
      : 0;

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

const resolver = zodResolver(paymentDetailsSchema) as unknown as Resolver<PaymentDetailsFormValues>;

export function PaymentDetailsDialog({
  open,
  onOpenChange,
  record,
  onConfirm,
  recordType,
  isCompletionFlow = false,
}: PaymentDetailsDialogProps) {
  const { toast } = useToast();

  const totalAmount = useMemo(() => {
    if (!record) return 0;
    if (recordType === 'sale' && 'totalAmount' in record) {
      return toNumber((record as SaleReceipt).totalAmount);
    }
    const svc = record as ServiceRecord;
    // For services, always prefer the explicit totalCost if it exists.
    return toNumber(svc.totalCost ?? 0);
  }, [record, recordType]);

  const methods = useForm<PaymentDetailsFormValues>({
    resolver,
    defaultValues: {
      payments: [],
      nextServiceInfo: { date: null, mileage: null },
    },
    mode: 'onChange'
  });

  const { handleSubmit, formState: { isSubmitting }, reset } = methods;

  useEffect(() => {
    if (open && record) {
      const existingPayments = (record as any).payments;
      const legacyPaymentMethod = (record as any).paymentMethod;
      
      let initialPayments: any[] = [];
      
      if (Array.isArray(existingPayments) && existingPayments.length > 0) {
        // Cargar los pagos existentes
        initialPayments = existingPayments.map(p => ({
          method: p.method,
          amount: p.amount,
          folio: p.folio || '',
        }));
      } else if (legacyPaymentMethod) {
        // Usar método de pago legacy si existe
        initialPayments = [{ method: legacyPaymentMethod, amount: totalAmount }];
      } else {
        // Valor por defecto si no hay nada
        initialPayments = [{ method: 'Efectivo', amount: totalAmount }];
      }

      reset({
        payments: initialPayments,
        nextServiceInfo: 'nextServiceInfo' in record 
          ? { 
              date: record.nextServiceInfo?.date ? new Date(record.nextServiceInfo.date as any) : null,
              mileage: record.nextServiceInfo?.mileage ?? null
            }
          : { date: null, mileage: null },
      });
    }
  }, [record, totalAmount, open, reset]);

  const processSubmit = (values: PaymentDetailsFormValues) => {
    const normalized = {
      ...values,
      payments: (values.payments || []).map(p => ({
        ...p,
        amount: toNumber(p?.amount),
      })),
    };

    const totalPaid = normalized.payments.reduce((acc, p) => acc + toNumber(p?.amount), 0);
    if (Math.abs(totalAmount - totalPaid) > 0.01) {
      toast({
        title: "El monto del pago no coincide",
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Completar y Cobrar {recordType === 'service' ? 'Servicio' : 'Venta'}</DialogTitle>
          <DialogDescription>
            Confirma los detalles del pago. Total a cobrar: <strong>{currency.format(toNumber(totalAmount))}</strong>.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(processSubmit as any)}>
            <ScrollArea className="max-h-[65vh] p-1">
              <div className="space-y-6 p-4">
                <PaymentSection totalAmount={toNumber(totalAmount)} />
                {recordType === 'service' && isCompletionFlow && (
                  <NextServiceInfoCard
                    nextServiceInfo={methods.watch('nextServiceInfo') as any}
                    onUpdate={(info: any) => {
                      methods.setValue(
                        "nextServiceInfo",
                        {
                          date: typeof info.date === "string" ? parseISO(info.date) : info.date ?? null,
                          mileage: info.mileage ?? null,
                        } as any,
                        { shouldDirty: true }
                      );
                    }}
                    isSubmitting={isSubmitting}
                    currentMileage={vehicle?.currentMileage} 
                  />
                )}
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t">
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
