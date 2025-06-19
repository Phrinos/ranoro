
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
    return <p className="text-muted-foreground text-center py-8">No hay artículos en el inventario.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Costo</TableHead>
            <TableHead className="text-right">Precio Venta</TableHead>
            <TableHead>Stock Bajo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow 
              key={item.id} 
              onClick={() => handleRowClick(item.id)}
              className={`cursor-pointer hover:bg-muted/50 ${item.quantity <= item.lowStockThreshold ? "bg-orange-50 dark:bg-orange-900/30" : ""}`}
            >
              <TableCell className="font-medium">{item.sku}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.category || 'N/A'}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">${item.unitPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-right">${item.sellingPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell>
                {item.quantity <= item.lowStockThreshold && (
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
