
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { DollarSign, AlertTriangle, Package, ShoppingCart, Building, TrendingUp } from 'lucide-react';
import type { InventoryItem, Supplier } from '@/types';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, isValid } from 'date-fns';
import { placeholderServiceRecords } from '@/lib/placeholder-data';

interface InformeContentProps {
  inventoryItems: InventoryItem[];
  suppliers: Supplier[];
  onRegisterPurchaseClick: () => void;
}

export function InformeContent({ inventoryItems, suppliers, onRegisterPurchaseClick }: InformeContentProps) {

  const summary = React.useMemo(() => {
    let cost = 0, sellingPriceValue = 0, lowStock = 0, products = 0, services = 0;
    inventoryItems.forEach(item => {
      if (item.isService) services++;
      else {
        products++;
        cost += item.quantity * item.unitPrice;
        sellingPriceValue += item.quantity * item.sellingPrice;
        if (item.quantity <= item.lowStockThreshold) lowStock++;
      }
    });

    const debt = suppliers.reduce((total, s) => total + (s.debtAmount || 0), 0);
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
    const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
    const supplierPurchaseQuantity: Record<string, { name: string, quantity: number }> = {};
    
    placeholderServiceRecords.forEach(service => {
        if (!service.serviceDate || !isValid(parseISO(service.serviceDate))) return;
        if (isWithinInterval(parseISO(service.serviceDate), { start: lastMonthStart, end: lastMonthEnd })) {
            (service.serviceItems || []).flatMap(item => item.suppliesUsed || []).forEach(part => {
                const inventoryItem = inventoryItems.find(item => item.id === part.supplyId);
                if (inventoryItem?.supplier) {
                    const supplierName = inventoryItem.supplier;
                    if (!supplierPurchaseQuantity[supplierName]) supplierPurchaseQuantity[supplierName] = { name: supplierName, quantity: 0 };
                    supplierPurchaseQuantity[supplierName].quantity += part.quantity;
                }
            });
        }
    });

    let topSupplier: { name: string, quantity: number } | null = null;
    for (const supplierInfo of Object.values(supplierPurchaseQuantity)) {
        if (!topSupplier || supplierInfo.quantity > topSupplier.quantity) topSupplier = supplierInfo;
    }

    return { 
        totalInventoryCost: cost, 
        totalInventorySellingPrice: sellingPriceValue, 
        lowStockItemsCount: lowStock, 
        productsCount: products, 
        servicesCount: services, 
        totalDebtWithSuppliers: debt, 
        topSupplierLastMonth: topSupplier 
    };
  }, [inventoryItems, suppliers]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Acciones Rápidas</h2>
      </div>
      <Button className="w-full h-12 text-base" onClick={onRegisterPurchaseClick}>
        <ShoppingCart className="mr-2 h-5 w-5" /> Ingresar Compra de Mercancía
      </Button>
      <div className="space-y-2 pt-4">
        <h2 className="text-2xl font-semibold tracking-tight">Resumen de Inventario</h2>
      </div>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Costo Total del Inventario</CardTitle><DollarSign className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">${summary.totalInventoryCost.toLocaleString('es-ES')}</div><p className="text-xs text-muted-foreground">Valor de venta: ${summary.totalInventorySellingPrice.toLocaleString('es-ES')}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Productos con Stock Bajo</CardTitle><AlertTriangle className="h-4 w-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{summary.lowStockItemsCount}</div><p className="text-xs text-muted-foreground">Requieren atención o reposición.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ítems Registrados</CardTitle><Package className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{summary.productsCount + summary.servicesCount}</div><p className="text-xs text-muted-foreground">{summary.productsCount} Productos y {summary.servicesCount} Servicios.</p></CardContent></Card>
      </div>
      <div className="space-y-2 pt-4">
        <h2 className="text-2xl font-semibold tracking-tight">Resumen de Proveedores</h2>
      </div>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Deuda Total con Proveedores</CardTitle><DollarSign className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">${summary.totalDebtWithSuppliers.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div><p className="text-xs text-muted-foreground">Suma de todas las deudas pendientes.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Top Compras (Mes Pasado)</CardTitle><TrendingUp className="h-4 w-4 text-blue-500" /></CardHeader><CardContent>{summary.topSupplierLastMonth ? (<><div className="text-xl font-bold">{summary.topSupplierLastMonth.name}</div><p className="text-xs text-muted-foreground">{summary.topSupplierLastMonth.quantity} unidades suministradas.</p></>) : (<p className="text-muted-foreground">No se registraron compras.</p>)}</CardContent></Card>
      </div>
    </div>
  );
}
