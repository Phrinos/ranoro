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
  vehicles?: Vehicle[]; // Optional if isReadOnly and service is provided
  technicians?: Technician[]; // Optional if isReadOnly and service is provided
  inventoryItems?: InventoryItem[]; // Optional if isReadOnly and service is provided
  onSave?: (data: any) => Promise<void>;
  isReadOnly?: boolean; // Added for read-only view
  open?: boolean; // For controlled dialog
  onOpenChange?: (isOpen: boolean) => void; // For controlled dialog
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
  onOpenChange: setControlledOpen 
}: ServiceDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  const handleSubmit = async (values: any) => {
    if (isReadOnly) {
      onOpenChange(false);
      return;
    }
    try {
      if (onSave) {
        await onSave(values); 
      }
      toast({
        title: `Servicio ${service && !isReadOnly ? 'actualizado' : 'creado'} con éxito`, // Avoid "actualizado" if it was read-only
        description: `El servicio ha sido ${service && !isReadOnly ? 'actualizado' : 'registrado'}.`,
      });
      onOpenChange(false); 
    } catch (error) {
      console.error("Error saving service:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el servicio. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };
  
  const effectiveVehicles = vehicles || (service ? placeholderVehicles.filter(v => v.id === service.vehicleId) : []);
  const effectiveTechnicians = technicians || (service ? placeholderTechnicians.filter(t => t.id === service.technicianId) : []);
  const effectiveInventoryItems = inventoryItems || placeholderInventory;


  // Ensure that placeholderVehicles, placeholderTechnicians, placeholderInventory are imported if used as fallbacks
  // For simplicity, assuming they are available globally or imported if this component is used standalone.
  // If not, they should be passed or fetched.

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      {open && (
        <DialogContent className="sm:max-w-[600px] md:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isReadOnly ? "Detalles del Servicio" : (service ? "Editar Servicio" : "Nuevo Servicio")}</DialogTitle>
            <DialogDescription>
              {isReadOnly ? "Visualizando los detalles de la orden de servicio." : (service ? "Actualiza los detalles de la orden de servicio." : "Completa la información para una nueva orden de servicio.")}
            </DialogDescription>
          </DialogHeader>
          <ServiceForm
            initialData={service}
            vehicles={effectiveVehicles}
            technicians={effectiveTechnicians}
            inventoryItems={effectiveInventoryItems}
            onSubmit={handleSubmit}
            onClose={() => onOpenChange(false)}
            isReadOnly={isReadOnly}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

// Temporary placeholder data if needed locally, ideally passed as props or fetched from context/store
const placeholderVehicles: Vehicle[] = [];
const placeholderTechnicians: Technician[] = [];
const placeholderInventory: InventoryItem[] = [];
