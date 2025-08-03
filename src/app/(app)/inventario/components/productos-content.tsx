

"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { InventoryItem } from '@/types';
import { Search, ListFilter, PlusCircle, Printer } from 'lucide-react';
import { InventoryTable } from './inventory-table';
import { useTableManager } from '@/hooks/useTableManager';
import { TableToolbar } from '@/components/shared/table-toolbar';

interface ProductosContentProps {
  inventoryItems: InventoryItem[];
  onNewItem: () => void;
  onPrint: (items: InventoryItem[]) => void;
}

const getSortPriority = (item: InventoryItem): number => {
    if (item.isService) return 0; // Highest priority
    if (item.quantity > item.lowStockThreshold) return 1; // Normal stock
    if (item.quantity > 0 && item.quantity <= item.lowStockThreshold) return 2; // Low stock
    if (item.quantity === 0) return 3; // Out of stock
    return 4; // Should not happen
};


export function ProductosContent({ inventoryItems, onNewItem, onPrint }: ProductosContentProps) {
  
  const { filteredData: filteredAndSortedItems, ...tableManager } = useTableManager<InventoryItem>({
    initialData: inventoryItems,
    searchKeys: ['name', 'sku', 'brand', 'category'],
    dateFilterKey: '', // No date filter needed for this table
    initialSortOption: 'default_order',
    itemsPerPage: 100,
  });

  // Override the default sorting logic with our custom function
  const customSortedItems = React.useMemo(() => {
    const items = [...filteredAndSortedItems]; // Use the already filtered data
    if (tableManager.sortOption === 'default_order') {
        return items.sort((a, b) => {
            const priorityA = getSortPriority(a);
            const priorityB = getSortPriority(b);

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // If priorities are the same, apply secondary sorting
            if (a.isService) { // Both are services, sort by name
                return a.name.localeCompare(b.name);
            }
            // All other product groups, sort by quantity descending
            return (b.quantity || 0) - (a.quantity || 0);
        });
    }
    return items; // Return the data sorted by the tableManager for other options
  }, [filteredAndSortedItems, tableManager.sortOption]);


  const handlePrint = () => {
    onPrint(customSortedItems);
  };

  const sortOptions = [
    { value: 'default_order', label: 'Orden Inteligente (Recomendado)' },
    { value: 'name_asc', label: 'Nombre (A-Z)' },
    { value: 'name_desc', label: 'Nombre (Z-A)' },
    { value: 'quantity_desc', label: 'Cantidad (Mayor a Menor)' },
    { value: 'quantity_asc', label: 'Cantidad (Menor a Mayor)' },
    { value: 'price_desc', label: 'Precio (Mayor a Menor)' },
    { value: 'price_asc', label: 'Precio (Menor a Mayor)' },
  ];

  return (
    <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Lista de Productos y Servicios</h2>
                <p className="text-muted-foreground">Administra productos, servicios y niveles de stock.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={handlePrint} variant="outline" className="w-full sm:w-auto bg-card"><Printer className="mr-2 h-4 w-4" />Imprimir Lista</Button>
                <Button onClick={onNewItem} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Ítem
                </Button>
            </div>
        </div>
        <TableToolbar
            {...tableManager}
            sortOption={tableManager.sortOption}
            onSortOptionChange={(value) => tableManager.setSortOption(value)}
            searchPlaceholder="Buscar por nombre, SKU, marca..."
            sortOptions={sortOptions}
            paginationSummary={tableManager.paginationSummary}
            onPreviousPage={tableManager.goToPreviousPage}
            onNextPage={tableManager.goToNextPage}
            canGoPrevious={tableManager.canGoPrevious}
            canGoNext={tableManager.canGoNext}
        />
      
      <Card>
        <CardContent className="pt-0">
          <InventoryTable items={customSortedItems} />
        </CardContent>
      </Card>
    </div>
  );
}
