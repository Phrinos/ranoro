
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
import type { InventoryItem } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

interface PosDialogProps {
  trigger?: React.ReactNode;
  inventoryItems: InventoryItem[];
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  onSaleCompleteRedirectPath?: string;
}

export function PosDialog({ 
  trigger, 
  inventoryItems,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSaleCompleteRedirectPath = "/pos" // Default redirect path
}: PosDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  
  const handleOpenChange = (isOpen: boolean) => {
    if (isControlled) {
      setControlledOpen(isOpen);
    } else {
      setUncontrolledOpen(isOpen);
    }
    if (!isOpen && isControlled && setControlledOpen) { // If dialog is controlled and is being closed
        router.push(onSaleCompleteRedirectPath); // Redirect on close if controlled
    }
  };

  const handleSaleComplete = () => {
    if (isControlled && setControlledOpen) {
      setControlledOpen(false); // This will trigger the redirect in handleOpenChange
    } else {
      setUncontrolledOpen(false);
      router.push(onSaleCompleteRedirectPath);
    }
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
            onSaleComplete={handleSaleComplete}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
