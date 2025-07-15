// src/app/(app)/inventario/components/inventory-report-content.tsx
"use client";

import React from 'react';
import type { InventoryItem, WorkshopInfo } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InventoryReportContentProps {
  items: InventoryItem[];
  workshopInfo: WorkshopInfo | null;
}

export const InventoryReportContent = React.forwardRef<HTMLDivElement, InventoryReportContentProps>(
  ({ items, workshopInfo }, ref) => {
    const now = new Date();
    const formattedDate = format(now, "dd 'de' MMMM 'de' yyyy, HH:mm:ss", { locale: es });

    return (
      <div
        ref={ref}
        data-format="letter"
        className="font-sans bg-white text-black p-8 text-sm"
      >
        <header className="mb-8 border-b border-gray-300 pb-4">
          <div className="flex justify-between items-center">
            {workshopInfo?.logoUrl ? (
                <Image 
                    src={workshopInfo.logoUrl} 
                    alt={`${workshopInfo.name} Logo`} 
                    width={150} 
                    height={50} 
                    style={{ objectFit: 'contain' }}
                    data-ai-hint="workshop logo"
                />
            ) : (
                <h1 className="text-3xl font-bold text-primary">{workshopInfo?.name || 'Taller'}</h1>
            )}
            <div className="text-right">
              <h2 className="text-2xl font-semibold">Reporte de Inventario</h2>
              <p className="text-xs text-gray-500">Generado el: {formattedDate}</p>
            </div>
          </div>
        </header>

        <main>
          <Table>
            <TableHeader className="bg-black text-white">
              <TableRow>
                <TableHead className="text-white">Categoría</TableHead>
                <TableHead className="text-white">Marca</TableHead>
                <TableHead className="text-white w-[30%]">Nombre</TableHead>
                <TableHead className="text-white">SKU</TableHead>
                <TableHead className="text-right text-white">Stock</TableHead>
                <TableHead className="text-right text-white">Costo</TableHead>
                <TableHead className="text-right text-white">Precio Venta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.brand || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {item.isService ? <Badge variant="secondary">Servicio</Badge> : item.quantity}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.sellingPrice)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    No hay artículos en la lista para mostrar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </main>
      </div>
    );
  }
);

InventoryReportContent.displayName = "InventoryReportContent";
