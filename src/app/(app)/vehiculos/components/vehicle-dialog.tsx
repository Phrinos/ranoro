"use client";

import React, { useState } from 'react';
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

interface VehicleDialogProps {
  trigger: React.ReactNode;
  vehicle?: Vehicle | null;
  onSave?: (data: any) => Promise<void>;
}

export function VehicleDialog({ trigger, vehicle, onSave }: VehicleDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: any) => {
    try {
      if (onSave) {
        await onSave(values);
      }
      toast({
        title: `Vehículo ${vehicle ? 'actualizado' : 'creado'} con éxito`,
        description: `El vehículo ${values.make} ${values.model} ha sido ${vehicle ? 'actualizado' : 'registrado'}.`,
      });
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Editar Vehículo" : "Nuevo Vehículo"}</DialogTitle>
          <DialogDescription>
            {vehicle ? "Actualiza los detalles del vehículo." : "Completa la información para un nuevo vehículo."}
          </DialogDescription>
        </DialogHeader>
        <VehicleForm
          initialData={vehicle}
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
