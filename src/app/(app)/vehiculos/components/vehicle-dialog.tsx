// src/app/(app)/vehiculos/components/vehicle-dialog.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormDialog } from '@/components/shared/form-dialog';
import { VehicleForm, type VehicleFormValues } from "./vehicle-form";
import type { Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { vehicleFormSchema } from '@/schemas/vehicle-form-schema';

interface VehicleDialogProps {
  trigger?: React.ReactNode;
  vehicle?: Partial<Vehicle> | null;
  onSave: (data: VehicleFormValues) => Promise<void>;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const buildDefaults = (v?: Partial<Vehicle> | null): VehicleFormValues => ({
  make: v?.make ?? "",
  model: v?.model ?? "",
  year: v?.year ?? new Date().getFullYear(),
  engine: (v as any)?.engine ?? "",
  licensePlate: v?.licensePlate ?? "",
  vin: v?.vin ?? "",
  color: v?.color ?? "",
  ownerName: v?.ownerName ?? "",
  ownerPhone: v?.ownerPhone ?? "",
  chatMetaLink: (v as any)?.chatMetaLink ?? "",
  notes: v?.notes ?? "",
  isFleetVehicle: v?.isFleetVehicle ?? false,
  purchasePrice: v?.purchasePrice,
  dailyRentalCost: v?.dailyRentalCost,
  gpsCost: v?.gpsCost,
  insuranceCost: v?.insuranceCost,
  adminCost: v?.adminCost,
  currentMileage: v?.currentMileage,
  assignedDriverId: v?.assignedDriverId,
});


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
  
  const methods = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: buildDefaults(vehicle),
    mode: "onBlur",
  });

  const { handleSubmit, reset } = methods;

  useEffect(() => {
    if (open) {
      reset(buildDefaults(vehicle));
    }
  }, [open, vehicle, reset]);


  const handleOpenChange = (isOpen: boolean) => {
    if (isControlled) setControlledOpen(isOpen);
    else setUncontrolledOpen(isOpen);
  };

  const handleSubmitForm = async (values: VehicleFormValues) => {
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
        <FormProvider {...methods}>
            <VehicleForm id="vehicle-form" onSubmit={handleSubmitForm} />
        </FormProvider>
    </FormDialog>
  );
}
