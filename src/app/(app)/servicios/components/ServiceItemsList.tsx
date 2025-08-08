// src/app/(app)/servicios/components/ServiceItemsList.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ShoppingCart, BrainCircuit, Loader2 } from 'lucide-react';
import type { InventoryItem, ServiceSupply, InventoryCategory, Supplier, PricedService, VehiclePriceList, Vehicle, ServiceTypeRecord } from '@/types';
import { ServiceItemCard } from './ServiceItemCard';
import type { ServiceFormValues } from '@/schemas/service-form';
import { nanoid } from 'nanoid';
import { inventoryService } from "@/lib/services";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { AddToPriceListDialog } from "../../precios/components/add-to-price-list-dialog";
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

interface ServiceItemsListProps {
  isReadOnly?: boolean;
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  mode: 'service' | 'quote';
  onNewInventoryItemCreated: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
  categories: InventoryCategory[];
  suppliers: Supplier[];
  isEnhancingText?: string | null;
  handleEnhanceText?: (fieldName: keyof ServiceFormValues | `serviceItems.${number}.suppliesUsed.${number}.description` | 'notes' | `serviceItems.${number}.description`) => void;
}

export function ServiceItemsList({
  isReadOnly,
  inventoryItems,
  serviceTypes,
  mode,
  onNewInventoryItemCreated,
  categories,
  suppliers,
  isEnhancingText,
  handleEnhanceText
}: ServiceItemsListProps) {
  const { control, getValues, setValue } = useFormContext<ServiceFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "serviceItems",
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Trabajos y Refacciones</CardTitle>
        <CardDescription>
          Añada los trabajos a realizar y los insumos necesarios para cada uno.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow space-y-4 pt-0">
        <div className="flex-grow space-y-4">
          {fields.length > 0 ? (
            fields.map((field, index) => (
              <ServiceItemCard
                key={field.id}
                serviceIndex={index}
                removeServiceItem={remove}
                isReadOnly={isReadOnly}
                inventoryItems={inventoryItems}
                serviceTypes={serviceTypes}
                mode={mode}
                onNewInventoryItemCreated={onNewInventoryItemCreated}
                categories={categories}
                suppliers={suppliers}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <ShoppingCart className="h-8 w-8 mb-2" />
              <p className="text-sm font-medium">Ningún trabajo añadido</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-4 border-t pt-4">
          {!isReadOnly && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    id: `item_${nanoid()}`,
                    name: '',
                    price: undefined, // Set to undefined
                    suppliesUsed: [],
                  })
                }
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Trabajo/Concepto
              </Button>
            </div>
          )}
          
          <FormField
            control={control}
            name="notes"
            render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex justify-between items-center w-full">
                        <span>Notas Adicionales del Servicio</span>
                        {!isReadOnly && handleEnhanceText && (
                            <Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText("notes")} disabled={isEnhancingText === "notes" || !field.value}>
                                {isEnhancingText === "notes" ? <Loader2 className="animate-spin h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
                                <span className="ml-2 hidden sm:inline">Mejorar</span>
                            </Button>
                        )}
                    </FormLabel>
                    <FormControl>
                        <Textarea
                            placeholder="Notas internas, para el cliente, o detalles adicionales..."
                            disabled={isReadOnly}
                            {...field}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
        </div>
      </CardContent>
    </Card>
  );
}
