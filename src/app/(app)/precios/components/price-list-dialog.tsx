
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PriceListForm, type PriceListFormValues } from "./price-list-form";
import type { VehiclePriceList } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface PriceListDialogProps {
  record?: VehiclePriceList | null;
  onSave: (data: PriceListFormValues) => Promise<void>;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function PriceListDialog({ 
  record, 
  onSave,
  open,
  onOpenChange 
}: PriceListDialogProps) {
  const { toast } = useToast();

  const handleSubmit = async (values: PriceListFormValues) => {
    try {
      await onSave(values);
    } catch (error) {
      console.error("Error saving vehicle price list:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la lista de precios. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{record ? "Editar Lista de Precios" : "Nueva Lista de Precios por Vehículo"}</DialogTitle>
          <DialogDescription>
            {record ? `Actualiza los detalles para ${record.make} ${record.model}.` : "Completa la información del vehículo y añade los servicios estandarizados."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto -mx-6 px-6">
          <PriceListForm
            initialData={record}
            onSubmit={handleSubmit}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
