
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { DriverForm, type DriverFormValues } from "./driver-form";
import type { Driver } from "@/types";
import { Button } from '@/components/ui/button';

interface DriverDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  driver?: Driver | null;
  onSave: (data: DriverFormValues) => Promise<void>;
}

export function DriverDialog({ open, onOpenChange, driver, onSave }: DriverDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle>{driver ? "Editar Conductor" : "Nuevo Conductor"}</DialogTitle>
          <DialogDescription>
            {driver ? "Actualiza los detalles del conductor." : "Completa la información para registrar un nuevo conductor."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-6">
            <DriverForm
              id="driver-form"
              initialData={driver}
              onSubmit={onSave}
            />
        </div>
        <DialogFooter className="p-6 pt-4 border-t bg-background sticky bottom-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
            </Button>
            <Button type="submit" form="driver-form">
                {driver ? "Actualizar Conductor" : "Crear Conductor"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
