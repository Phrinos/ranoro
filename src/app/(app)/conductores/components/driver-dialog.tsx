
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DriverForm, type DriverFormValues } from "./driver-form";
import type { Driver } from "@/types";

interface DriverDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  driver?: Driver | null;
  onSave: (data: DriverFormValues) => Promise<void>;
}

export function DriverDialog({ open, onOpenChange, driver, onSave }: DriverDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{driver ? "Editar Conductor" : "Nuevo Conductor"}</DialogTitle>
          <DialogDescription>
            {driver ? "Actualiza los detalles del conductor." : "Completa la información para registrar un nuevo conductor."}
          </DialogDescription>
        </DialogHeader>
        <DriverForm
          initialData={driver}
          onSubmit={onSave}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
