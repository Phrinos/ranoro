

"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, AlertTriangle, Package, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface SummaryData {
    totalInventoryCost: number;
    totalInventorySellingPrice: number;
    lowStockItemsCount: number;
    productsCount: number;
    servicesCount: number;
}

interface DashboardCardsProps {
  summaryData: SummaryData;
  onRegisterPurchaseClick: () => void;
  onNewItemClick: () => void;
}

export function DashboardCards({ summaryData, onRegisterPurchaseClick, onNewItemClick }: DashboardCardsProps) {
  const router = useRouter();
  
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Costo Total del Inventario</CardTitle><DollarSign className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(summaryData.totalInventoryCost)}</div><p className="text-xs text-muted-foreground">Valor de venta: {formatCurrency(summaryData.totalInventorySellingPrice)}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Productos con Stock Bajo</CardTitle><AlertTriangle className="h-4 w-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{summaryData.lowStockItemsCount}</div><p className="text-xs text-muted-foreground">Requieren atención o reposición.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ítems Registrados</CardTitle><Package className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{summaryData.productsCount + summaryData.servicesCount}</div><p className="text-xs text-muted-foreground">{summaryData.productsCount} Productos y {summaryData.servicesCount} Servicios.</p></CardContent></Card>
         <div className="flex flex-col gap-2">
            <Button className="w-full flex-1" onClick={() => router.push('/proveedores?tab=cuentas_por_pagar')}>
                <ShoppingCart className="mr-2 h-5 w-5" /> Registrar Compra
            </Button>
            <Button className="w-full flex-1" variant="outline" onClick={onNewItemClick}>
                <PlusCircle className="mr-2 h-5 w-5" /> Registrar Ítem
            </Button>
        </div>
    </div>
  );
}
