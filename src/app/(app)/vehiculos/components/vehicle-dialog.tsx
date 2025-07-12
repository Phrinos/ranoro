
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VehicleForm } from "./vehicle-form";
import type { Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import type { VehicleFormValues } from "./vehicle-form"; // Import VehicleFormValues

interface VehicleDialogProps {
  trigger?: React.ReactNode; // Make trigger optional for programmatic control
  vehicle?: Partial<Vehicle> | null;
  onSave?: (data: VehicleFormValues) => Promise<void>; // Use specific form values type
  open?: boolean; // To control dialog externally
  onOpenChange?: (isOpen: boolean) => void; // To control dialog externally
}

export function VehicleDialog({
  trigger,
  vehicle,
  onSave,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: VehicleDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  const handleSubmit = async (values: VehicleFormValues) => {
    try {
      if (onSave) {
        await onSave(values);
      }
      onOpenChange(false); // Close dialog
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el vehículo. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      {open && (
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{vehicle && 'id' in vehicle ? "Editar Vehículo" : "Nuevo Vehículo"}</DialogTitle>
            <DialogDescription>
              {vehicle && 'id' in vehicle ? "Actualiza los detalles del vehículo." : "Completa la información para un nuevo vehículo."}
            </DialogDescription>
          </DialogHeader>
          <VehicleForm
            initialData={vehicle}
            onSubmit={handleSubmit}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
