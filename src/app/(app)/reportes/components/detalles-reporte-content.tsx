
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, cn } from "@/lib/utils";
import { format, isValid, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Wallet, ArrowUpRight, ArrowDownRight, Scale, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { useTableManager } from '@/hooks/useTableManager';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import type { ServiceRecord, SaleReceipt, CashDrawerTransaction, User, PaymentMethod } from '@/types';

interface DetallesReporteProps {
  services: ServiceRecord[];
  sales: SaleReceipt[];
  cashTransactions: CashDrawerTransaction[];
  users: User[];
}

type ReportRow = {
  id: string;
  date: Date | null;
  type: 'Ingreso' | 'Egreso';
  source: 'Compra' | 'Venta (PDV)' | 'Servicio' | 'Manual';
  concept: string;
  method: string;
  amount: number;
  clientUser: string;
};

export default function DetallesReporteContent({ services, sales, cashTransactions, users }: DetallesReporteProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined }>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  const mergedMovements = useMemo(() => {
    const rows: ReportRow[] = [];

    // 1. Ingresos por Servicios
    services.forEach(s => {
      if (s.status === 'Cancelado') return;
      const d = parseDate(s.deliveryDateTime || s.serviceDate);
      const amount = Number(s.totalCost) || 0;
      if (amount <= 0) return;

      const methods = s.payments?.map(p => p.method).join(' / ') || (s as any).paymentMethod || 'Efectivo';

      rows.push({
        id: `svc-${s.id}`,
        date: d,
        type: 'Ingreso',
        source: 'Servicio',
        concept: `Servicio #${s.folio || s.id.slice(-6)} - ${s.vehicleIdentifier || 'Vehículo'}`,
        method: methods,
        amount: amount,
        clientUser: s.customerName || 'Cliente',
      });
    });

    // 2. Ingresos por Ventas (PDV)
    sales.forEach(s => {
      if (s.status === 'Cancelado') return;
      const d = parseDate(s.saleDate);
      const amount = Number(s.totalAmount) || 0;
      if (amount <= 0) return;

      const methods = s.payments?.map(p => p.method).join(' / ') || (s as any).paymentMethod || 'Efectivo';

      rows.push({
        id: `sale-${s.id}`,
        date: d,
        type: 'Ingreso',
        source: 'Venta (PDV)',
        concept: `Venta Mostrador #${s.id.slice(-6)}`,
        method: methods,
        amount: amount,
        clientUser: s.customerName || 'Cliente Mostrador',
      });
    });

    // 3. Movimientos de Caja (Filtrando duplicados de servicios/ventas para Reportes pero manteniendo Manuales y Compras)
    cashTransactions.forEach(t => {
      const d = parseDate(t.date);
      // Evitamos duplicar ingresos de servicios/ventas que ya procesamos arriba con más detalle
      if (t.relatedType === 'Servicio' || t.relatedType === 'Venta') return;

      const isIncome = t.type === 'in' || t.type === 'Entrada';
      const source = t.relatedType === 'Compra' ? 'Compra' : 'Manual';

      rows.push({
        id: `ledger-${t.id}`,
        date: d,
        type: isIncome ? 'Ingreso' : 'Egreso',
        source: source,
        concept: t.concept || t.description || 'Movimiento de Caja',
        method: t.paymentMethod || 'Efectivo',
        amount: Math.abs(t.amount),
        clientUser: t.userName || 'Sistema',
      });
    });

    return rows;
  }, [services, sales, cashTransactions]);

  const { paginatedData, fullFilteredData, ...tableManager } = useTableManager<ReportRow>({
    initialData: mergedMovements,
    searchKeys: ['concept', 'clientUser', 'method', 'source'],
    dateFilterKey: 'date',
    initialSortOption: 'date_desc',
    initialDateRange: dateRange,
  });

  const kpis = useMemo(() => {
    const data = fullFilteredData;
    const ingresoTotal = data.filter(r => r.type === 'Ingreso').reduce((s, r) => s + r.amount, 0);
    const egresoTotal = data.filter(r => r.type === 'Egreso').reduce((s, r) => s + r.amount, 0);
    
    // Ingresos en efectivo (del periodo filtrado)
    const efectivoIngreso = data.filter(r => r.type === 'Ingreso' && r.method.includes('Efectivo')).reduce((s, r) => s + r.amount, 0);
    
    // Efectivo Actual (Saldo total de la caja, ignorando el filtro de fecha del reporte para saber qué hay HOY)
    const allCashIn = cashTransactions.filter(t => (t.type === 'in' || t.type === 'Entrada') && (t.paymentMethod === 'Efectivo' || !t.paymentMethod)).reduce((s, t) => s + t.amount, 0);
    const allCashOut = cashTransactions.filter(t => (t.type === 'out' || t.type === 'Salida') && (t.paymentMethod === 'Efectivo' || !t.paymentMethod)).reduce((s, t) => s + t.amount, 0);

    return {
      ingresoTotal,
      egresoTotal,
      efectivoIngreso,
      balanceNeto: ingresoTotal - egresoTotal,
      efectivoActual: allCashIn - allCashOut
    };
  }, [fullFilteredData, cashTransactions]);

  const handleSort = (key: string) => {
    const isAsc = tableManager.sortOption === `${key}_asc`;
    tableManager.onSortOptionChange(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Ingreso Efectivo</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold text-green-600">{formatCurrency(kpis.efectivoIngreso)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Ingreso Total</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-green-500"/>{formatCurrency(kpis.ingresoTotal)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Egreso Total</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-red-500"/>{formatCurrency(kpis.egresoTotal)}</div></CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Balance Neto</CardTitle></CardHeader>
          <CardContent><div className={cn("text-xl font-bold", kpis.balanceNeto >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(kpis.balanceNeto)}</div></CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Efectivo Actual</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold text-blue-700 flex items-center gap-2"><Wallet className="h-4 w-4"/>{formatCurrency(kpis.efectivoActual)}</div></CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por concepto, cliente..."
              value={tableManager.searchTerm}
              onChange={(e) => tableManager.onSearchTermChange(e.target.value)}
              className="pl-8 bg-background"
            />
          </div>
          <DatePickerWithRange date={tableManager.dateRange} onDateChange={tableManager.onDateRangeChange} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <SortableTableHeader sortKey="date" label="Fecha" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="type" label="Tipo" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="source" label="Origen" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="concept" label="Concepto" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="method" label="Método Pago" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="amount" label="Monto" onSort={handleSort} currentSort={tableManager.sortOption} className="text-right" textClassName="text-white" />
                  <SortableTableHeader sortKey="clientUser" label="Cliente/Usuario" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.date ? format(r.date, 'dd/MM/yy HH:mm', { locale: es }) : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={r.type === 'Ingreso' ? 'success' : 'destructive'}>{r.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{r.source}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate font-medium" title={r.concept}>{r.concept}</TableCell>
                      <TableCell className="text-xs">{r.method}</TableCell>
                      <TableCell className={cn("text-right font-bold", r.type === 'Ingreso' ? "text-green-600" : "text-red-600")}>
                        {r.type === 'Ingreso' ? '+' : '-'} {formatCurrency(r.amount)}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[150px]">{r.clientUser}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No se encontraron movimientos en este periodo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 flex items-center justify-between border-t">
            <p className="text-xs text-muted-foreground">{tableManager.paginationSummary}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={tableManager.goToPreviousPage} disabled={!tableManager.canGoPrevious}><ChevronLeft className="h-4 w-4"/></Button>
              <Button size="sm" variant="outline" onClick={tableManager.goToNextPage} disabled={!tableManager.canGoNext}><ChevronRight className="h-4 w-4"/></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
