
"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
import { Search, PackagePlus } from "lucide-react";
import type { InventoryItem, ServiceSupply } from "@/types";
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AddSupplyDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  inventoryItems: InventoryItem[];
  onAddSupply: (supply: ServiceSupply) => void;
  onNewItemRequest: (searchTerm: string) => void;
}

export function AddSupplyDialog({
  open,
  onOpenChange,
  inventoryItems,
  onAddSupply,
  onNewItemRequest,
}: AddSupplyDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if(open) {
      setSearchTerm(''); // Reset search on open
    }
  }, [open]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return inventoryItems.slice(0, 15);
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return inventoryItems
      .filter(item =>
        item.name.toLowerCase().includes(lowerSearchTerm) ||
        item.sku.toLowerCase().includes(lowerSearchTerm)
      )
      .slice(0, 15);
  }, [searchTerm, inventoryItems]);

  const handleSelect = (item: InventoryItem) => {
    if (!item.isService && item.quantity <= 0) {
        toast({
            title: 'Sin Stock',
            description: `El producto "${item.name}" no tiene stock disponible.`,
            variant: 'destructive',
        });
        return;
    }
    onAddSupply({
      supplyId: item.id,
      supplyName: item.name,
      quantity: 1, // Default quantity
      unitPrice: item.unitPrice,
      sellingPrice: item.sellingPrice,
      isService: item.isService,
      unitType: item.unitType,
    });
    onOpenChange(false);
  };
  
  const handleRequestNew = () => {
    onNewItemRequest(searchTerm);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Añadir Insumo o Mano de Obra</DialogTitle>
          <DialogDescription>
            Busque por nombre o SKU. Si el artículo no existe, puede crearlo.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar insumo o mano de obra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <ScrollArea className="h-[250px] border rounded-md">
            <div className="p-2 space-y-1">
              {filteredItems.length > 0 ? filteredItems.map(item => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto py-1.5 px-2"
                  onClick={() => handleSelect(item)}
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.isService ? 'Servicio' : `Stock: ${item.quantity}`} | Venta: {formatCurrency(item.sellingPrice)}
                    </p>
                  </div>
                </Button>
              )) : (
                 <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No se encontró &quot;{searchTerm}&quot;.</p>
                 </div>
              )}
            </div>
          </ScrollArea>
           {searchTerm && (
             <Button variant="outline" onClick={handleRequestNew} className="w-full mt-2">
                <PackagePlus className="mr-2 h-4 w-4" />
                Crear Nuevo Ítem: &quot;{searchTerm}&quot;
            </Button>
           )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
