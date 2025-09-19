"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PurchaseForm } from "./purchase-form";

interface NewPurchaseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function NewPurchaseDialog({ isOpen, onOpenChange }: NewPurchaseDialogProps) {

  const handleSuccess = () => {
    onOpenChange(false);
    // TODO: Opcionalmente, recargar la tabla de compras
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Compra</DialogTitle>
          <DialogDescription>
            Añade los productos comprados, selecciona el proveedor y guarda el registro.
          </DialogDescription>
        </DialogHeader>
        
        {/* El formulario para registrar la compra se insertará aquí */}
        <PurchaseForm onSuccess={handleSuccess} />

      </DialogContent>
    </Dialog>
  );
}
