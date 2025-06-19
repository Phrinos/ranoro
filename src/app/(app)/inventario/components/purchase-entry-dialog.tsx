
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PurchaseEntryForm, type PurchaseEntryFormValues } from "./purchase-entry-form";
import { useToast } from "@/hooks/use-toast";

interface PurchaseEntryDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: PurchaseEntryFormValues) => Promise<void>;
}

export function PurchaseEntryDialog({ 
  open, 
  onOpenChange,
  onSave,
}: PurchaseEntryDialogProps) {
  const { toast } = useToast();

  const handleSubmit = async (values: PurchaseEntryFormValues) => {
    try {
      await onSave(values);
      // Toast message handled by caller (InventarioPage)
      // onOpenChange(false); // Caller will handle this based on next steps
    } catch (error) {
      console.error("Error processing purchase entry:", error);
      toast({
        title: "Error en Ingreso de Compra",
        description: "No se pudo procesar la compra. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ingresar Compra al Inventario</DialogTitle>
            <DialogDescription>
              Introduce el código del artículo, la cantidad comprada y el nuevo precio de costo.
            </DialogDescription>
          </DialogHeader>
          <PurchaseEntryForm
            onSubmit={handleSubmit}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

export type { PurchaseEntryFormValues };
