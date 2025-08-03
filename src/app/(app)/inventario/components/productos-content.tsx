

"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { InventoryItem } from '@/types';
import { Search, ListFilter, PlusCircle, Printer } from 'lucide-react';
import { InventoryTable } from './inventory-table';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { useTableManager } from '@/hooks/useTableManager';

type InventorySortOption = 
  | "stock_status_name_asc" 
  | "name_asc" | "name_desc"
  | "sku_asc" | "sku_desc"
  | "quantity_asc" | "quantity_desc"
  | "price_asc" | "price_desc"
  | "type_asc";

interface ProductosContentProps {
  inventoryItems: InventoryItem[];
  onNewItem: () => void;
  onPrint: (items: InventoryItem[]) => void;
}

export function ProductosContent({ inventoryItems, onNewItem, onPrint }: ProductosContentProps) {
  
  const { filteredData: filteredAndSortedItems, ...tableManager } = useTableManager<InventoryItem>({
    initialData: inventoryItems,
    searchKeys: ['name', 'sku', 'brand', 'category'],
    dateFilterKey: '', // No date filter needed for this table
    initialSortOption: 'stock_status_name_asc',
    itemsPerPage: 100,
  });

  const handlePrint = () => {
    onPrint(filteredAndSortedItems);
  };

  const sortOptions = [
    { value: 'stock_status_name_asc', label: 'Estado de Stock' },
    { value: 'name_asc', label: 'Nombre (A-Z)' },
    { value: 'name_desc', label: 'Nombre (Z-A)' },
    { value: 'quantity_desc', label: 'Cantidad (Mayor a Menor)' },
    { value: 'quantity_asc', label: 'Cantidad (Menor a Mayor)' },
    { value: 'price_desc', label: 'Precio (Mayor a Menor)' },
    { value: 'price_asc', label: 'Precio (Menor a Mayor)' },
    { value: 'type_asc', label: 'Tipo (Producto/Servicio)' },
  ];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex justify-end gap-2">
        <Button onClick={handlePrint} variant="outline" className="bg-card">
            <Printer className="mr-2 h-4 w-4" />Imprimir Lista
        </Button>
        <Button onClick={onNewItem}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Ítem
        </Button>
      </div>
      
      <TableToolbar
        {...tableManager}
        searchPlaceholder="Buscar por nombre, SKU, marca..."
        sortOptions={sortOptions}
        paginationSummary={tableManager.paginationSummary}
        onPreviousPage={tableManager.goToPreviousPage}
        onNextPage={tableManager.goToNextPage}
        canGoPrevious={tableManager.canGoPrevious}
        canGoNext={tableManager.canGoNext}
      />
      
      <Card>
        <CardContent className="pt-6">
          <InventoryTable items={filteredAndSortedItems} />
        </CardContent>
      </Card>
    </div>
  );
}
