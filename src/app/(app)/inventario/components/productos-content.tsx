

"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from 'lucide-react';
import { InventoryTable } from './inventory-table';
import { useTableManager } from '@/hooks/useTableManager';
import { TableToolbar } from '@/components/shared/table-toolbar';
import type { InventoryItem } from '@/types';

const getSortPriority = (item: InventoryItem): number => {
    // Services have the lowest priority to appear at the end unless specifically sorted.
    if (item.isService) return 4; 
    if (item.quantity === 0) return 1; // Out of stock
    if (item.quantity <= item.lowStockThreshold) return 2; // Low stock
    return 3; // Normal stock
};


export function ProductosContent({ inventoryItems, onNewItem, onPrint }: { inventoryItems: InventoryItem[], onNewItem: () => void, onPrint: (items: InventoryItem[]) => void }) {
  
  const { 
    filteredData, 
    ...tableManager 
  } = useTableManager<InventoryItem>({
    initialData: inventoryItems,
    searchKeys: ['name', 'sku', 'brand', 'category'],
    dateFilterKey: '', // Not used here
    initialSortOption: 'default_order',
    itemsPerPage: 100,
  });

  const customSortedItems = React.useMemo(() => {
    const items = [...filteredData]; // Use the already filtered data
    if (tableManager.sortOption === 'default_order') {
        return items.sort((a, b) => {
            const priorityA = getSortPriority(a);
            const priorityB = getSortPriority(b);
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            return a.name.localeCompare(b.name);
        });
    }
    // For any other sort option, the useTableManager hook has already sorted it.
    return items; 
  }, [filteredData, tableManager.sortOption]);

  const handlePrint = () => {
    onPrint(customSortedItems);
  };

  const sortOptions = [
    { value: 'default_order', label: 'Orden Inteligente (Recomendado)' },
    { value: 'name_asc', label: 'Nombre (A-Z)' },
    { value: 'name_desc', label: 'Nombre (Z-A)' },
    { value: 'category_asc', label: 'Categoría (A-Z)' },
    { value: 'brand_asc', label: 'Marca (A-Z)' },
    { value: 'sku_asc', label: 'SKU (A-Z)' },
    { value: 'quantity_desc', label: 'Cantidad (Mayor a Menor)' },
    { value: 'quantity_asc', label: 'Cantidad (Menor a Mayor)' },
    { value: 'sellingPrice_desc', label: 'Precio (Mayor a Menor)' },
    { value: 'sellingPrice_asc', label: 'Precio (Menor a Mayor)' },
    { value: 'unitPrice_desc', label: 'Costo (Mayor a Menor)' },
    { value: 'unitPrice_asc', label: 'Costo (Menor a Mayor)' },
  ];

  return (
    <div className="space-y-4">
        <TableToolbar
            {...tableManager}
            sortOptions={sortOptions}
            searchPlaceholder="Buscar por nombre, SKU, marca..."
        />
      
      <Card>
        <CardContent className="pt-0">
          <InventoryTable items={customSortedItems} />
        </CardContent>
      </Card>
    </div>
  );
}
