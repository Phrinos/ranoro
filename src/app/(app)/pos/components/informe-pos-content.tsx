
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  calculateSaleProfit,
} from "@/lib/placeholder-data";
import type { InventoryItem, SaleReceipt, ServiceRecord } from "@/types";
import {
  format,
  parseISO,
  isWithinInterval,
  isValid,
  startOfDay, endOfDay, startOfWeek, endOfWeek, isSameDay, subDays, startOfMonth, endOfMonth
} from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon as CalendarDateIcon, ShoppingCart, DollarSign, TrendingUp, BarChart2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InformePosContentProps {
  allSales: SaleReceipt[];
  allServices: ServiceRecord[];
  allInventory: InventoryItem[];
}

export function InformePosContent({ allSales, allServices, allInventory }: InformePosContentProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfDay(now), to: endOfDay(now) };
  });

  const setDateToToday = () => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  const setDateToYesterday = () => {
    const yesterday = subDays(new Date(), 1);
    setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
  };
  const setDateToThisWeek = () => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
  const setDateToThisMonth = () => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });

  const summaryData = useMemo(() => {
    if (!dateRange?.from) {
      return { salesCount: 0, serviceCount: 0, totalRevenue: 0, totalProfit: 0, mostSoldItem: null };
    }
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
    const interval = { start: from, end: to };

    const salesInRange = allSales.filter(s => s.status !== 'Cancelado' && isValid(parseISO(s.saleDate)) && isWithinInterval(parseISO(s.saleDate), interval));
    const servicesInRange = allServices.filter(s => s.status === 'Entregado' && s.deliveryDateTime && isValid(parseISO(s.deliveryDateTime)) && isWithinInterval(parseISO(s.deliveryDateTime), interval));
    
    const salesRevenue = salesInRange.reduce((sum, s) => sum + s.totalAmount, 0);
    const salesProfit = salesInRange.reduce((sum, s) => sum + calculateSaleProfit(s, allInventory), 0);
    const servicesRevenue = servicesInRange.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const servicesProfit = servicesInRange.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);

    const totalRevenue = salesRevenue + servicesRevenue;
    const totalProfit = salesProfit + servicesProfit;

    const itemCounts = salesInRange.flatMap(s => s.items).reduce((acc, item) => {
        acc[item.itemName] = (acc[item.itemName] || 0) + item.quantity;
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
        <Button variant="outline" size="sm" onClick={setDateToToday} className="bg-card">Hoy</Button>
        <Button variant="outline" size="sm" onClick={setDateToYesterday} className="bg-card">Ayer</Button>
        <Button variant="outline" size="sm" onClick={setDateToThisWeek} className="bg-card">Semana</Button>
        <Button variant="outline" size="sm" onClick={setDateToThisMonth} className="bg-card">Mes</Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal bg-card", !dateRange && "text-muted-foreground")}>
              <CalendarDateIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (dateRange.to && !isSameDay(dateRange.from, dateRange.to) ? (`${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}`) : format(dateRange.from, "MMMM dd, yyyy", { locale: es })) : (<span>Seleccione rango</span>)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} />
          </PopoverContent>
        </Popover>
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
