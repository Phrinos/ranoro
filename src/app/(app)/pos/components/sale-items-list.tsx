
"use client";

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FormField, FormLabel, Input } from '@/components/ui/form';
import { PlusCircle, Trash2, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import type { InventoryItem } from '@/types';

interface SaleItemsListProps {
  onAddItem: () => void;
  inventoryItems: InventoryItem[];
}

export const SaleItemsList = React.memo(({ onAddItem, inventoryItems }: SaleItemsListProps) => {
  const { control, getValues, setValue } = useFormContext();
  const { fields, remove } = useFieldArray({ control, name: "items" });
  const { toast } = useToast();

  const handleQuantityChange = (index: number, delta: number) => {
    const itemInSale = getValues(`items.${index}`);
    if (!itemInSale) return;
    
    const newQuantity = itemInSale.quantity + delta;
    if (newQuantity <= 0) return;

    const itemDetails = inventoryItems.find(inv => inv.id === itemInSale.inventoryItemId);
    if (itemDetails && !itemDetails.isService && newQuantity > itemDetails.quantity) {
      toast({ title: 'Stock Insuficiente', description: `Solo hay ${itemDetails.quantity} de ${itemDetails.name}.`, variant: 'destructive' });
      return;
    }
    
    setValue(`items.${index}.quantity`, newQuantity, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader><CardTitle>Artículos vendidos</CardTitle></CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[300px] pr-4 flex-grow">
          {fields.length > 0 ? (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 border rounded-md bg-muted/20 dark:bg-muted/50">
                  <div className="flex-1 w-full sm:w-auto">
                    <FormLabel className="text-xs">Artículo</FormLabel>
                    <Input readOnly value={`${getValues(`items.${index}.itemName`)} (${formatCurrency(getValues(`items.${index}.unitPrice`))} c/u)`} className="bg-muted/30 dark:bg-muted/60 border-none text-sm font-medium w-full mt-1"/>
                  </div>
                  <div className="w-full sm:w-40">
                    <FormLabel className="text-xs">Cantidad</FormLabel>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(index, -1)}><Minus className="h-4 w-4" /></Button>
                      <FormField control={control} name={`items.${index}.quantity`} render={({ field: qtyField }) => ( <Input type="number" step="any" min="0.001" {...qtyField} className="w-full text-center font-medium h-8" /> )}/>
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(index, 1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="w-full sm:w-28 mt-2 sm:mt-0 sm:self-end">
                    <FormLabel className="text-xs">Precio Total (IVA Inc.)</FormLabel>
                    <Input readOnly value={formatCurrency(getValues(`items.${index}.totalPrice`))} className="bg-muted/50 dark:bg-muted/80 border-none text-sm font-medium mt-1"/>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Eliminar artículo" className="sm:self-end mb-1"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <ShoppingCart className="h-8 w-8 mb-2" /><p className="text-sm font-medium">Ningún artículo añadido</p>
            </div>
          )}
        </ScrollArea>
        <Button type="button" variant="outline" size="sm" onClick={onAddItem} className="mt-4"><PlusCircle className="mr-2 h-4 w-4" />Añadir Artículo/Servicio</Button>
      </CardContent>
    </Card>
  );
});

SaleItemsList.displayName = 'SaleItemsList';
