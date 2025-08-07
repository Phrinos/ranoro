

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, AlertTriangle, Package, PlusCircle, Printer, ShoppingCart } from 'lucide-react';
import { InventoryTable } from './inventory-table';
import { TableToolbar } from '@/components/shared/table-toolbar';
import type { InventoryItem } from '@/types';
import { formatCurrency } from '@/lib/utils';
import type { useTableManager } from '@/hooks/useTableManager';

const getSortPriority = (item: InventoryItem): number => {
    if (item.isService) return 4; 
    if (item.quantity === 0) return 1;
    if (item.quantity <= item.lowStockThreshold) return 2;
    return 3;
};

interface SummaryData {
    totalInventoryCost: number;
    totalInventorySellingPrice: number;
    lowStockItemsCount: number;
    productsCount: number;
    servicesCount: number;
}

interface ProductosContentProps {
  summaryData: SummaryData;
  onNewItem: () => void;
  onPrint: (items: InventoryItem[]) => void;
  tableManager: ReturnType<typeof useTableManager<InventoryItem>>;
  filteredItems: InventoryItem[];
  onRegisterPurchaseClick: () => void;
}

const sortOptions = [
    { value: 'default_order', label: 'Orden Inteligente (Recomendado)' },
    { value: 'name_asc', label: 'Nombre (A-Z)' },
    { value: 'name_desc', label: 'Nombre (Z-A)' },
    { value: 'quantity_desc', label: 'Cantidad (Mayor a Menor)' },
    { value: 'quantity_asc', label: 'Cantidad (Menor a Mayor)' },
    { value: 'price_desc', label: 'Precio (Mayor a Menor)' },
    { value: 'price_asc', label: 'Precio (Menor a Mayor)' },
];

export function ProductosContent({ summaryData, onNewItem, onPrint, tableManager, filteredItems, onRegisterPurchaseClick }: ProductosContentProps) {
  
  const customSortedItems = React.useMemo(() => {
    const items = [...filteredItems];
    if (tableManager.sortOption === 'default_order') {
        return items.sort((a, b) => {
            const priorityA = getSortPriority(a);
            const priorityB = getSortPriority(b);
            if (priorityA !== priorityB) return priorityA - priorityB;
            return a.name.localeCompare(b.name);
        });
    }
    return items; 
  }, [filteredItems, tableManager.sortOption]);

  const handlePrint = () => {
    onPrint(customSortedItems);
  };

  return (
    <div className="space-y-4">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Costo Total del Inventario</CardTitle><DollarSign className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(summaryData.totalInventoryCost)}</div><p className="text-xs text-muted-foreground">Valor de venta: {formatCurrency(summaryData.totalInventorySellingPrice)}</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Productos con Stock Bajo</CardTitle><AlertTriangle className="h-4 w-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{summaryData.lowStockItemsCount}</div><p className="text-xs text-muted-foreground">Requieren atención o reposición.</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ítems Registrados</CardTitle><Package className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{summaryData.productsCount + summaryData.servicesCount}</div><p className="text-xs text-muted-foreground">{summaryData.productsCount} Productos y {summaryData.servicesCount} Servicios.</p></CardContent></Card>
            <Button className="w-full h-auto text-base lg:col-span-1" onClick={onRegisterPurchaseClick}>
                <ShoppingCart className="mr-2 h-5 w-5" /> Ingresar Compra
            </Button>
        </div>
        
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
