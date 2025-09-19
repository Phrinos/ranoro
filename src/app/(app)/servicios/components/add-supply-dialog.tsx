"use client";

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Plus } from 'lucide-react';
import type { InventoryItem, ServiceSupply } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { capitalizeWords } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventorySearchDialog } from '@/components/shared/InventorySearchDialog';

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
  
  // State for manual entry
  const [manualName, setManualName] = useState('');
  const [manualQuantity, setManualQuantity] = useState<number | ''>(1);
  const [manualPrice, setManualPrice] = useState<number | ''>('');
  const [manualSellingPrice, setManualSellingPrice] = useState<number | ''>('');

  const resetManualState = () => {
    setManualName('');
    setManualQuantity(1);
    setManualPrice('');
    setManualSellingPrice('');
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        resetManualState();
        setActiveTab('buscar');
    }
    onOpenChange(isOpen);
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
    handleOpenChange(false);
  };

  const handleItemSelectedFromSearch = (item: InventoryItem) => {
      onAddSupply({
        supplyId: item.id,
        supplyName: item.name,
        quantity: 1, // Default quantity
        unitPrice: item.unitPrice,
        sellingPrice: item.sellingPrice,
        isService: item.isService,
        unitType: item.unitType,
      });
      handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          
            <TabsContent value="buscar" className="p-6 pt-0">
                <InventorySearchDialog 
                  open={open && activeTab === 'buscar'}
                  onOpenChange={handleOpenChange}
                  inventoryItems={inventoryItems}
                  onItemSelected={handleItemSelectedFromSearch}
                  onNewItemRequest={onNewItemRequest}
                />
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
                 <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmManualAdd}><Pencil className="mr-2 h-4 w-4" />Añadir Manualmente</Button>
                </DialogFooter>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
