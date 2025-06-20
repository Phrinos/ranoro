
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PackagePlus, Search } from "lucide-react";
import type { InventoryItem } from "@/types";

interface PurchaseItemSelectionDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  inventoryItems: InventoryItem[];
  onItemSelected: (item: InventoryItem) => void;
  onCreateNew: (searchTerm: string) => void;
}

export function PurchaseItemSelectionDialog({
  open,
  onOpenChange,
  inventoryItems,
  onItemSelected,
  onCreateNew,
}: PurchaseItemSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return inventoryItems.slice(0, 10); // Show some initial items
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearchTerm) ||
        item.sku.toLowerCase().includes(lowerSearchTerm)
    ).slice(0, 10);
  }, [searchTerm, inventoryItems]);

  const handleSelect = (item: InventoryItem) => {
    onItemSelected(item);
  };
  
  const handleCreate = () => {
    onCreateNew(searchTerm);
  };

  // Reset search term when dialog opens
  useEffect(() => {
    if (open) {
      setSearchTerm('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Seleccionar Artículo para Compra</DialogTitle>
          <DialogDescription>
            Busque por nombre o SKU. Si el artículo no existe, puede crearlo.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar artículo por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          {filteredItems.length > 0 ? (
            <ScrollArea className="h-[200px] border rounded-md">
              <div className="p-2 space-y-1">
                {filteredItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto py-1.5 px-2"
                    onClick={() => handleSelect(item)}
                  >
                    <div>
                      <p className="font-medium">
                        {item.name} <span className="text-xs text-muted-foreground">({item.sku})</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {item.quantity} | Costo: ${item.unitPrice.toFixed(2)} | Venta: ${item.sellingPrice.toFixed(2)}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {searchTerm ? `No se encontró ningún artículo con "${searchTerm}".` : 'No hay artículos para mostrar.'}
            </div>
          )}
           {searchTerm && (
             <Button variant="outline" onClick={handleCreate} className="w-full mt-2">
                <PackagePlus className="mr-2 h-4 w-4" />
                Crear Nuevo Artículo con "{searchTerm}"
            </Button>
           )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
