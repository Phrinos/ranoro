
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DebtForm, type DebtFormValues } from "./debt-form";
import type { ManualDebtEntry } from '@/types';

interface DebtDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: DebtFormValues) => void;
  initialData?: ManualDebtEntry;
}

export function DebtDialog({ open, onOpenChange, onSave, initialData }: DebtDialogProps) {
  const handleSubmit = async (values: DebtFormValues) => {
    onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Adeudo Manual' : 'Añadir Adeudo Manual'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifique los detalles del cargo.' : 'Registre un cargo adicional para el conductor, como una multa o el costo de un daño.'}
          </DialogDescription>
        </DialogHeader>
        <DebtForm
          onSubmit={handleSubmit}
          onClose={() => onOpenChange(false)}
          initialData={initialData}
        />
      </DialogContent>
    </Dialog>
  );
}

export type { DebtFormValues };
