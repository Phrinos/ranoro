

// src/app/(app)/inventario/components/inventory-report-content.tsx
"use client";

import React, { useState, useEffect } from 'react';
import type { InventoryItem, WorkshopInfo } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, DollarSign, TrendingUp } from 'lucide-react';

const LOCALSTORAGE_KEY = 'workshopTicketInfo';
const initialWorkshopInfo: WorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  logoUrl: "/ranoro-logo.png",
  cityState: "Aguascalientes, Ags.",
  fixedFooterText: "© 2025 Ranoro® Sistema de Administracion de Talleres. Todos los derechos reservados - Diseñado y Desarrollado por Arturo Valdelamar +524493930914",
};

interface InventoryReportContentProps {
  items: InventoryItem[];
}

export const InventoryReportContent = React.forwardRef<HTMLDivElement, InventoryReportContentProps>(
  ({ items }, ref) => {
    const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo>(initialWorkshopInfo);

    useEffect(() => {
        const storedInfoStr = localStorage.getItem(LOCALSTORAGE_KEY);
        if(storedInfoStr) {
            try { 
                const storedInfo = JSON.parse(storedInfoStr);
                setWorkshopInfo({ ...initialWorkshopInfo, ...storedInfo });
            } catch {}
        }
    }, []);

    const now = new Date();
    const formattedDate = format(now, "dd 'de' MMMM 'de' yyyy, HH:mm:ss", { locale: es });
    
    const productsOnly = items.filter(item => !item.isService);
    const totalInventoryCost = productsOnly.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalInventoryValue = productsOnly.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
    const totalProductsCount = productsOnly.length;

    return (
      <section ref={ref} id="print-area">
        <header className="report-header print-header-once">
            <div className="mb-8 border-b-2 border-black pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {workshopInfo?.logoUrl ? (
                  <div className="relative w-[150px] h-[50px]">
                    <Image 
                        src={workshopInfo.logoUrl} 
                        alt={`${workshopInfo.name} Logo`} 
                        fill
                        style={{ objectFit: 'contain' }}
                        data-ai-hint="workshop logo"
                        sizes="150px"
                    />
                  </div>
                ) : <div className="h-[50px]"></div>}
                 <div className="text-left sm:text-right">
                  <h2 className="text-2xl font-semibold">Reporte de Inventario</h2>
                  <p className="text-xs text-gray-500">Generado el: {formattedDate}</p>
                </div>
              </div>
              <div className="mt-4 text-xs">
                <p className="font-bold text-base">{workshopInfo.name}</p>
                <p>{workshopInfo.addressLine1}</p>
                {workshopInfo.addressLine2 && <p>{workshopInfo.addressLine2}</p>}
                <p>{workshopInfo.cityState}</p>
                <p>Tel: {workshopInfo.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Productos</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalProductsCount}</div>
                    <p className="text-xs text-muted-foreground">Productos únicos en stock.</p>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Valor Total (Costo)</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalInventoryCost)}</div>
                    <p className="text-xs text-muted-foreground">Valor del inventario a precio de compra.</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Valor Total (Venta)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</div>
                     <p className="text-xs text-muted-foreground">Valor potencial de venta del inventario.</p>
                  </CardContent>
                </Card>
            </div>
            <h3 className="text-xl font-semibold mb-2">Detalle del Inventario</h3>
        </header>

        <main>
          <Table className="inventory-table">
            <TableHeader>
              <TableRow className="bg-gray-100 print:bg-gray-100">
                <TableHead className="w-[15%]">Categoría</TableHead>
                <TableHead className="w-[15%]">Marca</TableHead>
                <TableHead className="w-[25%]">Nombre</TableHead>
                <TableHead className="w-[15%]">SKU</TableHead>
                <TableHead className="w-[10%] text-right">Stock</TableHead>
                <TableHead className="w-[10%] text-right">Costo</TableHead>
                <TableHead className="w-[10%] text-right">P. Venta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map(item => (
                  <TableRow key={item.id} className="border-b print:break-inside-avoid">
                    <TableCell className="break-words">{item.category}</TableCell>
                    <TableCell className="break-words">{item.brand || 'N/A'}</TableCell>
                    <TableCell className="font-medium break-words">{item.name}</TableCell>
                    <TableCell className="break-words">{item.sku || 'N/A'}</TableCell>
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
      </section>
    );
  }
);

InventoryReportContent.displayName = "InventoryReportContent";
