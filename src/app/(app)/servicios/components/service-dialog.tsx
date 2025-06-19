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
import { ServiceForm } from "./service-form";
import type { ServiceRecord, Vehicle, Technician, InventoryItem } from "@/types";
import { useToast } from "@/hooks/use-toast"; // Assuming you have a toast hook

interface ServiceDialogProps {
  trigger: React.ReactNode;
  service?: ServiceRecord | null; // For editing
  vehicles: Vehicle[];
  technicians: Technician[];
  inventoryItems: InventoryItem[];
  onSave?: (data: any) => Promise<void>; // Callback after successful save
}

export function ServiceDialog({ trigger, service, vehicles, technicians, inventoryItems, onSave }: ServiceDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: any) => {
    // console.log("Service data to save:", values);
    // Here you would typically call an API to save the data
    // For demo, we'll just simulate a save and show a toast
    try {
      if (onSave) {
        await onSave(values); // If an onSave prop is provided, use it
      }
      toast({
        title: `Servicio ${service ? 'actualizado' : 'creado'} con éxito`,
        description: `El servicio para el vehículo ha sido ${service ? 'actualizado' : 'registrado'}.`,
      });
      setOpen(false); // Close dialog on success
    } catch (error) {
      console.error("Error saving service:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el servicio. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] md:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
          <DialogDescription>
            {service ? "Actualiza los detalles de la orden de servicio." : "Completa la información para una nueva orden de servicio."}
          </DialogDescription>
        </DialogHeader>
        <ServiceForm
          initialData={service}
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
