
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { InventoryItem } from "@/types";
import { PackageSearch } from "lucide-react";

interface InventoryTableProps {
  items: InventoryItem[];
}

export const InventoryTable = React.memo(({ items }: InventoryTableProps) => {
  const router = useRouter();

  const handleRowClick = (itemId: string) => {
    router.push(`/inventario/${itemId}`);
  };
  
  if (!items.length) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <PackageSearch className="h-12 w-12 mb-2" />
            <h3 className="text-lg font-semibold text-foreground">No se encontraron productos</h3>
            <p className="text-sm">Intente cambiar su búsqueda o agregue un nuevo producto.</p>
        </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-x-auto">
      <Table>
        <TableHeader className="bg-black">
          <TableRow>
            <TableHead className="font-bold text-white">Categoría</TableHead>
            <TableHead className="font-bold text-white">Marca</TableHead>
            <TableHead className="font-bold text-white">Nombre</TableHead>
            <TableHead className="font-bold text-white">SKU</TableHead>
            <TableHead className="text-right font-bold text-white">Cantidad</TableHead>
            <TableHead className="text-right font-bold text-white">Costo</TableHead>
            <TableHead className="text-right font-bold text-white">Precio</TableHead>
            <TableHead className="font-bold print:hidden text-white">Stock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow 
              key={item.id} 
              onClick={() => handleRowClick(item.id)}
              className={`cursor-pointer hover:bg-muted/50 ${!item.isService && item.quantity <= item.lowStockThreshold ? "bg-orange-50 dark:bg-orange-900/30" : ""}`}
            >
              <TableCell>{item.category}</TableCell>
              <TableCell>{item.brand || 'N/A'}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.sku || 'N/A'}</TableCell>
              <TableCell className="text-right">
                {item.isService ? (
                  <Badge variant="outline">Servicio</Badge>
                ) : (
                  `${item.quantity.toLocaleString('es-ES')}${item.unitType === 'ml' ? ' ml' : item.unitType === 'liters' ? ' L' : ''}`
                )}
              </TableCell>
              <TableCell className="text-right">
                ${item.unitPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {item.unitType === 'ml' && <span className="text-xs text-muted-foreground"> /ml</span>}
                {item.unitType === 'liters' && <span className="text-xs text-muted-foreground"> /L</span>}
              </TableCell>
              <TableCell className="text-right">
                ${item.sellingPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {item.unitType === 'ml' && <span className="text-xs text-muted-foreground"> /ml</span>}
                {item.unitType === 'liters' && <span className="text-xs text-muted-foreground"> /L</span>}
                </TableCell>
              <TableCell className="print:hidden">
                {!item.isService && item.quantity <= item.lowStockThreshold && (
                  <Badge variant="destructive">Bajo</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

InventoryTable.displayName = 'InventoryTable';
