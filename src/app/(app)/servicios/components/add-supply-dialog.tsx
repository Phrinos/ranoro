
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, PackagePlus, Plus, Minus, ArrowLeft, Pencil } from 'lucide-react';
import type { InventoryItem, ServiceSupply } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { capitalizeWords, formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AddSupplyDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  inventoryItems: InventoryItem[];
  onAddSupply: (supply: ServiceSupply) => void;
  onNewItemRequest: (searchTerm: string) => void;
}

export function AddSupplyDialog({ open, onOpenChange, inventoryItems, onAddSupply, onNewItemRequest }: AddSupplyDialogProps) {
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('buscar');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  // State for manual entry
  const [manualName, setManualName] = useState('');
  const [manualQuantity, setManualQuantity] = useState<number | ''>(1);
  const [manualPrice, setManualPrice] = useState<number | ''>('');
  const [manualSellingPrice, setManualSellingPrice] = useState<number | ''>('');


  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return inventoryItems.slice(0, 10);
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
    setManualName('');
    setManualQuantity(1);
    setManualPrice('');
    setManualSellingPrice('');
    setActiveTab('buscar');
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
    onAddSupply({
      supplyId: selectedItem.id,
      supplyName: selectedItem.name,
      quantity: quantity,
      unitPrice: selectedItem.unitPrice,
      sellingPrice: selectedItem.sellingPrice,
      isService: selectedItem.isService,
      unitType: selectedItem.unitType,
    });
    onOpenChange(false);
  };
  
  const handleConfirmManualAdd = () => {
    if (!manualName.trim()) {
        toast({ title: 'Nombre Requerido', description: 'Por favor, ingrese un nombre para el insumo manual.', variant: 'destructive' });
        return;
    }
    if (Number(manualQuantity) <= 0) {
        toast({ title: 'Cantidad Inválida', variant: 'destructive' });
        return;
    }
    onAddSupply({
        supplyId: `manual_${Date.now()}`,
        supplyName: capitalizeWords(manualName.trim()),
        quantity: Number(manualQuantity),
        unitPrice: Number(manualPrice) || 0,
        sellingPrice: Number(manualSellingPrice) || 0,
        isService: true, // Manual items are treated as one-off services/items not in stock
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Añadir Insumo al Servicio</DialogTitle>
          <DialogDescription>
            Busque en su inventario o ingrese un insumo manual.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buscar">Buscar en Inventario</TabsTrigger>
                <TabsTrigger value="manual">Insumo Manual</TabsTrigger>
              </TabsList>
            </div>
          
            <TabsContent value="buscar" className="p-6 pt-4 space-y-4 min-h-[350px]">
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
                                    {item.category} - {item.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    SKU: {item.sku || 'N/A'} | Stock: {item.isService ? 'N/A' : item.quantity} | Precio: {formatCurrency(item.unitPrice)}
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
                      Cambiar Insumo
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
            </TabsContent>
            
            <TabsContent value="manual" className="p-6 pt-4 space-y-4 min-h-[350px]">
                <div className="space-y-2">
                    <Label htmlFor="manual-name">Nombre del Insumo</Label>
                    <Input id="manual-name" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Ej: Tornillo especial" />
                </div>
                 <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="manual-quantity">Cantidad</Label>
                        <Input id="manual-quantity" type="number" value={manualQuantity} onChange={(e) => setManualQuantity(e.target.value === '' ? '' : Number(e.target.value))} placeholder="1" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="manual-price">Costo Unitario (Taller)</Label>
                        <Input id="manual-price" type="number" value={manualPrice} onChange={(e) => setManualPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.00"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="manual-selling-price">Precio Venta (Cliente)</Label>
                        <Input id="manual-selling-price" type="number" value={manualSellingPrice} onChange={(e) => setManualSellingPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.00"/>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
        
        <DialogFooter className="p-6 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {activeTab === 'buscar' && selectedItem && (
            <Button onClick={handleConfirmAdd}><Plus className="mr-2 h-4 w-4" />Añadir del Inventario</Button>
          )}
          {activeTab === 'manual' && (
            <Button onClick={handleConfirmManualAdd}><Pencil className="mr-2 h-4 w-4" />Añadir Manualmente</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
