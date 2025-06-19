
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SupplierForm, type SupplierFormValues } from "./supplier-form";
import type { Supplier } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface SupplierDialogProps {
  trigger?: React.ReactNode;
  supplier?: Supplier | null;
  onSave: (data: SupplierFormValues) => Promise<void>; // Changed from onSave?:
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function SupplierDialog({ 
  trigger, 
  supplier, 
  onSave,
  open: controlledOpen,
  onOpenChange: setControlledOpen 
}: SupplierDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  const handleSubmit = async (values: SupplierFormValues) => {
    try {
      await onSave(values);
      // Toast message will be handled by the caller (Page)
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el proveedor. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      {open && (
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{supplier ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
            <DialogDescription>
              {supplier ? "Actualiza los detalles del proveedor." : "Completa la información para un nuevo proveedor."}
            </DialogDescription>
          </DialogHeader>
          <SupplierForm
            initialData={supplier}
            onSubmit={handleSubmit}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
