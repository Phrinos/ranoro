
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, PackagePlus } from 'lucide-react';
import type { InventoryItem, ServiceSupply } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface AddSupplyDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  inventoryItems: InventoryItem[];
  onAddSupply: (supply: ServiceSupply) => void;
}

export function AddSupplyDialog({ open, onOpenChange, inventoryItems, onAddSupply }: AddSupplyDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('inventory');
  
  // State for inventory search
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for manual entry
  const [manualName, setManualName] = useState('');
  const [manualQuantity, setManualQuantity] = useState(1);
  const [manualCost, setManualCost] = useState<number | undefined>(undefined);

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

  const resetManualForm = () => {
    setManualName('');
    setManualQuantity(1);
    setManualCost(undefined);
  };
  
  useEffect(() => {
    if (open) {
      setSearchTerm('');
      resetManualForm();
      setActiveTab('inventory');
    }
  }, [open]);

  const handleAddFromInventory = (item: InventoryItem) => {
    if (item.quantity <= 0) {
      toast({ title: 'Sin Stock', description: `No hay stock disponible para ${item.name}.`, variant: 'destructive' });
      return;
    }
    onAddSupply({
      supplyId: item.id,
      supplyName: item.name,
      quantity: 1, // Default quantity
      unitPrice: item.unitPrice,
      isService: item.isService,
      unitType: item.unitType,
    });
    onOpenChange(false);
  };

  const handleAddManualSupply = () => {
    if (!manualName.trim() || manualQuantity <= 0 || manualCost === undefined || manualCost < 0) {
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
    });
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
                      onClick={() => handleAddFromInventory(item)}
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
          </TabsContent>
          <TabsContent value="manual" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="manual-name">Nombre del Insumo</Label>
              <Input id="manual-name" value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Ej: Tornillo especial"/>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-quantity">Cantidad</Label>
                  <Input id="manual-quantity" type="number" min="1" value={manualQuantity} onChange={e => setManualQuantity(Number(e.target.value))}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-cost">Costo Unitario (Taller)</Label>
                  <Input id="manual-cost" type="number" step="0.01" min="0" value={manualCost ?? ''} onChange={e => setManualCost(Number(e.target.value))} placeholder="Ej: 15.50"/>
                </div>
             </div>
             <Button onClick={handleAddManualSupply} className="w-full">
                <PackagePlus className="mr-2 h-4 w-4" />
                Añadir Insumo Manual
             </Button>
          </TabsContent>
        </Tabs>
         <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
