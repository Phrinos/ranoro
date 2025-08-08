
"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense, useRef, lazy } from 'react';
import type { InventoryItem, InventoryCategory, Supplier, Vehicle, VehiclePriceList } from '@/types'; 
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

interface InventoryReportContentProps {
  items: InventoryItem[];
}

export default function InventoryReportContent({ items }: InventoryReportContentProps) {
  const date = new Date();

  const groupedByCategory = useMemo(() => {
    return items.reduce((acc, item) => {
        const category = item.category || 'Sin Categoría';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<string, InventoryItem[]>);
  }, [items]);
  
  return (
    <div className="bg-white text-black p-8 font-sans text-sm">
        <header className="text-center mb-8">
            <h1 className="text-2xl font-bold">Reporte de Inventario</h1>
            <p className="text-gray-600">Generado el: {format(date, "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
        </header>

        <main>
            {Object.entries(groupedByCategory).map(([category, itemsInCategory]) => (
                <div key={category} className="mb-6 break-inside-avoid">
                    <h2 className="text-lg font-bold border-b-2 border-primary mb-2 pb-1">{category}</h2>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead className="text-right">Stock</TableHead>
                                <TableHead className="text-right">Costo Unit.</TableHead>
                                <TableHead className="text-right">Valor Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {itemsInCategory.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.sku || 'N/A'}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ))}
        </main>
    </div>
  );
}
