

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form
} from "@/components/ui/form";
import type { ServiceRecord, PaymentMethod, SaleReceipt, Payment } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import React, { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { PaymentSection } from '@/components/shared/PaymentSection';
import { paymentDetailsSchema, PaymentDetailsFormValues } from "@/schemas/payment-details-form-schema";


interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  record: ServiceRecord | SaleReceipt;
  onConfirm: (recordId: string, paymentDetails: PaymentDetailsFormValues) => void;
  recordType: 'service' | 'sale';
  isCompletionFlow?: boolean;
}

export function PaymentDetailsDialog({
  open,
  onOpenChange,
  record,
  onConfirm,
  recordType,
  isCompletionFlow = false,
}: PaymentDetailsDialogProps) {
  const { toast } = useToast();
  const totalAmount = 'totalCost' in record ? record.totalCost : record.totalAmount;

  const form = useForm<PaymentDetailsFormValues>({
    resolver: zodResolver(paymentDetailsSchema),
    defaultValues: {
      payments: record.payments?.length ? record.payments : [{ method: 'Efectivo', amount: totalAmount, folio: '' }],
    }
  });
  
  const { watch, control, handleSubmit, reset } = form;
  
  const [validatedFolios, setValidatedFolios] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (open) {
      reset({
        payments: record.payments?.length ? record.payments : [{ method: 'Efectivo', amount: totalAmount || undefined, folio: '' }],
      });
      setValidatedFolios({});
    }
  }, [open, record, totalAmount, reset]);

  const handleFormSubmit = (values: PaymentDetailsFormValues) => {
    const totalPaid = values.payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    if (Math.abs(totalPaid - totalAmount) > 0.01) {
        toast({
            title: "El pago no coincide",
            description: `El total pagado (${formatCurrency(totalPaid)}) no coincide con el total del registro (${formatCurrency(totalAmount)}).`,
            variant: "destructive"
        });
        return;
    }
    onConfirm(record.id, values);
  };
  
  const handleOpenValidateDialog = (index: number) => {
    // This functionality is now inside PaymentSection, but the dialog logic could be handled here
    console.log("Validation requested for index:", index);
    toast({ title: "Validación no implementada en este diálogo." });
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>{isCompletionFlow ? "Completar y Cobrar" : "Editar Detalles de Pago"}</DialogTitle>
            <DialogDescription>{`Confirme los detalles de pago para el folio ${record.id}`}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Total a Pagar</p>
                <p className="text-4xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
              </CardContent>
            </Card>
            <FormProvider {...form}>
              <form id="payment-details-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                 <PaymentSection 
                    onOpenValidateDialog={handleOpenValidateDialog} 
                    validatedFolios={validatedFolios}
                 />
              </form>
            </FormProvider>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" form="payment-details-form">{isCompletionFlow ? 'Completar y Cobrar' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}