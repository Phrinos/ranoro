// src/app/(app)/servicios/components/ServiceSuppliesArray.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { useFormContext, useFieldArray, type Control } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Minus, Plus } from 'lucide-react';
import type { InventoryItem, InventoryCategory, Supplier } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { InventorySearchDialog } from '@/components/shared/InventorySearchDialog';
import { InventoryItemDialog } from '../../inventario/components/inventory-item-dialog';
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { formatCurrency, cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

interface ServiceSuppliesArrayProps {
  serviceIndex: number;
  control: Control<any>; // O un tipo más específico si tienes uno para todo el formulario
  inventoryItems: InventoryItem[];
  onNewInventoryItemCreated: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
  categories: InventoryCategory[];
  suppliers: Supplier[];
  isReadOnly?: boolean;
}

export function ServiceSuppliesArray({
  serviceIndex,
  control,
  inventoryItems,
  onNewInventoryItemCreated,
  categories,
  suppliers,
  isReadOnly,
}: ServiceSuppliesArrayProps) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: `serviceItems.${serviceIndex}.suppliesUsed`,
  });

  const { toast } = useToast();
  const permissions = usePermissions();
  const canViewCosts = permissions.has('inventory:view_costs');

  const [isInventorySearchDialogOpen, setIsInventorySearchDialogOpen] = useState(false);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [newItemSearchTerm, setNewItemSearchTerm] = useState('');

  const handleAddSupply = useCallback((item: InventoryItem, quantity: number) => {
    append({
      supplyId: item.id,
      supplyName: item.name,
      quantity: quantity || 1,
      unitPrice: item.unitPrice || 0,
      sellingPrice: item.sellingPrice,
      isService: item.isService,
      unitType: item.unitType,
    });
    setIsInventorySearchDialogOpen(false);
  }, [append]);

  const handleNewItemRequest = (searchTerm: string) => {
    setNewItemSearchTerm(searchTerm);
    setIsInventorySearchDialogOpen(false);
    setIsNewItemDialogOpen(true);
  };

  const handleNewItemSaved = async (formData: InventoryItemFormValues) => {
    try {
      const newItem = await onNewInventoryItemCreated(formData);
      handleAddSupply(newItem, 1);
      setIsNewItemDialogOpen(false);
      toast({ title: 'Insumo Creado y Añadido' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'No se pudo crear el nuevo insumo.', variant: 'destructive' });
    }
  };

  const handleQuantityChange = (supplyIndex: number, delta: number) => {
    const currentSupply = (fields[supplyIndex] as any);
    if (!currentSupply) return;
    const newQuantity = (Number(currentSupply.quantity) || 0) + delta;
    if (newQuantity <= 0) return;
    const inventoryItem = inventoryItems.find(inv => inv.id === currentSupply.supplyId);
    if (inventoryItem && !inventoryItem.isService && newQuantity > inventoryItem.quantity) {
      toast({ title: 'Stock Insuficiente', description: `Solo hay ${inventoryItem.quantity} de ${inventoryItem.name} en inventario.`, variant: 'destructive' });
      return;
    }
    update(supplyIndex, { ...currentSupply, quantity: newQuantity });
  };
  
  const handleManualQuantitySet = (supplyIndex: number, value: string) => {
    const currentSupply = (fields[supplyIndex] as any);
    if (!currentSupply) return;
    const newQuantity = Number(value);
    if (isNaN(newQuantity) || newQuantity < 0) return;
    const itemDetails = inventoryItems.find(inv => inv.id === currentSupply.supplyId);
    if (itemDetails && !itemDetails.isService && newQuantity > itemDetails.quantity) {
      toast({ title: 'Stock Insuficiente', description: `Solo hay ${itemDetails.quantity} de ${itemDetails.name}.`, variant: 'destructive' });
      return;
    }
    update(supplyIndex, { ...currentSupply, quantity: newQuantity });
  };


  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-2">
        <div className="col-span-12 md:col-span-5">Nombre del Insumo</div>
        {canViewCosts && <div className="col-span-4 md:col-span-2 text-right">Costo Unit.</div>}
        <div className="col-span-4 md:col-span-2 text-center">Cantidad</div>
        <div className={cn("text-right", canViewCosts ? 'col-span-4 md:col-span-2' : 'col-span-8 md:col-span-4')}>Costo Total</div>
        <div className="col-span-1"></div>
      </div>

      {fields.map((supplyField, supplyIndex) => (
        <div key={supplyField.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md border bg-card">
          <div className="col-span-12 md:col-span-5">
            <p className="text-sm font-medium truncate">{ (supplyField as any).supplyName }</p>
          </div>
          
          {canViewCosts && (
            <div className="col-span-4 md:col-span-2 text-right">
              <p className="text-sm font-semibold">{formatCurrency((supplyField as any).unitPrice || 0)}</p>
            </div>
          )}

          <div className="col-span-4 md:col-span-2">
            <div className="flex items-center justify-center gap-1">
              {!isReadOnly && <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(supplyIndex, -1)}><Minus className="h-3 w-3"/></Button>}
              <Input
                type="number" step="any" min="0.001"
                value={(supplyField as any).quantity ?? ''}
                onChange={(e) => handleManualQuantitySet(supplyIndex, e.target.value)}
                className="w-14 text-center h-7 text-sm bg-white"
                disabled={isReadOnly}
              />
              {!isReadOnly && <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(supplyIndex, 1)}><Plus className="h-3 w-3"/></Button>}
            </div>
          </div>
          
          <div className={cn("text-right", canViewCosts ? "col-span-4 md:col-span-2" : "col-span-8 md:col-span-4")}>
            <p className="text-sm font-bold">{formatCurrency(((supplyField as any).quantity || 0) * ((supplyField as any).unitPrice || 0))}</p>
          </div>
          
          <div className="col-span-1 text-right">
            {!isReadOnly && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(supplyIndex)}><Trash2 className="h-4 w-4"/></Button>}
          </div>
        </div>
      ))}
      
      {!isReadOnly && (
        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" size="sm" className="bg-white" onClick={() => setIsInventorySearchDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Insumo
          </Button>
        </div>
      )}

      <InventorySearchDialog
        open={isInventorySearchDialogOpen}
        onOpenChange={setIsInventorySearchDialogOpen}
        onItemSelected={handleAddSupply}
        onNewItemRequest={handleNewItemRequest}
      />
      
      <InventoryItemDialog
        open={isNewItemDialogOpen}
        onOpenChange={setIsNewItemDialogOpen}
        onSave={handleNewItemSaved}
        item={{ name: newItemSearchTerm }}
        categories={categories}
        suppliers={suppliers}
      />
    </div>
  );
}
