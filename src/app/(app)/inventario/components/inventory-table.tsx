"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import type { InventoryItem } from "@/types";
import { InventoryItemDialog } from './inventory-item-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface InventoryTableProps {
  items: InventoryItem[];
}

export function InventoryTable({ items: initialItems }: InventoryTableProps) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const { toast } = useToast();

  const handleUpdateItem = async (updatedItemData: any) => {
    setItems(prevItems => 
        prevItems.map(i => i.id === updatedItemData.id ? { ...i, ...updatedItemData } : i)
    );
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(i => i.id !== itemId));
    toast({
      title: "Artículo Eliminado",
      description: `El artículo con ID ${itemId} ha sido eliminado del inventario.`,
    });
  };
  
  if (!items.length) {
    return <p className="text-muted-foreground text-center py-8">No hay artículos en el inventario.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Precio Unitario</TableHead>
            <TableHead>Stock Bajo</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className={item.quantity <= item.lowStockThreshold ? "bg-orange-50 dark:bg-orange-900/30" : ""}>
              <TableCell className="font-medium">{item.sku}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.category || 'N/A'}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">${item.unitPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell>
                {item.quantity <= item.lowStockThreshold && (
                  <Badge variant="destructive">Bajo</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <InventoryItemDialog
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Editar Artículo">
                      <Edit className="h-4 w-4" />
                    </Button>
                  }
                  item={item}
                  onSave={async (data) => handleUpdateItem({ ...data, id: item.id })}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Eliminar Artículo">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el artículo del inventario.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteItem(item.id)} className="bg-destructive hover:bg-destructive/90">
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
