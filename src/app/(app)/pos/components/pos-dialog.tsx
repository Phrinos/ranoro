
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
import { PosForm } from "./pos-form";
import type { InventoryItem, SaleReceipt } from "@/types"; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

interface PosDialogProps {
  trigger?: React.ReactNode;
  inventoryItems: InventoryItem[];
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  onSaleComplete: (saleData: SaleReceipt) => void; 
  onInventoryItemCreated?: (newItem: InventoryItem) => void; // Add this prop
}

export function PosDialog({ 
  trigger, 
  inventoryItems,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSaleComplete,
  onInventoryItemCreated // Destructure the new prop
}: PosDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  
  const handleOpenChange = (isOpen: boolean) => {
    if (isControlled) {
      setControlledOpen(isOpen);
    } else {
      setUncontrolledOpen(isOpen);
    }
  };

  const handleSaleCompleteInDialog = (saleData: SaleReceipt) => {
    onSaleComplete(saleData); 
  };


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => handleOpenChange(true)}>{trigger}</DialogTrigger>}
      {open && (
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Venta</DialogTitle>
            <DialogDescription>
              Seleccione los artículos, cantidades y método de pago para completar la venta.
            </DialogDescription>
          </DialogHeader>
          <PosForm
            inventoryItems={inventoryItems}
            onSaleComplete={handleSaleCompleteInDialog}
            onInventoryItemCreated={onInventoryItemCreated} // Pass it down
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

