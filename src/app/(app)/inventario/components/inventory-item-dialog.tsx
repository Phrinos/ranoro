

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
import type { InventoryItem, InventoryCategory, Supplier } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { placeholderCategories, placeholderSuppliers } from '@/lib/placeholder-data'; // Ensure these are imported if not passed as props

interface InventoryItemDialogProps {
  trigger?: React.ReactNode;
  item?: InventoryItem | Partial<InventoryItemFormValues> | null; 
  onSave?: (data: InventoryItemFormValues) => Promise<void>;
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  categories?: InventoryCategory[]; // Optional prop
  suppliers?: Supplier[]; // Optional prop
}

export function InventoryItemDialog({ 
  trigger, 
  item, 
  onSave,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  categories: categoriesProp,
  suppliers: suppliersProp,
}: InventoryItemDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  const isEditing = item && 'id' in item && item.id; 

  // Use passed props for categories/suppliers, or fallback to imported placeholders
  const categoriesToUse = categoriesProp || placeholderCategories;
  const suppliersToUse = suppliersProp || placeholderSuppliers;


  const handleSubmit = async (values: InventoryItemFormValues) => {
    try {
      if (onSave) {
        await onSave(values);
      }
      // Toast message is handled by the parent page (InventarioPage)
      // to provide context (created vs. updated vs. created for purchase)
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
  
  // When creating an item, partial data might be passed (e.g., SKU from search)
  const initialFormData = item ? {
    name: 'name' in item ? item.name || '' : '',
    sku: 'sku' in item ? item.sku || '' : '',
    description: 'description' in item ? item.description || '' : '',
    quantity: 'quantity' in item ? item.quantity || 0 : 0,
    unitPrice: 'unitPrice' in item ? item.unitPrice || 0 : 0,
    sellingPrice: 'sellingPrice' in item ? item.sellingPrice || 0 : 0,
    lowStockThreshold: 'lowStockThreshold' in item ? item.lowStockThreshold || 5 : 5,
    category: 'category' in item ? item.category || (categoriesToUse.length > 0 ? categoriesToUse[0].name : '') : (categoriesToUse.length > 0 ? categoriesToUse[0].name : ''),
    supplier: 'supplier' in item ? item.supplier || (suppliersToUse.length > 0 ? suppliersToUse[0].name : '') : (suppliersToUse.length > 0 ? suppliersToUse[0].name : ''),
    // Include id if it's an existing item for editing
    ...(isEditing && 'id' in item && {id: item.id})
  } : null;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
       {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      {open && (
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
              categories={categoriesToUse}
              suppliers={suppliersToUse} 
            />
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
