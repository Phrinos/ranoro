// src/app/(app)/rentas/components/ResumenTab.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from 'react-day-picker';
import { formatCurrency } from "@/lib/utils";
import type { RentalPayment, VehicleExpense } from '@/types';
import { DollarSign, AlertCircle, LineChart, TrendingDown, CalendarIcon as CalendarDateIcon } from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

interface ResumenTabProps {
  payments: RentalPayment[];
  expenses: VehicleExpense[];
  monthlyBalances: any[]; // Consider creating a specific type for this
}

export function ResumenTab({ payments, expenses, monthlyBalances }: ResumenTabProps) {
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  const summaryData = useMemo(() => {
    if (!filterDateRange?.from) {
      return { totalCollected: 0, totalDebt: 0, totalMonthlyBalance: 0, driverWithMostDebt: null, totalExpenses: 0 };
    }
    const { from, to } = filterDateRange;
    const interval = { start: startOfDay(from), end: endOfDay(to || from) };

    const totalCollectedThisPeriod = payments
        .filter(p => isValid(parseISO(p.paymentDate)) && isWithinInterval(parseISO(p.paymentDate), interval))
        .reduce((sum, p) => sum + p.amount, 0);

    const totalExpensesThisPeriod = expenses
        .filter(e => isValid(parseISO(e.date)) && isWithinInterval(parseISO(e.date), interval))
        .reduce((sum, e) => sum + e.amount, 0);

    const { totalDebt, totalMonthlyBalance } = monthlyBalances.reduce((acc, curr) => {
        acc.totalDebt += curr.realBalance < 0 ? curr.realBalance : 0;
        acc.totalMonthlyBalance += curr.balance;
        return acc;
    }, { totalDebt: 0, totalMonthlyBalance: 0 });

    const driverWithMostDebt = monthlyBalances.length > 0
        ? monthlyBalances.reduce((prev, curr) => (prev.daysOwed > curr.daysOwed ? prev : curr))
        : null;

    return {
        totalCollected: totalCollectedThisPeriod,
        totalDebt: Math.abs(totalDebt),
        totalMonthlyBalance,
        driverWithMostDebt,
        totalExpenses: totalExpensesThisPeriod
    };
  }, [filterDateRange, payments, expenses, monthlyBalances]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className={cn("w-full sm:w-[280px] justify-start text-left font-normal bg-card",!filterDateRange && "text-muted-foreground")}>
              <CalendarDateIcon className="mr-2 h-4 w-4" />
              {filterDateRange?.from ? (filterDateRange.to ? (`${format(filterDateRange.from, "LLL dd, y", { locale: es })} - ${format(filterDateRange.to, "LLL dd, y", { locale: es })}`) : format(filterDateRange.from, "LLL dd, y", { locale: es })) : (<span>Seleccione rango</span>)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar initialFocus mode="range" defaultMonth={filterDateRange?.from} selected={filterDateRange} onSelect={setFilterDateRange} numberOfMonths={2} locale={es} />
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Recaudado (Periodo)</CardTitle><DollarSign className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(summaryData.totalCollected)}</div><p className="text-xs text-muted-foreground">Total de pagos de renta en el periodo</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Deuda Total Pendiente</CardTitle><AlertCircle className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{formatCurrency(summaryData.totalDebt)}</div><p className="text-xs text-muted-foreground">Suma de balances reales de todos.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Balance del Mes (Flotilla)</CardTitle><LineChart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className={cn("text-2xl font-bold", summaryData.totalMonthlyBalance >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(summaryData.totalMonthlyBalance)}</div><p className="text-xs text-muted-foreground">Pagos vs. cargos del mes actual.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gastos de Flotilla (Periodo)</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(summaryData.totalExpenses)}</div><p className="text-xs text-muted-foreground">Gastos de vehículos en el periodo.</p></CardContent></Card>
      </div>
    </div>
  );
}
