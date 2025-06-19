
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
import { InventoryItemForm, type InventoryItemFormValues } from "./inventory-item-form";
import type { InventoryItem } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface InventoryItemDialogProps {
  trigger?: React.ReactNode;
  item?: InventoryItem | Partial<InventoryItemFormValues> | null; // Allow partial for pre-filling
  onSave?: (data: InventoryItemFormValues) => Promise<void>;
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function InventoryItemDialog({ 
  trigger, 
  item, 
  onSave,
  open: controlledOpen,
  onOpenChange: setControlledOpen
}: InventoryItemDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  const isEditing = item && 'id' in item && item.id; // Check if it's a full InventoryItem with an id for editing

  const handleSubmit = async (values: InventoryItemFormValues) => {
    try {
      if (onSave) {
        await onSave(values);
      }
      // Toast message handled by caller for create/update differentiation
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving inventory item:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el artículo. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };
  
  // When item is partial (from purchase entry for a new item), pass it as initialData.
  // If item is a full InventoryItem, it's for editing.
  // If item is null/undefined, it's for creating from scratch via "Nuevo Artículo" button.
  const initialFormData = item ? item : null;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
       {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      {open && (
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Artículo de Inventario" : "Nuevo Artículo de Inventario"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Actualiza los detalles del artículo." : "Completa la información para un nuevo artículo en el inventario."}
            </DialogDescription>
          </DialogHeader>
          <InventoryItemForm
            initialData={initialFormData as InventoryItem | null} // Cast to what InventoryItemForm expects
            onSubmit={handleSubmit}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
