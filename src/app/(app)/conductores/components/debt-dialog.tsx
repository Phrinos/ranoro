
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

interface DebtDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: DebtFormValues) => void;
}

export function DebtDialog({ open, onOpenChange, onSave }: DebtDialogProps) {
  const handleSubmit = async (values: DebtFormValues) => {
    onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir Adeudo Manual</DialogTitle>
          <DialogDescription>
            Registre un cargo adicional para el conductor, como una multa o el costo de un daño.
          </DialogDescription>
        </DialogHeader>
        <DebtForm
          onSubmit={handleSubmit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export type { DebtFormValues };
