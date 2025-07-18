

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
  DialogClose,
} from "@/components/ui/dialog";
import { VehicleForm } from "./vehicle-form";
import type { Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import type { VehicleFormValues } from "./vehicle-form";
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface VehicleDialogProps {
  trigger?: React.ReactNode; 
  vehicle?: Partial<Vehicle> | null;
  onSave?: (data: VehicleFormValues) => Promise<void>;
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  hideCloseButton?: boolean; // New prop
}

export function VehicleDialog({
  trigger,
  vehicle,
  onSave,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  hideCloseButton = false,
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
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el vehículo. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };
  
  const dialogTitle = vehicle && 'id' in vehicle && vehicle.id ? "Editar Vehículo" : "Nuevo Vehículo";
  const dialogDescription = vehicle && 'id' in vehicle && vehicle.id
    ? "Actualiza los detalles del vehículo."
    : "Completa la información para un nuevo vehículo.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      {open && (
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b flex flex-row justify-between items-center">
                <div>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>{dialogDescription}</DialogDescription>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="vehicle-form">
                        {vehicle && 'id' in vehicle && vehicle.id ? "Actualizar Vehículo" : "Crear Vehículo"}
                    </Button>
                </div>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto px-6">
                <VehicleForm
                    id="vehicle-form"
                    initialData={vehicle}
                    onSubmit={handleSubmit}
                />
            </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
