
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { CashDrawerTransaction, PaymentMethod } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from "@/lib/utils";
import { format, isValid, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { DollarSign, ArrowDown, ArrowUp, Loader2, Wallet, ArrowLeft, ArrowRight } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from "zod";
import { cashService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';

interface DateRange { from: Date | undefined; to?: Date | undefined; }

const cashTransactionSchema = z.object({
  description: z.string().min(3, "La descripción debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});

type CashTransactionFormValues = z.infer<typeof cashTransactionSchema>;

type FlowRow = {
  id: string;
  date: Date | null;
  type: 'Entrada' | 'Salida';
  source: 'Manual' | 'Venta' | 'Servicio' | 'Compra' | 'Flotilla';
  refId?: string;
  user: string;
  description: string;
  amount: number;
  method: PaymentMethod;
};

export default function CajaReporteContent() {
  const { toast: show } = useToast();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [sortOption, setSortOption] = useState('date_desc');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'Entrada' | 'Salida'>('Entrada');

  useEffect(() => {
    setIsLoading(true);
    const unsub = cashService.onCashTransactionsUpdate((tx) => {
        setCashTransactions(tx);
        setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const range = useMemo(() => {
    if (!dateRange?.from) return null;
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
    return { from, to };
  }, [dateRange]);

  const flowRows = useMemo(() => {
    if (!range) return [];
    
    const inRange = (d: Date | null) => d && isValid(d) && isWithinInterval(d, { start: range.from, end: range.to });

    const allRows: FlowRow[] = cashTransactions.map(t => {
      const d = parseDate((t as any).date);
      if (!inRange(d)) return null;

      const isIncome = t.type === 'in' || t.type === 'Entrada';

      return {
        id: t.id,
        date: d,
        type: isIncome ? 'Entrada' : 'Salida',
        source: (t as any).relatedType || 'Manual',
        refId: (t as any).relatedId,
        user: t.userName || (t as any).user || 'Sistema',
        description: t.concept || (t as any).description || '',
        amount: Math.abs((t as any).amount || 0),
        method: (t.paymentMethod as PaymentMethod) || 'Efectivo',
      } as FlowRow;
    }).filter(Boolean) as FlowRow[];

    const [key, direction] = sortOption.split('_');
    return allRows.sort((a, b) => {
      const valA = a[key as keyof FlowRow] ?? '';
      const valB = b[key as keyof FlowRow] ?? '';

      if (key === 'date') {
        const dateA = valA instanceof Date ? valA.getTime() : 0;
        const dateB = valB instanceof Date ? valB.getTime() : 0;
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return direction === 'asc' ? valA - valB : valB - valA;
      }

      const cmp = String(valA).localeCompare(String(valB), 'es', { numeric: true });
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [cashTransactions, range, sortOption]);

  const { periodKPIs, currentBalance } = useMemo(() => {
    const incomeInPeriod = flowRows.filter(r => r.type === 'Entrada').reduce((s, r) => s + r.amount, 0);
    const outcomeInPeriod = flowRows.filter(r => r.type === 'Salida').reduce((s, r) => s + r.amount, 0);

    const allManualCashFlow = cashTransactions
        .filter(t => t.paymentMethod === 'Efectivo' || !t.paymentMethod);
        
    const allManualCashIncome = allManualCashFlow
        .filter(t => t.type === 'in' || t.type === 'Entrada')
        .reduce((s, r) => s + (r as any).amount, 0);

    const allManualCashOutcome = allManualCashFlow
        .filter(t => t.type === 'out' || t.type === 'Salida')
        .reduce((s, r) => s + (r as any).amount, 0);
        
    const currentTotalBalance = allManualCashIncome - allManualCashOutcome;

    return {
      periodKPIs: {
        income: incomeInPeriod,
        outcome: outcomeInPeriod,
        net: incomeInPeriod - outcomeInPeriod,
      },
      currentBalance: currentTotalBalance,
    };
  }, [flowRows, cashTransactions]);

  const setPresetRange = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth') => {
    const now = new Date();
    if (preset === 'today') return setDateRange({ from: startOfDay(now), to: endOfDay(now) });
    if (preset === 'yesterday') {
      const y = subDays(now, 1);
      return setDateRange({ from: startOfDay(y), to: endOfDay(y) });
    }
    if (preset === 'week') return setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
    if (preset === 'month') return setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    if (preset === 'lastMonth') {
      const last = subMonths(now, 1);
      return setDateRange({ from: startOfMonth(last), to: endOfMonth(last) });
    }
  };

  const form = useForm<CashTransactionFormValues>({
    resolver: zodResolver(cashTransactionSchema) as Resolver<CashTransactionFormValues>,
    defaultValues: { description: "", amount: undefined },
  });

  const handleTransactionSubmit = async (values: CashTransactionFormValues) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    try {
      await cashService.addCashTransaction({
        type: dialogType === 'Entrada' ? 'in' : 'out',
        amount: values.amount,
        concept: values.description,
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Sistema',
        relatedType: 'Manual',
        paymentMethod: 'Efectivo',
      });
      show({ title: `Se registró una ${dialogType.toLowerCase()} de caja.` });
      setIsDialogOpen(false);
    } catch {
      show({ title: 'Error', description: 'No se pudo registrar la transacción.', variant: 'destructive' });
    }
  };

  const handleSort = (key: string) => {
    const isAsc = sortOption === `${key}_asc`;
    setSortOption(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Corte de Caja</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setPresetRange('today')} className="bg-card">Hoy</Button>
          <Button variant="outline" size="sm" onClick={() => setPresetRange('yesterday')} className="bg-card">Ayer</Button>
          <Button variant="outline" size="sm" onClick={() => setPresetRange('week')} className="bg-card">Semana</Button>
          <Button variant="outline" size="sm" onClick={() => setPresetRange('month')} className="bg-card">Mes</Button>
          <Button variant="outline" size="sm" onClick={() => setPresetRange('lastMonth')} className="bg-card">Mes Pasado</Button>
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Entradas del Periodo</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(periodKPIs.income)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Salidas del Periodo</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(periodKPIs.outcome)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance del Periodo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(periodKPIs.net)}</div></CardContent>
        </Card>
        <Card className="shadow-lg bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efectivo en Caja (Real)</CardTitle>
            <Wallet className="h-4 w-4 text-primary"/>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", currentBalance >= 0 ? 'text-primary' : 'text-destructive')}>
              {formatCurrency(currentBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Flujo de Efectivo</CardTitle>
              <CardDescription>Movimientos detallados del periodo seleccionado.</CardDescription>
            </div>
            <div className="flex w-full sm:w-auto justify-end gap-2">
              <Button onClick={() => { setDialogType('Entrada'); setIsDialogOpen(true); }} variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50 bg-card">
                <ArrowUp className="mr-2 h-4 w-4" /> Registrar Entrada
              </Button>
              <Button onClick={() => { setDialogType('Salida'); setIsDialogOpen(true); }} variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50 bg-card">
                <ArrowDown className="mr-2 h-4 w-4" /> Registrar Salida
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-black">
                <TableRow className="hover:bg-transparent">
                  <SortableTableHeader sortKey="date" label="Fecha" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="type" label="Tipo" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="source" label="Origen" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="description" label="Concepto" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="amount" label="Monto" onSort={handleSort} currentSort={sortOption} className="text-right" textClassName="text-white" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {flowRows.length > 0 ? (
                  flowRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.date ? format(r.date, "dd MMM, HH:mm", { locale: es }) : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={r.type === 'Entrada' ? 'success' : 'destructive'}>
                          {r.type === 'Entrada' ? <ArrowRight className="h-3 w-3 mr-1" /> : <ArrowLeft className="h-3 w-3 mr-1" />}{r.type}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.source}</Badge></TableCell>
                      <TableCell className="max-w-[300px] truncate">{r.description}</TableCell>
                      <TableCell className={cn("text-right font-semibold", r.type === 'Entrada' ? 'text-green-600' : 'text-red-600')}>
                        {formatCurrency(r.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay movimientos en el periodo.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar {dialogType} Manual</DialogTitle>
            <DialogDescription>Añade un movimiento directo a la caja.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleTransactionSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concepto</FormLabel>
                    <FormControl><Textarea placeholder="Motivo del movimiento..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" step="0.01" className="pl-8" {...field} value={field.value ?? ""} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Registrar {dialogType}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
