

"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { SupplierForm } from "./supplier-form";
import type { Supplier } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { type SupplierFormValues } from '@/schemas/supplier-form-schema';


interface SupplierDialogProps {
  trigger?: React.ReactNode;
  supplier?: Supplier | null;
  onSave: (data: SupplierFormValues) => Promise<void>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  const handleSubmit = async (values: SupplierFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el proveedor. Intente de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle>{supplier ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
          <DialogDescription>
            {supplier ? "Actualiza los detalles del proveedor." : "Completa la información para un nuevo proveedor."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-6 py-4">
            <SupplierForm
              id="supplier-form"
              initialData={supplier}
              onSubmit={handleSubmit}
            />
        </div>
        <DialogFooter className="p-6 pt-4 border-t bg-background flex-shrink-0 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="supplier-form" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : (supplier ? "Actualizar Proveedor" : "Crear Proveedor")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
