
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaperworkForm, type PaperworkFormValues } from "./paperwork-form";
import type { VehiclePaperwork } from "@/types";

interface PaperworkDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  paperwork?: VehiclePaperwork | null;
  onSave: (data: PaperworkFormValues) => void;
}

export function PaperworkDialog({ open, onOpenChange, paperwork, onSave }: PaperworkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{paperwork ? "Editar Trámite" : "Nuevo Trámite Pendiente"}</DialogTitle>
          <DialogDescription>
            {paperwork ? "Actualiza los detalles del trámite." : "Añade un nuevo trámite con su fecha de vencimiento."}
          </DialogDescription>
        </DialogHeader>
        <PaperworkForm
          initialData={paperwork}
          onSubmit={onSave}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
