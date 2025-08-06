
"use client";

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, capitalizeWords } from '@/lib/utils';
import type { InventoryItem } from '@/types';

interface SaleItemsListProps {
  onAddItem: () => void;
  inventoryItems: InventoryItem[];
}

export function SaleItemsList({ onAddItem, inventoryItems }: SaleItemsListProps) {
  const { control, getValues, setValue } = useFormContext();
  const { fields, remove, update } = useFieldArray({ control, name: "items" });
  const { toast } = useToast();

  const handleQuantityChange = (index: number, delta: number) => {
    const itemInSale = getValues(`items.${index}`);
    if (!itemInSale) return;
    
    const newQuantity = (Number(itemInSale.quantity) || 0) + delta;
    if (newQuantity <= 0) return;

    const itemDetails = inventoryItems.find(inv => inv.id === itemInSale.inventoryItemId);
    if (itemDetails && !itemDetails.isService && newQuantity > itemDetails.quantity) {
      toast({ title: 'Stock Insuficiente', description: `Solo hay ${itemDetails.quantity} de ${itemDetails.name}.`, variant: 'destructive' });
      return;
    }
    
    update(index, { ...itemInSale, quantity: newQuantity, totalPrice: newQuantity * itemInSale.unitPrice });
  };
  
  const handleManualQuantitySet = (index: number, value: string) => {
    const itemInSale = getValues(`items.${index}`);
    if (!itemInSale) return;
    
    const newQuantity = Number(value);
    if (isNaN(newQuantity) || newQuantity < 0) return;

    const itemDetails = inventoryItems.find(inv => inv.id === itemInSale.inventoryItemId);
    if (itemDetails && !itemDetails.isService && newQuantity > itemDetails.quantity) {
      toast({ title: 'Stock Insuficiente', description: `Solo hay ${itemDetails.quantity} de ${itemDetails.name}.`, variant: 'destructive' });
      return;
    }
    
    setValue(`items.${index}.quantity`, newQuantity, { shouldDirty: true });
    setValue(`items.${index}.totalPrice`, newQuantity * itemInSale.unitPrice, { shouldDirty: true });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Artículos Vendidos</CardTitle>
        <CardDescription>Añada artículos y especifique el nombre del cliente.</CardDescription>
        <div className="pt-2">
           <FormField
              control={control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Cliente</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ej: Cliente Mostrador" 
                      {...field} 
                      value={field.value}
                      onChange={(e) => field.onChange(capitalizeWords(e.target.value))} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow space-y-4 pt-0">
        <ScrollArea className="flex-grow pr-4">
          {fields.length > 0 ? (
            <div className="space-y-4">
              {fields.map((field: any, index) => (
                <div key={field.id} className="relative p-3 border rounded-md bg-muted/20 dark:bg-muted/50">
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Eliminar artículo" className="absolute top-1 right-1 h-7 w-7">
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <div className="flex-1 w-full sm:w-auto space-y-2">
                            <div>
                                <FormLabel className="text-xs">Artículo</FormLabel>
                                <Input readOnly value={`${field.itemName} (${formatCurrency(field.unitPrice)} c/u)`} className="bg-white border-none text-sm font-medium w-full mt-1"/>
                            </div>
                            <div className="w-full sm:w-40">
                                <FormLabel className="text-xs">Cantidad</FormLabel>
                                <div className="flex items-center justify-center gap-1 mt-1">
                                <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(index, -1)}><Minus className="h-4 w-4" /></Button>
                                <Input 
                                    type="number" 
                                    step="any" 
                                    min="0.001" 
                                    value={field.quantity} 
                                    onChange={(e) => handleManualQuantitySet(index, e.target.value)} 
                                    className="w-full text-center font-medium h-8 bg-white" 
                                />
                                <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(index, 1)}><Plus className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>

                        <div className="w-full sm:w-auto mt-2 sm:mt-0 self-start sm:self-center">
                            <div className="flex justify-between items-center sm:flex-col sm:items-end sm:text-right">
                                <FormLabel className="text-xs">Precio Total (IVA Inc.)</FormLabel>
                                <Input readOnly value={formatCurrency(field.totalPrice)} className="bg-white border-none text-sm font-medium h-auto p-0 text-right sm:h-8 sm:p-2 sm:mt-1"/>
                            </div>
                        </div>
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <ShoppingCart className="h-8 w-8 mb-2" /><p className="text-sm font-medium">Ningún artículo añadido</p>
            </div>
          )}
        </ScrollArea>
        <div className="mt-4 flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onAddItem}><PlusCircle className="mr-2 h-4 w-4" />Añadir Artículo/Servicio</Button>
        </div>
      </CardContent>
    </Card>
  );
}
