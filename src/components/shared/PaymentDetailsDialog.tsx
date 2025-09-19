
"use client";

import React from 'react';
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
  
  const totalAmount = record?.total || (record as SaleReceipt)?.totalAmount || 0;

  const methods = useForm<PaymentDetailsFormValues>({
    resolver: zodResolver(paymentDetailsSchema),
    defaultValues: {
      payments: [{ method: 'Efectivo', amount: totalAmount, date: new Date() }],
      nextServiceInfo: { nextServiceDate: null, nextServiceMileage: null },
    },
  });
  
  const { handleSubmit, formState: { isSubmitting } } = methods;

  const processSubmit = (values: PaymentDetailsFormValues) => {
    const totalPaid = values.payments.reduce((acc, p) => acc + p.amount, 0);
    if (totalPaid < totalAmount) {
      toast({
        title: "Monto Insuficiente",
        description: `El total pagado (${totalPaid}) es menor al total del registro (${totalAmount}).`,
        variant: "destructive",
      });
      return;
    }
    if (record) {
      onConfirm(record.id, values);
    }
  };
  
  if (!record) return null;
  const vehicle = 'vehicle' in record ? record.vehicle : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Completar y Cobrar {recordType === 'service' ? 'Servicio' : 'Venta'}</DialogTitle>
          <DialogDescription>
            Confirma los detalles del pago. El total a cobrar es de <strong>{totalAmount.toFixed(2)} MXN</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(processSubmit)}>
            <ScrollArea className="max-h-[60vh] p-4">
              <div className="space-y-6">
                <PaymentSection totalAmount={totalAmount} />
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
                {isSubmitting ? 'Procesando...' : `Confirmar y ${isCompletionFlow ? 'Completar' : 'Cobrar'}`}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
