"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, cn } from "@/lib/utils";
import { format, isValid, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Wallet, ArrowUpRight, ArrowDownRight, Search, PlusCircle, DollarSign, Receipt, Wrench, ShoppingCart } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { useTableManager } from '@/hooks/useTableManager';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import type { ServiceRecord, SaleReceipt, CashDrawerTransaction, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cashService } from '@/lib/services';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const transactionSchema = z.object({
  concept: z.string().min(3, "El concepto debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

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
  source: 'Compra' | 'Venta (PDV)' | 'Servicio' | 'Manual' | 'Flotilla';
  concept: string;
  method: string;
  amount: number;
  clientUser: string;
};

export default function DetallesReporteContent({ services, sales, cashTransactions, users }: DetallesReporteProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'Ingreso' | 'Egreso'>('Ingreso');

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { concept: "", amount: undefined },
  });

  const mergedMovements = useMemo(() => {
    const rows: ReportRow[] = [];

    // 1. Auditoría de Servicios: Solo entregados (dinero realizado)
    services.forEach(s => {
      if (s.status !== 'Entregado') return;
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

    // 2. Auditoría de Ventas PDV
    sales.forEach(s => {
      if (s.status !== 'Completado') return;
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

    // 3. Auditoría de Caja (Manuales, Compras, Flotilla)
    cashTransactions.forEach(t => {
      // Evitamos duplicar lo que ya viene de Servicios y Ventas por sus propias colecciones
      if (t.relatedType === 'Servicio' || t.relatedType === 'Venta') return;
      
      const d = parseDate(t.date);
      const isIncome = t.type === 'in' || t.type === 'Entrada';
      
      // Mapeo de origen según el relatedType de la caja
      let source: ReportRow['source'] = 'Manual';
      if (t.relatedType === 'Compra') source = 'Compra';
      if (t.relatedType === 'Flotilla') source = 'Flotilla';

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

  const { fullFilteredData, ...tableManager } = useTableManager<ReportRow>({
    initialData: mergedMovements,
    searchKeys: ['concept', 'clientUser', 'method', 'source'],
    dateFilterKey: 'date',
    initialSortOption: 'date_desc',
    initialDateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    itemsPerPage: 10000, // Desactivar paginación visualmente al mostrar todo
  });

  const kpis = useMemo(() => {
    const data = fullFilteredData;
    
    const ingresoTotal = data.filter(r => r.type === 'Ingreso').reduce((s, r) => s + r.amount, 0);
    const egresoTotal = data.filter(r => r.type === 'Egreso').reduce((s, r) => s + r.amount, 0);
    
    const efectivoIngresoPeriodo = data
      .filter(r => r.type === 'Ingreso' && r.method.toLowerCase().includes('efectivo'))
      .reduce((s, r) => s + r.amount, 0);
      
    const efectivoEgresoPeriodo = data
      .filter(r => r.type === 'Egreso' && r.method.toLowerCase().includes('efectivo'))
      .reduce((s, r) => s + r.amount, 0);

    return {
      ingresoTotal,
      egresoTotal,
      efectivoIngreso: efectivoIngresoPeriodo,
      balanceNeto: ingresoTotal - egresoTotal,
      efectivoDelPeriodo: efectivoIngresoPeriodo - efectivoEgresoPeriodo
    };
  }, [fullFilteredData]);

  const handleTransactionSubmit = async (values: TransactionFormValues) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    try {
      await cashService.addCashTransaction({
        type: dialogType === 'Ingreso' ? 'in' : 'out',
        amount: values.amount,
        concept: values.concept,
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Sistema',
        relatedType: 'Manual',
        paymentMethod: 'Efectivo',
      });
      toast({ title: `${dialogType} registrado con éxito.` });
      setIsDialogOpen(false);
      form.reset();
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo registrar el movimiento.', variant: 'destructive' });
    }
  };

  const handleSort = (key: string) => {
    const isAsc = tableManager.sortOption === `${key}_asc`;
    tableManager.onSortOptionChange(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  const setThisMonth = () => {
    const now = new Date();
    tableManager.onDateRangeChange({ from: startOfMonth(now), to: endOfMonth(now) });
  };

  const setLastMonth = () => {
    const last = subMonths(new Date(), 1);
    tableManager.onDateRangeChange({ from: startOfMonth(last), to: endOfMonth(last) });
  };

  return (
    <div className="space-y-6">
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
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Efectivo Periodo</CardTitle></CardHeader>
          <CardContent><div className={cn("text-xl font-bold flex items-center gap-2", kpis.efectivoDelPeriodo >= 0 ? "text-blue-700" : "text-destructive")}><Wallet className="h-4 w-4"/>{formatCurrency(kpis.efectivoDelPeriodo)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por concepto, cliente, origen o método..."
                  value={tableManager.searchTerm}
                  onChange={(e) => tableManager.onSearchTermChange(e.target.value)}
                  className="pl-8 bg-background"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto shrink-0">
                <Button onClick={() => { setDialogType('Ingreso'); setIsDialogOpen(true); }} variant="outline" size="sm" className="flex-1 md:flex-none text-green-600 border-green-600 hover:bg-green-50 bg-card">
                  <PlusCircle className="mr-2 h-4 w-4" /> Registrar Ingreso
                </Button>
                <Button onClick={() => { setDialogType('Egreso'); setIsDialogOpen(true); }} variant="outline" size="sm" className="flex-1 md:flex-none text-red-600 border-red-600 hover:bg-red-50 bg-card">
                  <PlusCircle className="mr-2 h-4 w-4" /> Registrar Egreso
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-center justify-end border-t pt-4">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={setThisMonth} className="flex-1 sm:flex-none bg-card">
                  Este Mes
                </Button>
                <Button variant="outline" size="sm" onClick={setLastMonth} className="flex-1 sm:flex-none bg-card">
                  Mes Pasado
                </Button>
              </div>
              <DatePickerWithRange date={tableManager.dateRange} onDateChange={tableManager.onDateRangeChange} />
            </div>
          </div>
        </CardContent>
      </Card>

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
                {fullFilteredData.length > 0 ? (
                  fullFilteredData.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.date ? format(r.date, 'dd/MM/yy HH:mm', { locale: es }) : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={r.type === 'Ingreso' ? 'success' : 'destructive'}>{r.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal flex items-center gap-1.5 w-fit">
                          {r.source === 'Servicio' && <Wrench className="h-3 w-3" />}
                          {r.source === 'Venta (PDV)' && <ShoppingCart className="h-3 w-3" />}
                          {r.source === 'Compra' && <Receipt className="h-3 w-3" />}
                          {r.source}
                        </Badge>
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
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar {dialogType} Manual</DialogTitle>
            <DialogDescription>Añade un movimiento directo al reporte financiero y caja.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleTransactionSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="concept"
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
