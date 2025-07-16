

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PriceListForm } from "./price-list-form";
import type { VehiclePriceList, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier } from "@/types";
import type { PriceListFormValues } from "./price-list-form";

interface PriceListDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: PriceListFormValues) => void;
  record?: VehiclePriceList | null;
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
}

export function PriceListDialog({ open, onOpenChange, onSave, record, inventoryItems, categories, suppliers }: PriceListDialogProps) {
  const dialogTitle = record ? "Editar Lista de Precios" : "Nueva Lista de Precios";
  const dialogDescription = record
    ? `Actualiza la información para ${record.make} ${record.model}.`
    : "Define los servicios y precios estandarizados para un nuevo modelo de vehículo.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-6 py-4">
          <PriceListForm
            initialData={record}
            onSubmit={onSave}
            onClose={() => onOpenChange(false)}
            inventoryItems={inventoryItems}
            categories={categories}
            suppliers={suppliers}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
