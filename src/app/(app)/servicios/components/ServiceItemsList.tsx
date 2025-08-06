
// src/app/(app)/servicios/components/ServiceItemsList.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ShoppingCart } from 'lucide-react';
import type { InventoryItem, ServiceSupply, InventoryCategory, Supplier, PricedService, VehiclePriceList, Vehicle, ServiceTypeRecord } from '@/types';
import { ServiceItemCard } from './ServiceItemCard';
import type { ServiceFormValues } from '@/schemas/service-form';
import { nanoid } from 'nanoid';
import { inventoryService } from "@/lib/services";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { AddToPriceListDialog } from "../../precios/components/add-to-price-list-dialog";

interface ServiceItemsListProps {
  isReadOnly?: boolean;
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  mode: 'service' | 'quote';
  onNewInventoryItemCreated: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
  categories: InventoryCategory[];
  suppliers: Supplier[];
}

export function ServiceItemsList({
  isReadOnly,
  inventoryItems,
  serviceTypes,
  mode,
  onNewInventoryItemCreated,
  categories,
  suppliers
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
        {!isReadOnly && (
          <div className="mt-auto pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  id: `item_${nanoid()}`,
                  name: '',
                  price: 0,
                  suppliesUsed: [],
                })
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Trabajo/Concepto
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
