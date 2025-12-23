"use client";

import React, { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDialog } from "@/components/shared/form-dialog";
import { VehicleForm, type VehicleFormValues } from "./vehicle-form";
import type { Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { vehicleFormSchema } from "@/schemas/vehicle-form-schema";
import { z } from "zod";

type VehicleFormInput = z.input<typeof vehicleFormSchema>;

interface VehicleDialogProps {
  trigger?: React.ReactNode;
  vehicle?: Partial<Vehicle> | null;
  onSave: (data: VehicleFormValues) => Promise<void>;
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

const buildDefaults = (v?: Partial<Vehicle> | null): Partial<VehicleFormInput> => ({
  make: v?.make ?? "",
  model: v?.model ?? "",
  year: v?.year ? Number(v.year) : undefined,
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
  open: openProp,
  onOpenChange,
}: VehicleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = typeof openProp === "boolean" && typeof onOpenChange === "function";
  const open = isControlled ? openProp : uncontrolledOpen;
  const setOpen = isControlled ? onOpenChange : setUncontrolledOpen;

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
      setOpen(false);
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

  const isEdit = Boolean(vehicle && (vehicle as any).id);
  const dialogTitle = isEdit ? "Editar Vehículo" : "Nuevo Vehículo";
  const dialogDescription = isEdit
    ? "Actualiza los detalles del vehículo."
    : "Completa la información para un nuevo vehículo.";

  const triggerNode =
    trigger && !isControlled ? <div onClick={() => setOpen(true)}>{trigger}</div> : undefined;

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={triggerNode}
      title={dialogTitle}
      description={dialogDescription}
      formId="vehicle-form"
      isSubmitting={isSubmitting}
      submitButtonText={isEdit ? "Actualizar Vehículo" : "Crear Vehículo"}
      dialogContentClassName="sm:max-w-2xl"
    >
      <FormProvider {...methods}>
        <VehicleForm id="vehicle-form" onSubmit={handleSubmitForm} />
      </FormProvider>
    </FormDialog>
  );
}
