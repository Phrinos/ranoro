
"use client";

import React, { useState } from 'react';
import { FormDialog } from '@/components/shared/form-dialog';
import { PayableAccountForm } from "./payable-account-form";
import type { PayableAccountFormValues } from '@/schemas/payable-account-form-schema';
import type { PayableAccount } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface PayableAccountDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (accountId: string, amount: number, paymentMethod: string, note?: string) => void;
  account: PayableAccount;
}

export function PayableAccountDialog({ open, onOpenChange, onSave, account }: PayableAccountDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: PayableAccountFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(account.id, values.amount, values.paymentMethod, values.note);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo guardar el pago.", variant: "destructive"});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Registrar Pago a Factura`}
      description={`Folio: ${account.invoiceId} - Saldo: ${account.totalAmount - account.paidAmount}`}
      formId="payable-account-form"
      isSubmitting={isSubmitting}
      submitButtonText="Registrar Pago"
      dialogContentClassName="sm:max-w-md"
    >
      <PayableAccountForm
        id="payable-account-form"
        onSubmit={handleSubmit}
        account={account}
      />
    </FormDialog>
  );
}
