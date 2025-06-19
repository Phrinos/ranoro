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
import { InventoryItemForm } from "./inventory-item-form";
import type { InventoryItem } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface InventoryItemDialogProps {
  trigger: React.ReactNode;
  item?: InventoryItem | null;
  onSave?: (data: any) => Promise<void>;
}

export function InventoryItemDialog({ trigger, item, onSave }: InventoryItemDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: any) => {
    try {
      if (onSave) {
        await onSave(values);
      }
      toast({
        title: `Artículo ${item ? 'actualizado' : 'creado'} con éxito`,
        description: `El artículo ${values.name} ha sido ${item ? 'actualizado' : 'registrado'} en el inventario.`,
      });
      setOpen(false);
    } catch (error) {
      console.error("Error saving inventory item:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el artículo. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Editar Artículo de Inventario" : "Nuevo Artículo de Inventario"}</DialogTitle>
          <DialogDescription>
            {item ? "Actualiza los detalles del artículo." : "Completa la información para un nuevo artículo en el inventario."}
          </DialogDescription>
        </DialogHeader>
        <InventoryItemForm
          initialData={item}
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
