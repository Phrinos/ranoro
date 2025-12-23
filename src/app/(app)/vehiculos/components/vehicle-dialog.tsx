
"use client";

import React, { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { FormDialog } from "@/components/shared/form-dialog";
import { VehicleForm } from "./vehicle-form";
import type { Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { vehicleFormSchema } from "@/schemas/vehicle-form-schema";

type VehicleFormInput = z.input<typeof vehicleFormSchema>;
type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

interface VehicleDialogProps {
  trigger?: React.ReactNode;
  vehicle?: Partial<Vehicle> | null;
  onSave: (data: VehicleFormValues) => Promise<void>;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const buildDefaults = (v?: Partial<Vehicle> | null): VehicleFormInput => ({
  make: v?.make ?? "",
  model: v?.model ?? "",
  year: Number(v?.year ?? new Date().getFullYear()),
  engine: (v as any)?.engine ?? "",
  licensePlate: v?.licensePlate ?? "",
  vin: v?.vin ?? "",
  color: v?.color ?? "",
  ownerName: v?.ownerName ?? "",
  ownerPhone: v?.ownerPhone ?? "",
  chatMetaLink: (v as any)?.chatMetaLink ?? "",
  notes: v?.notes ?? "",
  isFleetVehicle: v?.isFleetVehicle ?? false,

  purchasePrice: (v as any)?.purchasePrice ?? undefined,
  dailyRentalCost: (v as any)?.dailyRentalCost ?? undefined,
  gpsCost: (v as any)?.gpsCost ?? undefined,
  insuranceCost: (v as any)?.insuranceCost ?? undefined,
  adminCost: (v as any)?.adminCost ?? undefined,

  currentMileage: (v as any)?.currentMileage ?? undefined,
  assignedDriverId: (v as any)?.assignedDriverId ?? "",
});

export function VehicleDialog({
  trigger,
  vehicle,
  onSave,
  open,
  onOpenChange,
}: VehicleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const methods = useForm<VehicleFormInput, any, VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: buildDefaults(vehicle),
    mode: "onBlur",
  });

  const { reset } = methods;

  useEffect(() => {
    if (open) reset(buildDefaults(vehicle));
  }, [open, vehicle, reset]);

  const handleSubmitForm = async (values: VehicleFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values);
      onOpenChange(false);
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

  const hasId = !!(vehicle && "id" in vehicle && vehicle.id);
  const dialogTitle = hasId ? "Editar Vehículo" : "Nuevo Vehículo";
  const dialogDescription = hasId
    ? "Actualiza los detalles del vehículo."
    : "Completa la información para un nuevo vehículo.";

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        trigger ? (
          <div onClick={() => onOpenChange(true)}>{trigger}</div>
        ) : undefined
      }
      title={dialogTitle}
      description={dialogDescription}
      formId="vehicle-form"
      isSubmitting={isSubmitting}
      submitButtonText={hasId ? "Actualizar Vehículo" : "Crear Vehículo"}
      dialogContentClassName="sm:max-w-2xl"
    >
      <FormProvider {...methods}>
        <VehicleForm id="vehicle-form" onSubmit={handleSubmitForm} />
      </FormProvider>
    </FormDialog>
  );
}
