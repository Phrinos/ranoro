

"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { InventoryItem } from '@/types';
import { Search, ListFilter, PlusCircle, Printer } from 'lucide-react';
import { InventoryTable } from './inventory-table';

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
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortOption, setSortOption] = React.useState<InventorySortOption>("stock_status_name_asc");

  const filteredAndSortedItems = React.useMemo(() => {
    let itemsToDisplay = [...inventoryItems];
    if (searchTerm) {
      itemsToDisplay = itemsToDisplay.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    itemsToDisplay.sort((a, b) => {
      const isALowStock = !a.isService && a.quantity <= a.lowStockThreshold; 
      const isBLowStock = !b.isService && b.quantity <= b.lowStockThreshold;
      if (sortOption === "stock_status_name_asc") { 
        if (isALowStock && !isBLowStock) return -1; 
        if (!isALowStock && isBLowStock) return 1; 
        return a.name.localeCompare(b.name); 
      }
      if (sortOption === "type_asc") { 
        if (a.isService && !b.isService) return 1; 
        if (!a.isService && b.isService) return -1; 
        return a.name.localeCompare(b.name); 
      }
      switch (sortOption) {
        case 'name_asc': return a.name.localeCompare(b.name); 
        case 'name_desc': return b.name.localeCompare(a.name); 
        case 'sku_asc': return a.sku.localeCompare(b.sku); 
        case 'sku_desc': return b.sku.localeCompare(a.sku);
        case 'quantity_asc': 
          if(a.isService) return 1; if(b.isService) return -1; 
          return a.quantity - b.quantity;
        case 'quantity_desc': 
          if(a.isService) return 1; if(b.isService) return -1; 
          return b.quantity - a.quantity;
        case 'price_asc': return a.sellingPrice - b.sellingPrice; 
        case 'price_desc': return b.sellingPrice - a.sellingPrice;
        default: return a.name.localeCompare(b.name); 
      }
    });
    return itemsToDisplay;
  }, [inventoryItems, searchTerm, sortOption]);

  const handlePrint = () => {
    onPrint(filteredAndSortedItems);
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Lista de Productos y Servicios</h2>
        <p className="text-muted-foreground">Administra productos, servicios y niveles de stock.</p>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Buscar por nombre o SKU..." className="w-full rounded-lg bg-card pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial bg-card">
                <ListFilter className="mr-2 h-4 w-4" />Ordenar por
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as InventorySortOption)}>
                <DropdownMenuRadioItem value="stock_status_name_asc">Estado de Stock</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="quantity_desc">Cantidad (Mayor a Menor)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="quantity_asc">Cantidad (Menor a Mayor)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="price_desc">Precio (Mayor a Menor)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="price_asc">Precio (Menor a Mayor)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="type_asc">Tipo (Producto/Servicio)</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handlePrint} variant="default" className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white"><Printer className="mr-2 h-4 w-4" />Imprimir Lista</Button>
          <Button onClick={onNewItem} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Producto / Servicio
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <InventoryTable items={filteredAndSortedItems} />
        </CardContent>
      </Card>
    </div>
  );
}
