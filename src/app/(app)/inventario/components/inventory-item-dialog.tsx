

"use client";

import React, { useState } from 'react';
import { FormDialog } from '@/components/shared/form-dialog';
import { InventoryItemForm } from "./inventory-item-form";
import type { InventoryItemFormValues } from '@/schemas/inventory-item-form-schema';
import type { InventoryItem, InventoryCategory, Supplier } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Trash2 } from 'lucide-react';

interface InventoryItemDialogProps {
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: InventoryItemFormValues) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  item?: Partial<InventoryItem> | null;
  categories: InventoryCategory[];
  suppliers: Supplier[];
}

export function InventoryItemDialog({ 
  trigger, 
  open, 
  onOpenChange, 
  onSave,
  onDelete,
  item,
  categories,
  suppliers
}: InventoryItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: InventoryItemFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error al guardar", description: "No se pudo guardar el producto/servicio.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = () => {
    if (item && 'id' in item && item.id && onDelete) {
      onDelete(item.id);
    }
  }

  const dialogTitle = item && 'id' in item ? "Editar Ítem" : "Nuevo Ítem";
  const dialogDescription = item && 'id' in item ? "Actualiza los detalles del producto o servicio." : "Completa la información para un nuevo producto o servicio en tu inventario.";
  const submitButtonText = item && 'id' in item ? "Actualizar Ítem" : "Crear Ítem";

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={dialogTitle}
      description={dialogDescription}
      formId="inventory-item-form"
      isSubmitting={isSubmitting}
      submitButtonText={submitButtonText}
      customFooterContent={
        item && 'id' in item && item.id && onDelete ? (
          <ConfirmDialog
            triggerButton={
              <Button variant="destructive" type="button" size="sm">
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </Button>
            }
            title={`¿Eliminar "${item.name}"?`}
            description="Esta acción es permanente y no se puede deshacer."
            onConfirm={handleDelete}
            confirmText="Sí, Eliminar"
          />
        ) : null
      }
    >
      <InventoryItemForm
        id="inventory-item-form"
        initialData={item}
        onSubmit={handleSubmit}
        categories={categories}
        suppliers={suppliers}
      />
    </FormDialog>
  );
}
