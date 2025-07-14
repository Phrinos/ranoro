
"use client";

import React from 'react';
import type { InventoryItem, WorkshopInfo } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, DollarSign, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

interface InventoryPrintContentProps {
  inventoryItems: InventoryItem[];
  workshopInfo?: Partial<WorkshopInfo>;
}

export const InventoryPrintContent = React.forwardRef<HTMLDivElement, InventoryPrintContentProps>(
  ({ inventoryItems, workshopInfo }, ref) => {
    
    const summary = React.useMemo(() => {
        let cost = 0, sellingPriceValue = 0, products = 0, services = 0;
        inventoryItems.forEach(item => {
            if (item.isService) services++;
            else {
                products++;
                cost += item.quantity * item.unitPrice;
                sellingPriceValue += item.quantity * item.sellingPrice;
            }
        });
        return { 
            totalInventoryCost: cost, 
            totalInventorySellingPrice: sellingPriceValue, 
            productsCount: products, 
            servicesCount: services, 
        };
    }, [inventoryItems]);

    return (
      <div 
        ref={ref}
        data-format="letter"
        className="font-sans bg-white text-black shadow-lg mx-auto p-8 text-sm"
      >
        <header className="mb-8 border-b-2 border-black pb-4">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              {workshopInfo?.logoUrl && (
                <Image 
                  src={workshopInfo.logoUrl} 
                  alt={`${workshopInfo.name || 'Taller'} Logo`} 
                  width={150} 
                  height={50} 
                  style={{ objectFit: 'contain', height: 'auto' }}
                  data-ai-hint="workshop logo"
                />
              )}
               <div className="mt-2 text-xs">
                <p className="font-bold text-base">{workshopInfo?.name || 'Taller'}</p>
                <p>{workshopInfo?.addressLine1}</p>
                {workshopInfo?.addressLine2 && <p>{workshopInfo.addressLine2}</p>}
                <p>{workshopInfo?.cityState}</p>
                <p>Tel: {workshopInfo?.phone}</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold">Reporte de Inventario General</h1>
              <p className="text-sm text-gray-500">
                Generado el: {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
          </div>
        </header>

        <main>
          <div className="grid grid-cols-3 gap-6 mb-8 text-center">
             <Card className="shadow-none border-gray-200"><CardHeader><CardTitle className="text-sm font-medium flex items-center justify-center gap-2"><Package className="h-4 w-4"/>Total de Productos</CardTitle><CardDescription className="text-2xl font-bold">{summary.productsCount}</CardDescription></CardHeader></Card>
             <Card className="shadow-none border-gray-200"><CardHeader><CardTitle className="text-sm font-medium flex items-center justify-center gap-2"><DollarSign className="h-4 w-4"/>Costo Total del Inventario</CardTitle><CardDescription className="text-2xl font-bold">{formatCurrency(summary.totalInventoryCost)}</CardDescription></CardHeader></Card>
             <Card className="shadow-none border-gray-200"><CardHeader><CardTitle className="text-sm font-medium flex items-center justify-center gap-2"><TrendingUp className="h-4 w-4"/>Valor de Venta Total</CardTitle><CardDescription className="text-2xl font-bold">{formatCurrency(summary.totalInventorySellingPrice)}</CardDescription></CardHeader></Card>
          </div>
          
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Lista de Productos y Servicios</h2>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-bold text-gray-600">Nombre</TableHead>
                  <TableHead className="font-bold text-gray-600">Categoría</TableHead>
                  <TableHead className="text-right font-bold text-gray-600">Cantidad</TableHead>
                  <TableHead className="text-right font-bold text-gray-600">Costo</TableHead>
                  <TableHead className="text-right font-bold text-gray-600">Precio Venta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">
                       {item.isService ? (
                         <Badge variant="outline" className="text-xs">Servicio</Badge>
                       ) : (
                         `${item.quantity} ${item.unitType === 'ml' ? 'ml' : item.unitType === 'liters' ? 'L' : 'uds.'}`
                       )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.sellingPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </main>
        
        <footer className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>Este es un reporte generado automáticamente por el sistema Ranoro.</p>
        </footer>
      </div>
    );
  }
);

InventoryPrintContent.displayName = "InventoryPrintContent";
