// src/app/(app)/vehiculos/components/vehicle-dialog.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { FormDialog } from '@/components/shared/form-dialog';
import { VehicleForm, type VehicleFormValues } from "./vehicle-form";
import type { Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface VehicleDialogProps {
  trigger?: React.ReactNode;
  vehicle?: Partial<Vehicle> | null;
  onSave: (data: VehicleFormValues) => Promise<void>;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function VehicleDialog({
  trigger,
  vehicle,
  onSave,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: VehicleDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = (isOpen: boolean) => {
    if (isControlled) setControlledOpen(isOpen);
    else setUncontrolledOpen(isOpen);
  };

  const handleSubmit = async (values: VehicleFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values);
      handleOpenChange(false);
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el vehículo. Intente de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = vehicle && 'id' in vehicle && vehicle.id ? "Editar Vehículo" : "Nuevo Vehículo";
  const dialogDescription = vehicle && 'id' in vehicle && vehicle.id
    ? "Actualiza los detalles del vehículo."
    : "Completa la información para un nuevo vehículo.";

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={trigger && !isControlled ? <div onClick={() => handleOpenChange(true)}>{trigger}</div> : undefined}
      title={dialogTitle}
      description={dialogDescription}
      formId="vehicle-form"
      isSubmitting={isSubmitting}
      submitButtonText={vehicle && 'id' in vehicle && vehicle.id ? "Actualizar Vehículo" : "Crear Vehículo"}
      dialogContentClassName="sm:max-w-2xl"
    >
      <VehicleForm id="vehicle-form" initialData={vehicle as Vehicle | null} onSubmit={handleSubmit} />
    </FormDialog>
  );
}
