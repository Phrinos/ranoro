"use client";

import React, { useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceForm } from "./ServiceForm";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceFormSchema, type ServiceFormValues } from "@/schemas/service-form";
import type {
  ServiceRecord,
  Vehicle,
  User,
  InventoryItem,
  ServiceTypeRecord,
  InventoryCategory,
  Supplier,
} from "@/types";
import { cn } from "@/lib/utils";
import type { VehicleFormValues } from "@/schemas/vehicle-form-schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type ServiceFormInput = z.input<typeof serviceFormSchema>;

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: ServiceRecord | null;
  vehicles: Vehicle[];
  users: User[];
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  serviceHistory: ServiceRecord[];
  onSave: (data: ServiceFormValues) => Promise<ServiceRecord | void>;
  onSaveSuccess?: (service: ServiceRecord) => void;
  onVehicleCreated?: (newVehicle: VehicleFormValues) => Promise<Vehicle>;
  mode: "service" | "quote";
  activeTab: string;
  onTabChange: (tab: string) => void;
  isChecklistWizardOpen: boolean;
  setIsChecklistWizardOpen: (isOpen: boolean) => void;
  onOpenNewVehicleDialog: (vehicle?: Partial<Vehicle> | null) => void;
}

export function ServiceDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
  onSaveSuccess,
  mode,
  ...rest
}: ServiceDialogProps) {
  const { toast } = useToast();

  const defaultValues = useMemo(
    () =>
      initialData
        ? { ...initialData, status: initialData.status || "Cotizacion" }
        : {
            status: "Cotizacion",
            serviceDate: new Date().toISOString(),
            serviceItems: [],
            payments: [],
          },
    [initialData]
  );

  const methods = useForm<ServiceFormInput, any, ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: defaultValues as any,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const { reset } = methods;

  React.useEffect(() => {
    if (open) reset(defaultValues as any);
  }, [open, defaultValues, reset]);

  const onValidationErrors = (errors: any) => {
    console.error(errors);
    toast({
      title: "Error de validación",
      description: "Por favor, revise los campos marcados en rojo.",
      variant: "destructive",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("max-w-4xl h-full flex flex-col transition-all duration-300", "lg:max-w-6xl")}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar" : "Nueva"} {mode === "quote" ? "Cotización" : "Servicio"}
          </DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <ServiceForm
            initialData={initialData}
            onSave={onSave}
            onSaveSuccess={onSaveSuccess}
            onCancel={() => onOpenChange(false)}
            onValidationErrors={onValidationErrors}
            isNewRecord={!initialData}
            mode={mode}
            {...rest}
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}