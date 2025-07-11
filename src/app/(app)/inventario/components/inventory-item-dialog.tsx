
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
import { InventoryItemForm, type InventoryItemFormValues } from "./inventory-item-form";
import type { InventoryItem, InventoryCategory, Supplier } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface InventoryItemDialogProps {
  trigger?: React.ReactNode;
  item?: Partial<InventoryItemFormValues> | null; 
  onSave?: (data: InventoryItemFormValues) => Promise<InventoryItem>; // Changed to return the created item
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  categories: InventoryCategory[];
  suppliers: Supplier[];
}

export function InventoryItemDialog({ 
  trigger, 
  item, 
  onSave,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  categories,
  suppliers,
}: InventoryItemDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  const isEditing = item && 'id' in item && item.id; 

  const handleSubmit = async (values: InventoryItemFormValues) => {
    try {
      if (onSave) {
        await onSave(values);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving inventory item:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el producto. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };
  
  const initialFormData = item ? {
    name: 'name' in item ? item.name || '' : '',
    sku: 'sku' in item ? item.sku || '' : '',
    description: 'description' in item ? item.description || '' : '',
    quantity: 'quantity' in item ? item.quantity || 0 : 0,
    unitPrice: 'unitPrice' in item ? item.unitPrice || 0 : 0,
    sellingPrice: 'sellingPrice' in item ? item.sellingPrice || 0 : 0,
    lowStockThreshold: 'lowStockThreshold' in item ? item.lowStockThreshold || 5 : 5,
    unitType: 'unitType' in item ? item.unitType || 'units' : 'units',
    category: 'category' in item ? item.category || (categories.length > 0 ? categories[0].name : '') : (categories.length > 0 ? categories[0].name : ''),
    supplier: 'supplier' in item ? item.supplier || (suppliers.length > 0 ? suppliers[0].name : '') : (suppliers.length > 0 ? suppliers[0].name : ''),
    ...(isEditing && 'id' in item && {id: item.id})
  } : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
       {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? "Editar Producto de Inventario" : "Nuevo Producto de Inventario"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Actualiza los detalles del producto." : "Completa la información para un nuevo producto en el inventario."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto -mx-6 px-6">
          <InventoryItemForm
            initialData={initialFormData as InventoryItem | null} 
            onSubmit={handleSubmit}
            onClose={() => onOpenChange(false)}
            categories={categories}
            suppliers={suppliers} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
