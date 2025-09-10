
"use client";

import React, { useState } from 'react';
import { FormDialog } from '@/components/shared/form-dialog';
import { DriverForm, type DriverFormValues } from "./driver-form";
import type { Driver, Vehicle } from "@/types";
import { useToast } from '@/hooks/use-toast';

interface DriverDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  driver?: Driver | null;
  onSave: (data: DriverFormValues) => Promise<void>;
  allVehicles: Vehicle[];
}

export function DriverDialog({ open, onOpenChange, driver, onSave, allVehicles }: DriverDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: DriverFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error al guardar", description: "No se pudo guardar el conductor.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={driver ? "Editar Conductor" : "Nuevo Conductor"}
      description={driver ? "Actualiza los detalles del conductor." : "Completa la información para registrar un nuevo conductor."}
      formId="driver-form"
      isSubmitting={isSubmitting}
      submitButtonText={driver ? "Actualizar Conductor" : "Crear Conductor"}
    >
      <DriverForm
        id="driver-form"
        initialData={driver}
        onSubmit={handleSubmit}
        allVehicles={allVehicles}
      />
    </FormDialog>
  );
}
