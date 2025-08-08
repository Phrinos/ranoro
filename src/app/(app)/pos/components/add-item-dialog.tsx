

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, PackagePlus, Plus, Minus, ArrowLeft, DollarSign } from 'lucide-react';
import type { InventoryItem } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { InventoryItemDialog } from '../../inventario/components/inventory-item-dialog';

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
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [unitPrice, setUnitPrice] = useState<number | ''>('');


  const filteredItems = useMemo(() => {
    // When there is no search term, we show a default list.
    // It's better to show items with stock first.
    if (!searchTerm.trim()) {
      return inventoryItems
        .filter(item => !item.isService)
        .sort((a,b) => b.quantity - a.quantity) // Show items with more stock first
        .slice(0, 10);
    }
    
    // When searching, search through all items (products and services).
    const lowerSearchTerm = searchTerm.toLowerCase();
    return inventoryItems
      .filter(item =>
        item.name.toLowerCase().includes(lowerSearchTerm) || 
        (item.sku && item.sku.toLowerCase().includes(lowerSearchTerm))
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
    setUnitPrice(item.sellingPrice);
  };
  
  const handleConfirm = () => {
    if (!selectedItem) return toast({ title: "Seleccione un artículo", variant: "destructive" });
    if (quantity === '' || quantity <= 0) return toast({ title: "Cantidad inválida", variant: "destructive" });
    if (!selectedItem.isService && selectedItem.quantity < quantity) {
      return toast({ title: "Stock Insuficiente", description: `Solo hay ${selectedItem.quantity} de ${selectedItem.name}.`, variant: "destructive" });
    }
    onItemSelected({ ...selectedItem, sellingPrice: Number(unitPrice) || selectedItem.sellingPrice }, Number(quantity));
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
                        <p className="font-medium">{item.name} <span className="text-xs text-muted-foreground">({item.sku || 'N/A'})</span></p>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {item.isService 
                            ? <Badge variant="outline">Servicio</Badge> 
                            : <Badge variant={item.quantity > 0 ? "secondary" : "destructive"}>Stock: {item.quantity}</Badge>
                          }
                          <span>Costo: {formatCurrency(item.unitPrice)}</span>
                          <span>|</span>
                          <span>Venta: {formatCurrency(item.sellingPrice)}</span>
                        </div>
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
                 <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {selectedItem.isService 
                        ? <Badge variant="outline">Servicio</Badge> 
                        : <Badge variant={selectedItem.quantity > 0 ? "secondary" : "destructive"}>Stock Disponible: {selectedItem.quantity}</Badge>
                    }
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="inventory-quantity">Cantidad</Label>
                   <Input id="inventory-quantity" type="number" step="1" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value === '' ? '' : parseInt(e.target.value))} className="h-10" disabled={selectedItem.isService} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="unit-price">Precio Venta (Unitario)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="unit-price" type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))} className="h-10 pl-8" />
                  </div>
                </div>
              </div>
               <div className="flex justify-end pt-2">
                 <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cambiar Artículo
                </Button>
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
