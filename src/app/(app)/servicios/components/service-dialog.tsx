
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
import { ServiceForm } from "./service-form";
import type { ServiceRecord, Vehicle, Technician, InventoryItem } from "@/types";
import { useToast } from "@/hooks/use-toast"; 


interface ServiceDialogProps {
  trigger?: React.ReactNode;
  service?: ServiceRecord | null; 
  vehicles: Vehicle[]; 
  technicians: Technician[]; 
  inventoryItems: InventoryItem[]; 
  onSave: (data: ServiceRecord) => Promise<void>; // Expect full ServiceRecord for print ticket
  isReadOnly?: boolean; 
  open?: boolean; 
  onOpenChange?: (isOpen: boolean) => void; 
  onVehicleCreated?: (newVehicle: Vehicle) => void; 
}

export function ServiceDialog({ 
  trigger, 
  service, 
  vehicles, 
  technicians, 
  inventoryItems, 
  onSave, 
  isReadOnly = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onVehicleCreated 
}: ServiceDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  const handleSubmit = async (serviceData: ServiceRecord) => { // Expect full ServiceRecord
    if (isReadOnly) {
      if (onOpenChange) onOpenChange(false);
      else setUncontrolledOpen(false);
      return;
    }
    try {
      await onSave(serviceData); 
      // Parent component will handle toast and dialog closing logic, 
      // including potentially opening a print ticket dialog.
      // So, no onOpenChange(false) here directly.
    } catch (error) {
      console.error("Error saving service from dialog:", error);
      toast({
        title: "Error al Guardar Servicio",
        description: "Ocurrió un problema al intentar guardar el servicio desde el diálogo.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      {open && (
        <DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[900px] xl:max-w-[1000px] max-h-[90vh] overflow-y-auto print:hidden">
          <DialogHeader>
            <DialogTitle>{isReadOnly ? "Detalles del Servicio" : (service ? "Editar Servicio" : "Nuevo Servicio")}</DialogTitle>
            <DialogDescription>
              {isReadOnly ? "Visualizando los detalles de la orden de servicio." : (service ? "Actualiza los detalles de la orden de servicio." : "Completa la información para una nueva orden de servicio.")}
            </DialogDescription>
          </DialogHeader>
          <ServiceForm
            initialData={service}
            vehicles={vehicles} 
            technicians={technicians}
            inventoryItems={inventoryItems}
            onSubmit={handleSubmit}
            onClose={() => { if (onOpenChange) onOpenChange(false); else setUncontrolledOpen(false); }}
            isReadOnly={isReadOnly}
            onVehicleCreated={onVehicleCreated} 
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
