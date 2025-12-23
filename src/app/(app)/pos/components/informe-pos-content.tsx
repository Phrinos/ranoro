// src/app/(app)/pos/components/informe-pos-content.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import {
  calculateSaleProfit,
} from "@/lib/money-helpers";
import type { InventoryItem, SaleReceipt, ServiceRecord } from "@/types";
import {
  format,
  parseISO,
  isWithinInterval,
  isValid,
  startOfDay, endOfDay,
  startOfMonth, endOfMonth
} from "date-fns";
import { es } from 'date-fns/locale';
import { ShoppingCart, DollarSign, TrendingUp, BarChart2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';


interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

interface InformePosContentProps {
  allSales: SaleReceipt[];
  allServices: ServiceRecord[];
  allInventory: InventoryItem[];
}

export function InformePosContent({ allSales, allServices, allInventory }: InformePosContentProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  const summaryData = useMemo(() => {
    const from = startOfDay(dateRange?.from || new Date());
    const to = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(from);
    const interval = { start: from, end: to };

    const salesInRange = allSales.filter(s => {
        const saleDate = typeof s.saleDate === 'string' ? parseISO(s.saleDate) : s.saleDate;
        return s.status !== 'Cancelado' && saleDate && isValid(saleDate) && isWithinInterval(saleDate, interval)
    });
    const servicesInRange = allServices.filter(s => s.status === 'Entregado' && s.deliveryDateTime && isValid(parseISO(s.deliveryDateTime as string)) && isWithinInterval(parseISO(s.deliveryDateTime as string), interval));
    
    const salesRevenue = salesInRange.reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
    const salesProfit = salesInRange.reduce((sum, s) => sum + calculateSaleProfit(s, allInventory), 0);
    const servicesRevenue = servicesInRange.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const servicesProfit = servicesInRange.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);

    const totalRevenue = salesRevenue + servicesRevenue;
    const totalProfit = salesProfit + servicesProfit;

    const itemCounts = salesInRange.flatMap(s => s.items).reduce((acc, item) => {
        const key = item.itemName ?? "Sin nombre";
        acc[key] = (acc[key] || 0) + (item.quantity ?? 0);
        return acc;
    }, {} as Record<string, number>);

    let mostSoldItem: { name: string; quantity: number } | null = null;
    if (Object.keys(itemCounts).length > 0) {
      const topEntry = Object.entries(itemCounts).reduce((prev, curr) => (curr[1] > prev[1] ? curr : prev));
      mostSoldItem = { name: topEntry[0], quantity: topEntry[1] };
    }

    return {
      salesCount: salesInRange.length,
      serviceCount: servicesInRange.length,
      totalRevenue,
      totalProfit,
      mostSoldItem,
    };
  }, [dateRange, allSales, allServices, allInventory]);

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Resumen de Ventas y Ganancias</h2>
        <p className="text-muted-foreground">Datos para el período seleccionado.</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
        <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Operaciones</CardTitle><BarChart2 className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{summaryData.salesCount + summaryData.serviceCount}</div><p className="text-xs text-muted-foreground">{summaryData.salesCount} ventas y {summaryData.serviceCount} servicios</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(summaryData.totalRevenue)}</div><p className="text-xs text-muted-foreground">Suma de ventas y servicios</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ganancia Bruta</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(summaryData.totalProfit)}</div><p className="text-xs text-muted-foreground">Ganancia antes de gastos fijos.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Artículo Más Vendido (POS)</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold truncate">{summaryData.mostSoldItem?.name || 'N/A'}</div><p className="text-xs text-muted-foreground">{summaryData.mostSoldItem ? `${summaryData.mostSoldItem.quantity} unidades vendidas` : 'Sin ventas registradas'}</p></CardContent></Card>
      </div>
    </>
  );
}
