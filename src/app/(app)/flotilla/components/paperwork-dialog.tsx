
"use client";

import React, { useState } from 'react';
import { FormDialog } from '@/components/shared/form-dialog';
import { PaperworkForm, type PaperworkFormValues } from "./paperwork-form";
import type { VehiclePaperwork } from "@/types";
import { useToast } from '@/hooks/use-toast';

interface PaperworkDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  paperwork?: VehiclePaperwork | null;
  onSave: (data: PaperworkFormValues) => void;
}

export function PaperworkDialog({ open, onOpenChange, paperwork, onSave }: PaperworkDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: PaperworkFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo guardar el trámite.", variant: "destructive"});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={paperwork ? "Editar Trámite" : "Nuevo Trámite Pendiente"}
      description={paperwork ? "Actualiza los detalles del trámite." : "Añade un nuevo trámite con su fecha de vencimiento."}
      formId="paperwork-form"
      isSubmitting={isSubmitting}
      submitButtonText="Guardar Trámite"
      dialogContentClassName="sm:max-w-md"
    >
      <PaperworkForm
        id="paperwork-form"
        initialData={paperwork}
        onSubmit={handleSubmit}
      />
    </FormDialog>
  );
}
