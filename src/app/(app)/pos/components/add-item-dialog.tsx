
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, PackagePlus, Plus, Minus, ArrowLeft } from 'lucide-react';
import type { InventoryItem } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
      return inventoryItems.filter(item => !item.isService && item.quantity > 0).slice(0, 10);
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return inventoryItems
      .filter(item =>
        (!item.isService && item.quantity > 0) &&
        (item.name.toLowerCase().includes(lowerSearchTerm) || (item.sku && item.sku.toLowerCase().includes(lowerSearchTerm)))
      )
      .slice(0, 10);
  }, [searchTerm, inventoryItems]);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSelectedItem(null);
      setQuantity(1);
    }
  }, [open]);

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearchTerm(item.name);
  };
  
  const handleConfirm = () => {
    if (!selectedItem) return toast({ title: "Seleccione un artículo", variant: "destructive" });
    if (quantity <= 0) return toast({ title: "Cantidad inválida", variant: "destructive" });
    if (!selectedItem.isService && selectedItem.quantity < quantity) {
      return toast({ title: "Stock Insuficiente", description: `Solo hay ${selectedItem.quantity} de ${selectedItem.name}.`, variant: "destructive" });
    }
    onItemSelected(selectedItem, quantity);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-full p-6 space-y-6">
        <DialogHeader>
          <DialogTitle>Añadir Artículo a la Venta</DialogTitle>
          <DialogDescription>Busque o cree un nuevo artículo para añadirlo a la venta.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 min-h-[300px]">
          {!selectedItem ? (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="item-search" placeholder="Buscar por nombre o SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
              </div>
              <ScrollArea className="h-[200px] border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredItems.map(item => (
                    <Button key={item.id} variant="ghost" className="w-full justify-start text-left h-auto py-1.5 px-2" onClick={() => handleSelectItem(item)}>
                      <div>
                        <p className="font-medium">{item.name} <span className="text-xs text-muted-foreground">({item.sku})</span></p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {item.quantity} | Venta: {formatCurrency(item.sellingPrice)}
                        </p>
                      </div>
                    </Button>
                  ))}
                  {searchTerm && filteredItems.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No se encontró &quot;{searchTerm}&quot;.</p>
                      <Button variant="link" size="sm" onClick={() => onNewItemRequest(searchTerm)}>
                        <PackagePlus className="mr-2 h-4 w-4"/>Crear Nuevo Ítem
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="pt-2 space-y-4">
              <div className="p-3 border rounded-md bg-muted">
                <p className="font-semibold text-sm">Artículo: {selectedItem.name}</p>
                <p className="text-xs text-muted-foreground">Precio de Venta: {formatCurrency(selectedItem.sellingPrice)} | Stock: {selectedItem.quantity}</p>
              </div>
              <div className="flex justify-between items-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedItem(null)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cambiar Artículo
                </Button>
                <div className="text-right">
                  <Label htmlFor="inventory-quantity" className="text-xs">Cantidad ({selectedItem.unitType || 'unidades'})</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
                    <Input
                      id="inventory-quantity"
                      type="number"
                      step="any"
                      min="0.001"
                      value={quantity}
                      onChange={(e) => setQuantity(parseFloat(e.target.value.replace(',', '.')) || 0)}
                      className="w-20 text-center h-8"
                    />
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => q + 1)}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={handleConfirm} disabled={!selectedItem}>Añadir Artículo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
