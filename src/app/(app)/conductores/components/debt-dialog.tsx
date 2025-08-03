
"use client";

import React, { useState } from 'react';
import { FormDialog } from '@/components/shared/form-dialog';
import { DebtForm, type DebtFormValues } from "./debt-form";
import type { ManualDebtEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface DebtDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: DebtFormValues) => void;
  initialData?: ManualDebtEntry;
}

export function DebtDialog({ open, onOpenChange, onSave, initialData }: DebtDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: DebtFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo guardar el adeudo.", variant: "destructive"});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialData ? 'Editar Adeudo Manual' : 'Añadir Adeudo Manual'}
      description={initialData ? 'Modifique los detalles del cargo.' : 'Registre un cargo adicional para el conductor, como una multa o el costo de un daño.'}
      formId="debt-form"
      isSubmitting={isSubmitting}
      submitButtonText={initialData ? "Actualizar Adeudo" : "Registrar Adeudo"}
      dialogContentClassName="sm:max-w-md"
    >
      <DebtForm
        id="debt-form"
        onSubmit={handleSubmit}
        initialData={initialData}
      />
    </FormDialog>
  );
}

export type { DebtFormValues };
