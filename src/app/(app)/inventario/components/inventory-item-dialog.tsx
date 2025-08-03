
"use client";

import React, { useState, useCallback } from 'react';
import { FormDialog } from '@/components/shared/form-dialog';
import { InventoryItemForm, type InventoryItemFormValues } from "./inventory-item-form";
import type { InventoryItem, InventoryCategory, Supplier } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { SupplierDialog } from "../../proveedores/components/supplier-dialog";
import { CategoryDialog } from './category-dialog';
import { inventoryService } from '@/lib/services';
import type { SupplierFormValues } from '@/schemas/supplier-form-schema';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  
  const handleOpenChange = (isOpen: boolean) => {
    if (isControlled) {
      setControlledOpen(isOpen);
    } else {
      setUncontrolledOpen(isOpen);
    }
  };

  const isEditing = item && 'id' in item && item.id; 

  const handleSubmit = async (values: InventoryItemFormValues) => {
    setIsSubmitting(true);
    try {
      if (onSave) {
        await onSave(values);
      }
      handleOpenChange(false);
    } catch (error) {
      console.error("Error saving inventory item:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el producto. Intente de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSaveSupplier = useCallback(async (formData: SupplierFormValues) => {
    try {
      const newSupplier = await inventoryService.saveSupplier(formData);
      toast({ title: `Proveedor Creado: ${newSupplier.name}` });
      setIsSupplierDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo crear el proveedor.", variant: "destructive" });
    }
  }, [toast]);
  
  const handleSaveCategory = useCallback(async (name: string) => {
    try {
      await inventoryService.saveCategory({ name });
      toast({ title: `Categoría Creada: ${name}` });
      setIsCategoryDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo crear la categoría.", variant: "destructive" });
    }
  }, [toast]);

  
  const initialFormData = item ? {
    ...item,
    name: item.name || '',
    sku: item.sku || '',
    description: item.description || '',
    quantity: item.quantity ?? 0,
    unitPrice: item.unitPrice ?? 0,
    sellingPrice: item.sellingPrice ?? 0,
    lowStockThreshold: item.lowStockThreshold ?? 5,
    unitType: item.unitType || 'units',
    category: item.category || (categories.length > 0 ? categories[0].name : ''),
    supplier: item.supplier || (suppliers.length > 0 ? suppliers[0].name : ''),
    rendimiento: item.rendimiento ?? 0,
    ...(isEditing && 'id' in item && {id: item.id})
  } : null;


  return (
    <>
      <FormDialog
        trigger={trigger && !isControlled ? <div onClick={() => handleOpenChange(true)}>{trigger}</div> : undefined}
        open={open}
        onOpenChange={handleOpenChange}
        title={isEditing ? "Editar Producto de Inventario" : "Nuevo Producto de Inventario"}
        description={isEditing ? "Actualiza los detalles del producto." : "Completa la información para un nuevo producto en el inventario."}
        formId="inventory-item-form"
        isSubmitting={isSubmitting}
        submitButtonText={isEditing ? "Actualizar Ítem" : "Crear Ítem"}
        dialogContentClassName="sm:max-w-3xl"
      >
        <InventoryItemForm
          id="inventory-item-form"
          initialData={initialFormData as InventoryItem | null} 
          onSubmit={handleSubmit}
          categories={categories}
          suppliers={suppliers}
          onNewSupplier={() => setIsSupplierDialogOpen(true)}
          onNewCategory={() => setIsCategoryDialogOpen(true)}
        />
      </FormDialog>
      
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
