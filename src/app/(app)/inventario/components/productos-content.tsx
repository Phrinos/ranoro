

"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { InventoryItem } from '@/types';
import { PlusCircle, Printer } from 'lucide-react';
import { InventoryTable } from './inventory-table';
import { useTableManager } from '@/hooks/useTableManager';
import { TableToolbar } from '@/components/shared/table-toolbar';

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
          <InventoryTable items={filteredAndSortedItems} />
        </CardContent>
      </Card>
    </div>
  );
}

