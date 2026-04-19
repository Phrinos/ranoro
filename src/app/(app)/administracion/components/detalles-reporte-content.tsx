// src/app/(app)/administracion/components/detalles-reporte-content.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { formatCurrency, cn } from '@/lib/utils';
import { format, isValid, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, Search, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import type { ServiceRecord, SaleReceipt, CashDrawerTransaction, User } from '@/types';

interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

function parseAnyDate(v: any): Date | null {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  const d = typeof v === 'string' ? parseISO(v) : new Date(v);
  return isValid(d) ? d : null;
}

interface Props {
  services: ServiceRecord[];
  sales: SaleReceipt[];
  cashTransactions: CashDrawerTransaction[];
  users: User[];
  purchases?: any[];
}

type TransactionRow = {
  id: string;
  date: Date;
  type: 'Servicio' | 'Venta' | 'Entrada' | 'Salida' | 'Compra';
  description: string;
  amount: number;
  isIncome: boolean;
};

export default function DetallesReporteContent({ services, sales, cashTransactions, users, purchases = [] }: Props) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  }));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');

  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    users.forEach(u => m.set(u.id, u.name));
    return m;
  }, [users]);

  const transactions = useMemo<TransactionRow[]>(() => {
    if (!dateRange?.from) return [];
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
    const interval = { start: from, end: to };

    const inInterval = (v: any) => {
      const d = parseAnyDate(v);
      return d && isValid(d) && isWithinInterval(d, interval);
    };

    const rows: TransactionRow[] = [];

    // Services
    services
      .filter(s => s.status === 'Entregado' && inInterval((s as any).deliveryDateTime ?? (s as any).completedAt ?? (s as any).createdAt))
      .forEach(s => {
        const d = parseAnyDate((s as any).deliveryDateTime ?? (s as any).completedAt ?? (s as any).createdAt)!;
        rows.push({
          id: (s as any).id,
          date: d,
          type: 'Servicio',
          description: `Orden #${(s as any).folio ?? (s as any).id?.slice(0,8)} — ${(s as any).vehiclePlate ?? ''}`,
          amount: Number((s as any).totalCost ?? (s as any).total ?? 0),
          isIncome: true,
        });
      });

    // POS Sales
    sales
      .filter(s => s.status === 'Completado' && inInterval((s as any).saleDate))
      .forEach(s => {
        const d = parseAnyDate((s as any).saleDate)!;
        rows.push({
          id: (s as any).id,
          date: d,
          type: 'Venta',
          description: `Venta PDV — ${s.customerName ?? 'Cliente Mostrador'}`,
          amount: s.totalAmount ?? 0,
          isIncome: true,
        });
      });

    // Cash transactions
    cashTransactions
      .filter(t => inInterval(t.date))
      .forEach(t => {
        const d = parseAnyDate(t.date)!;
        const isIncome = t.type === 'Entrada' || t.type === 'in';
        rows.push({
          id: (t as any).id ?? Math.random().toString(),
          date: d,
          type: isIncome ? 'Entrada' : 'Salida',
          description: t.description ?? (isIncome ? 'Entrada de caja' : 'Salida de caja'),
          amount: Number(t.amount ?? 0),
          isIncome,
        });
      });

    // Purchases
    purchases
      .filter(p => inInterval(p.invoiceDate ?? p.purchaseDate))
      .forEach(p => {
        const d = parseAnyDate(p.invoiceDate ?? p.purchaseDate)!;
        rows.push({
          id: p.id ?? Math.random().toString(),
          date: d,
          type: 'Compra',
          description: `Compra — ${p.supplierName ?? 'Proveedor'} ${p.invoiceId ? `#${p.invoiceId}` : ''}`,
          amount: p.invoiceTotal ?? p.total ?? 0,
          isIncome: false,
        });
      });

    return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [dateRange, services, sales, cashTransactions, purchases]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter(t => {
      const matchType = typeFilter === 'todos' || t.type === typeFilter;
      const matchSearch = !q || t.description.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [transactions, search, typeFilter]);

  const totals = useMemo(() => {
    const income = filtered.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  const typeColors: Record<string, string> = {
    Servicio: 'bg-blue-100 text-blue-800',
    Venta: 'bg-purple-100 text-purple-800',
    Entrada: 'bg-emerald-100 text-emerald-800',
    Salida: 'bg-red-100 text-red-800',
    Compra: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-black text-emerald-600">{formatCurrency(totals.income)}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Ingresos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-black text-red-600">{formatCurrency(totals.expense)}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5 flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Egresos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className={cn("text-2xl font-black", totals.net >= 0 ? "text-emerald-600" : "text-red-600")}>{formatCurrency(totals.net)}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5 flex items-center gap-1"><ArrowUpDown className="h-3 w-3" /> Neto</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Movimientos</CardTitle>
          <CardDescription>{filtered.length} registro(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Servicio">Servicios</SelectItem>
                <SelectItem value="Venta">Ventas PDV</SelectItem>
                <SelectItem value="Entrada">Entradas</SelectItem>
                <SelectItem value="Salida">Salidas</SelectItem>
                <SelectItem value="Compra">Compras</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Sin registros para el período seleccionado.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((row, i) => (
                  <TableRow key={`${row.id}-${i}`}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(row.date, "dd MMM, HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", typeColors[row.type] ?? "bg-muted text-muted-foreground")}>
                        {row.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{row.description}</TableCell>
                    <TableCell className={cn("text-right font-semibold text-sm", row.isIncome ? "text-emerald-600" : "text-red-600")}>
                      {row.isIncome ? '+' : '-'}{formatCurrency(row.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
