
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, PackagePlus, Plus, Minus, ArrowLeft } from 'lucide-react';
import type { InventoryItem, ServiceSupply } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { capitalizeWords, formatCurrency } from '@/lib/utils';

interface AddSupplyDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  inventoryItems: InventoryItem[];
  onAddSupply: (supply: ServiceSupply, sellingPriceToApply?: number) => void;
}

export function AddSupplyDialog({ open, onOpenChange, inventoryItems, onAddSupply }: AddSupplyDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('inventory');
  
  // State for inventory search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [inventoryQuantity, setInventoryQuantity] = useState(1);
  
  // State for manual entry
  const [manualName, setManualName] = useState('');
  const [manualQuantity, setManualQuantity] = useState(1);
  const [manualCost, setManualCost] = useState<number | undefined>(undefined);
  const [manualSellingPrice, setManualSellingPrice] = useState<number | undefined>(undefined);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return inventoryItems.filter(item => !item.isService);
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return inventoryItems.filter(
      (item) =>
        !item.isService &&
        (item.name.toLowerCase().includes(lowerSearchTerm) ||
         item.sku.toLowerCase().includes(lowerSearchTerm))
    );
  }, [searchTerm, inventoryItems]);

  const resetForms = () => {
    setSearchTerm('');
    setSelectedInventoryItem(null);
    setInventoryQuantity(1);
    setManualName('');
    setManualQuantity(1);
    setManualCost(undefined);
    setManualSellingPrice(undefined);
  };
  
  useEffect(() => {
    if (open) {
      resetForms();
      setActiveTab('inventory');
    }
  }, [open]);

  const handleSelectFromInventory = (item: InventoryItem) => {
    setSelectedInventoryItem(item);
    setInventoryQuantity(1);
  };

  const handleConfirmInventoryAdd = () => {
    if (!selectedInventoryItem) return;
    if (inventoryQuantity <= 0) {
      toast({ title: 'Cantidad inválida', variant: 'destructive' });
      return;
    }
    if (selectedInventoryItem.quantity < inventoryQuantity) {
      toast({ title: 'Sin Stock', description: `No hay suficiente stock para ${selectedInventoryItem.name}.`, variant: 'destructive' });
      return;
    }
    onAddSupply({
      supplyId: selectedInventoryItem.id,
      supplyName: selectedInventoryItem.name,
      quantity: inventoryQuantity,
      unitPrice: selectedInventoryItem.unitPrice,
      isService: selectedInventoryItem.isService,
      unitType: selectedInventoryItem.unitType,
    });
    onOpenChange(false);
  };

  const handleAddManualSupply = () => {
    if (!manualName.trim() || manualQuantity <= 0 || manualCost === undefined || manualCost < 0 || manualSellingPrice === undefined || manualSellingPrice < 0) {
      toast({ title: 'Datos incompletos', description: 'Por favor, complete todos los campos del insumo manual.', variant: 'destructive' });
      return;
    }
    onAddSupply({
      supplyId: `manual_${Date.now()}`,
      supplyName: manualName.trim(),
      quantity: manualQuantity,
      unitPrice: manualCost,
      isService: false,
      unitType: 'units',
    }, manualSellingPrice);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir Insumo al Servicio</DialogTitle>
          <DialogDescription>
            Busque en su inventario o agregue un insumo manualmente.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inventory">Buscar en Inventario</TabsTrigger>
            <TabsTrigger value="manual">Insumo Manual</TabsTrigger>
          </TabsList>
          
          <TabsContent value="inventory" className="space-y-4">
            {!selectedInventoryItem ? (
              <>
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <ScrollArea className="h-60 border rounded-md">
                  <div className="p-2 space-y-1">
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => (
                        <Button
                          key={item.id}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-1.5 px-2"
                          onClick={() => handleSelectFromInventory(item)}
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Stock: {item.quantity} | Costo: ${item.unitPrice.toFixed(2)}
                            </p>
                          </div>
                        </Button>
                      ))
                    ) : (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        No se encontraron productos.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="pt-2 space-y-4">
                <div className="p-2 border rounded-md bg-muted">
                  <p className="font-medium text-sm">Artículo: {selectedInventoryItem.name}</p>
                  <p className="text-xs text-muted-foreground">Stock Disponible: {selectedInventoryItem.quantity}</p>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <Button variant="ghost" onClick={() => setSelectedInventoryItem(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Cambiar Artículo
                  </Button>
                  <div className="text-right">
                    <Label htmlFor="inventory-quantity" className="text-xs">Cantidad a Añadir</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setInventoryQuantity(q => Math.max(1, q - 1))}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="inventory-quantity"
                        type="number"
                        value={inventoryQuantity}
                        onChange={(e) => setInventoryQuantity(Number(e.target.value))}
                        className="w-20 text-center h-8"
                      />
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setInventoryQuantity(q => q + 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleConfirmInventoryAdd}>Añadir al Servicio</Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="manual-name">Nombre del Insumo</Label>
              <Input id="manual-name" value={manualName} onChange={e => setManualName(capitalizeWords(e.target.value))} placeholder="Ej: Tornillo especial"/>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-cost">Costo Unitario (Taller)</Label>
                  <Input id="manual-cost" type="number" step="0.01" min="0" value={manualCost ?? ''} onChange={e => setManualCost(Number(e.target.value))} placeholder="Ej: 15.50"/>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="manual-selling-price">Precio Venta (IVA Inc.)</Label>
                  <Input id="manual-selling-price" type="number" step="0.01" min="0" value={manualSellingPrice ?? ''} onChange={e => setManualSellingPrice(Number(e.target.value))} placeholder="Ej: 25.00"/>
                </div>
             </div>
             <div className="space-y-2">
                  <Label htmlFor="manual-quantity">Cantidad</Label>
                  <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setManualQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
                      <Input id="manual-quantity" type="number" min="1" value={manualQuantity} onChange={e => setManualQuantity(Number(e.target.value))} className="w-20 text-center"/>
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setManualQuantity(q => q + 1)}><Plus className="h-4 w-4" /></Button>
                  </div>
            </div>
             <Button onClick={handleAddManualSupply} className="w-full">
                <PackagePlus className="mr-2 h-4 w-4" />
                Añadir Insumo Manual
             </Button>
          </TabsContent>
        </Tabs>
         <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
