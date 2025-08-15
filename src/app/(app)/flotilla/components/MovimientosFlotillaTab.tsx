
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import type { DateRange } from 'react-day-picker';
import { formatCurrency } from "@/lib/utils";
import type { RentalPayment, VehicleExpense, OwnerWithdrawal, Driver } from '@/types';
import { DollarSign, AlertCircle, LineChart, TrendingDown, CalendarIcon as CalendarDateIcon, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parseISO, startOfMonth, endOfMonth, compareDesc } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

interface Movement {
  id: string;
  date: Date;
  type: 'Pago de Renta' | 'Gasto de Vehículo' | 'Retiro de Propietario';
  description: string;
  amount: number;
  isIncome: boolean;
}

interface MovimientosFlotillaTabProps {
  payments: RentalPayment[];
  expenses: VehicleExpense[];
  withdrawals: OwnerWithdrawal[];
  drivers: Driver[];
}

export function MovimientosFlotillaTab({ payments, expenses, withdrawals, drivers }: MovimientosFlotillaTabProps) {
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });
  
  const summaryData = useMemo(() => {
    if (!filterDateRange?.from) {
      return { totalCollected: 0, totalExpenses: 0, totalWithdrawals: 0, netBalance: 0 };
    }
    const { from, to } = filterDateRange;
    const interval = { start: startOfDay(from), end: endOfDay(to || from) };

    const totalCollected = payments
        .filter(p => isValid(parseISO(p.paymentDate)) && isWithinInterval(parseISO(p.paymentDate), interval))
        .reduce((sum, p) => sum + p.amount, 0);

    const totalExpenses = expenses
        .filter(e => isValid(parseISO(e.date)) && isWithinInterval(parseISO(e.date), interval))
        .reduce((sum, e) => sum + e.amount, 0);

    const totalWithdrawals = withdrawals
        .filter(w => isValid(parseISO(w.date)) && isWithinInterval(parseISO(w.date), interval))
        .reduce((sum, w) => sum + w.amount, 0);

    return {
        totalCollected,
        totalExpenses,
        totalWithdrawals,
        netBalance: totalCollected - totalExpenses - totalWithdrawals
    };
  }, [filterDateRange, payments, expenses, withdrawals]);


  const unifiedMovements = useMemo(() => {
    const paymentMovements: Movement[] = payments.map(p => ({
      id: p.id,
      date: parseISO(p.paymentDate),
      type: 'Pago de Renta',
      description: `Pago de ${p.driverName} (${p.vehicleLicensePlate})`,
      amount: p.amount,
      isIncome: true
    }));

    const expenseMovements: Movement[] = expenses.map(e => ({
      id: e.id,
      date: parseISO(e.date),
      type: 'Gasto de Vehículo',
      description: `${e.description} (${e.vehicleLicensePlate})`,
      amount: e.amount,
      isIncome: false
    }));
    
    const withdrawalMovements: Movement[] = withdrawals.map(w => ({
      id: w.id,
      date: parseISO(w.date),
      type: 'Retiro de Propietario',
      description: `${w.ownerName} - ${w.reason || 'Retiro'}`,
      amount: w.amount,
      isIncome: false
    }));

    return [...paymentMovements, ...expenseMovements, ...withdrawalMovements]
      .sort((a,b) => compareDesc(a.date, b.date));
  }, [payments, expenses, withdrawals]);
  
  const filteredMovements = useMemo(() => {
    if (!filterDateRange?.from) return unifiedMovements;
    const { from, to } = filterDateRange;
    const interval = { start: startOfDay(from), end: endOfDay(to || from) };
    return unifiedMovements.filter(m => isValid(m.date) && isWithinInterval(m.date, interval));
  }, [filterDateRange, unifiedMovements]);


  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className={cn("w-full sm:w-[280px] justify-start text-left font-normal bg-card",!filterDateRange && "text-muted-foreground")}>
              <CalendarDateIcon className="mr-2 h-4 w-4" />
              {filterDateRange?.from ? (filterDateRange.to && filterDateRange.from.getTime() !== filterDateRange.to.getTime() ? (`${format(filterDateRange.from, "LLL dd, y", { locale: es })} - ${format(filterDateRange.to, "LLL dd, y", { locale: es })}`) : format(filterDateRange.from, "LLL dd, y", { locale: es })) : (<span>Seleccione rango</span>)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar initialFocus mode="range" defaultMonth={filterDateRange?.from} selected={filterDateRange} onSelect={setFilterDateRange} numberOfMonths={2} locale={es} />
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos (Pagos)</CardTitle><TrendingUp className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(summaryData.totalCollected)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gastos (Vehículos)</CardTitle><TrendingDown className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{formatCurrency(summaryData.totalExpenses)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Retiros (Propietarios)</CardTitle><ArrowDown className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{formatCurrency(summaryData.totalWithdrawals)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Balance Neto</CardTitle><LineChart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className={cn("text-2xl font-bold", summaryData.netBalance >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(summaryData.netBalance)}</div></CardContent></Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
          <CardDescription>Todos los pagos, gastos y retiros de la flotilla en el periodo seleccionado.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white">Fecha</TableHead>
                  <TableHead className="text-white">Tipo</TableHead>
                  <TableHead className="text-white">Descripción</TableHead>
                  <TableHead className="text-right text-white">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length > 0 ? (
                  filteredMovements.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{format(m.date, "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                      <TableCell>
                        <Badge variant={m.isIncome ? 'success' : 'destructive'}>
                            {m.type === 'Pago de Renta' ? <ArrowUp className="mr-1 h-3 w-3"/> : <ArrowDown className="mr-1 h-3 w-3"/>}
                            {m.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{m.description}</TableCell>
                      <TableCell className={cn("text-right font-semibold", m.isIncome ? "text-green-600" : "text-destructive")}>
                        {formatCurrency(m.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay movimientos en este periodo.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
