
"use client";

import React, { useState } from 'react';
import { FormDialog } from '@/components/shared/form-dialog';
import { SupplierForm } from "./supplier-form";
import type { SupplierFormValues } from '@/schemas/supplier-form-schema';
import type { Supplier } from "@/types";
import { useToast } from "@/hooks/use-toast";

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
  
  const handleOpenChange = (isOpen: boolean) => {
    if (isControlled) {
      setControlledOpen(isOpen);
    } else {
      setUncontrolledOpen(isOpen);
    }
  };

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
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger && !isControlled ? <div onClick={() => handleOpenChange(true)}>{trigger}</div> : undefined}
      title={supplier ? "Editar Proveedor" : "Nuevo Proveedor"}
      description={supplier ? "Actualiza los detalles del proveedor." : "Completa la información para un nuevo proveedor."}
      formId="supplier-form"
      isSubmitting={isSubmitting}
      submitButtonText={supplier ? "Actualizar Proveedor" : "Crear Proveedor"}
    >
        <SupplierForm
          id="supplier-form"
          initialData={supplier}
          onSubmit={handleSubmit}
        />
    </FormDialog>
  );
}
