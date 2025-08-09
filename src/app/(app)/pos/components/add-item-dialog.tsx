// src/app/(app)/pos/components/add-item-dialog.tsx

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, PackagePlus, Plus, Minus, ArrowLeft } from 'lucide-react';
import type { InventoryItem, ServiceSupply } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { capitalizeWords, formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  inventoryItems: InventoryItem[];
  onItemSelected: (item: InventoryItem, quantity: number) => void;
  onNewItemRequest: (searchTerm: string) => void;
}

export function AddItemDialog({ open, onOpenChange, inventoryItems, onItemSelected, onNewItemRequest }: AddItemDialogProps) {
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return inventoryItems.slice(0, 15);
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return inventoryItems.filter(item =>
        item.name.toLowerCase().includes(lowerSearchTerm) ||
        (item.sku && item.sku.toLowerCase().includes(lowerSearchTerm))
    ).slice(0, 10);
  }, [searchTerm, inventoryItems]);

  const resetState = () => {
    setSearchTerm('');
    setSelectedItem(null);
    setQuantity(1);
  };
  
  useEffect(() => {
    if (open) {
      resetState();
    }
  }, [open]);

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setQuantity(1);
  };

  const handleConfirmAdd = () => {
    if (!selectedItem) return;
    if (quantity <= 0) {
      toast({ title: 'Cantidad inválida', variant: 'destructive' });
      return;
    }
    if (!selectedItem.isService && selectedItem.quantity < quantity) {
      toast({ title: 'Sin Stock', description: `Solo hay ${selectedItem.quantity} de ${selectedItem.name}.`, variant: 'destructive' });
      return;
    }
    onItemSelected(selectedItem, quantity);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Añadir Artículo/Servicio</DialogTitle>
          <DialogDescription>
            Busque un artículo en su inventario para añadirlo a la venta.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 pt-0 space-y-4 min-h-[350px]">
          {!selectedItem ? (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
              </div>
              <ScrollArea className="h-60 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <Button key={item.id} variant="ghost" className="w-full justify-start text-left h-auto py-1.5 px-2" onClick={() => handleSelectItem(item)}>
                        <div>
                            <p className="font-medium">
                                {item.name} <span className="text-xs text-muted-foreground">({item.sku || 'N/A'})</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Stock: {item.isService ? 'N/A' : item.quantity} | Precio: {formatCurrency(item.sellingPrice)}
                            </p>
                        </div>
                      </Button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {searchTerm ? (
                        <div className="flex flex-col items-center gap-2">
                          <span>No se encontraron resultados.</span>
                          <Button variant="link" size="sm" onClick={() => onNewItemRequest(searchTerm)}>
                            <PackagePlus className="mr-2 h-4 w-4" />
                            Crear Nuevo Artículo "{searchTerm}"
                          </Button>
                        </div>
                      ) : 'No hay artículos para mostrar.'}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="pt-2 space-y-4">
              <div className="p-3 border rounded-md bg-muted">
                <p className="font-semibold text-sm">Artículo: {selectedItem.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedItem.isService ? "Servicio" : `Stock Disponible: ${selectedItem.quantity}`}
                </p>
              </div>
              <div className="flex justify-between items-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cambiar Artículo
                </Button>
                <div className="text-right">
                  <Label htmlFor="inventory-quantity" className="text-xs">
                    Cantidad a Añadir ({selectedItem.unitType === 'ml' ? 'ml' : selectedItem.unitType === 'liters' ? 'L' : 'uds.'})
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
                    <Input id="inventory-quantity" type="number" step="any" min="0.001" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value.replace(',', '.')) || 0)} className="w-20 text-center h-8" />
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => q + 1)}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="p-6 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {selectedItem && (
            <Button onClick={handleConfirmAdd}><Plus className="mr-2 h-4 w-4" />Añadir a la Venta</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
