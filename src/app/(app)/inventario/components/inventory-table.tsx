
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

interface InventoryTableProps {
  items: InventoryItem[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  const router = useRouter();

  const handleRowClick = (itemId: string) => {
    router.push(`/inventario/${itemId}`);
  };
  
  if (!items.length) {
    return <p className="text-muted-foreground text-center py-8">No hay productos o servicios en el inventario.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-white">
          <TableRow>
            <TableHead className="font-bold">Código</TableHead>
            <TableHead className="font-bold">Categoría</TableHead>
            <TableHead className="font-bold">Nombre</TableHead>
            <TableHead className="text-right font-bold">Cantidad</TableHead>
            <TableHead className="text-right font-bold">Costo</TableHead>
            <TableHead className="text-right font-bold">Precio Venta</TableHead>
            <TableHead className="font-bold">Stock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow 
              key={item.id} 
              onClick={() => handleRowClick(item.id)}
              className={`cursor-pointer hover:bg-muted/50 ${!item.isService && item.quantity <= item.lowStockThreshold ? "bg-orange-50 dark:bg-orange-900/30" : ""}`}
            >
              <TableCell className="font-medium">{item.sku}</TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell>{item.name}</TableCell>
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
              <TableCell>
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
}
