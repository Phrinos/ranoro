

"use client";

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { InventoryItemForm, type InventoryItemFormValues } from "./inventory-item-form";
import type { InventoryItem, InventoryCategory, Supplier } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { SupplierDialog } from '../proveedores/components/supplier-dialog';
import { CategoryDialog } from './category-dialog';
import { inventoryService } from '@/lib/services';
import type { SupplierFormValues } from '../proveedores/components/supplier-form';
import { Button } from '@/components/ui/button';

interface InventoryItemDialogProps {
  trigger?: React.ReactNode;
  item?: Partial<InventoryItemFormValues> | null; 
  onSave?: (data: InventoryItemFormValues) => Promise<void>;
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

  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  
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
  
  const handleSaveSupplier = useCallback(async (formData: SupplierFormValues) => {
    try {
      const newSupplier = await inventoryService.saveSupplier(formData);
      toast({ title: `Proveedor Creado: ${newSupplier.name}` });
      setIsSupplierDialogOpen(false);
      // The main page listener will update the suppliers list automatically.
    } catch (error) {
      toast({ title: "Error", description: "No se pudo crear el proveedor.", variant: "destructive" });
    }
  }, [toast]);
  
  const handleSaveCategory = useCallback(async (name: string) => {
    try {
      await inventoryService.saveCategory({ name });
      toast({ title: `Categoría Creada: ${name}` });
      setIsCategoryDialogOpen(false);
      // The main page listener will update the categories list automatically.
    } catch (error) {
      toast({ title: "Error", description: "No se pudo crear la categoría.", variant: "destructive" });
    }
  }, [toast]);

  
  const initialFormData = item ? {
    ...item,
    name: item.name || '',
    sku: item.sku || '',
    description: item.description || '',
    quantity: item.quantity ?? 0, // Ensure defined value
    unitPrice: item.unitPrice ?? 0, // Ensure defined value
    sellingPrice: item.sellingPrice ?? 0, // Ensure defined value
    lowStockThreshold: item.lowStockThreshold ?? 5,
    unitType: item.unitType || 'units',
    category: item.category || (categories.length > 0 ? categories[0].name : ''),
    supplier: item.supplier || (suppliers.length > 0 ? suppliers[0].name : ''),
    rendimiento: item.rendimiento ?? 0, // Ensure defined value
    ...(isEditing && 'id' in item && {id: item.id})
  } : null;


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
         {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
            <DialogTitle>{isEditing ? "Editar Producto de Inventario" : "Nuevo Producto de Inventario"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Actualiza los detalles del producto." : "Completa la información para un nuevo producto en el inventario."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto px-6 py-4">
            <InventoryItemForm
              id="inventory-item-form"
              initialData={initialFormData as InventoryItem | null} 
              onSubmit={handleSubmit}
              categories={categories}
              suppliers={suppliers}
              onNewSupplier={() => setIsSupplierDialogOpen(true)}
              onNewCategory={() => setIsCategoryDialogOpen(true)}
            />
          </div>
           <DialogFooter className="p-6 pt-4 border-t bg-background flex-shrink-0 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
            </Button>
            <Button type="submit" form="inventory-item-form">
                 {isEditing ? "Actualizar Ítem" : "Crear Ítem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <SupplierDialog
        open={isSupplierDialogOpen}
        onOpenChange={setIsSupplierDialogOpen}
        onSave={handleSaveSupplier}
      />
      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onSave={handleSaveCategory}
        existingCategories={categories}
      />
    </>
  );
}
