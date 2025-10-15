// src/app/(app)/finanzas/components/caja-content.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SaleReceipt, ServiceRecord, CashDrawerTransaction, Payment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from "@/lib/utils";
import { format, isValid, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, compareAsc } from 'date-fns';
import { es } from 'date-fns/locale';
import { DollarSign, ArrowDown, ArrowUp, Loader2, Wallet, CreditCard, Landmark, ArrowLeft, ArrowRight } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cashService, saleService, serviceService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';


interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

const cashTransactionSchema = z.object({
  description: z.string().min(3, "La descripción debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});
type CashTransactionFormValues = z.infer<typeof cashTransactionSchema>;

type EnhancedCashDrawerTransaction = CashDrawerTransaction & {
  fullDescription?: string;
};

const methodIcon: Record<NonNullable<Payment["method"]>, React.ElementType> = {
  Efectivo: Wallet,
  Tarjeta: CreditCard,
  "Tarjeta MSI": CreditCard,
  Transferencia: Landmark,
};

// helpers
const getPaymentDate = (p: Payment) =>
  parseDate((p as any).date || (p as any).paidAt || (p as any).createdAt);

const getAdvisorForService = (s: ServiceRecord): string => {
  const anyS = s as any;
  return (
    anyS.deliveredByName ||
    anyS.statusHistory?.find((h: any) => h?.status === "Entregado")?.userName ||
    anyS.advisorName ||
    anyS.assignedToName ||
    anyS.technicianName ||
    s.customerName ||
    "N/A"
  );
};

type FlowRow = {
  id: string;
  date: Date | null;
  type: 'Entrada' | 'Salida';
  source: 'Venta' | 'Servicio' | 'Libro';
  relatedType?: 'Venta' | 'Servicio' | 'Manual';
  refId?: string;         // para navegar si aplica
  user: string;           // asesor/cliente/usuario
  description: string;
  amount: number;         // positivo para UI
  method?: Payment['method']; // solo pagos
};

export default function CajaContent() {
  const { toast } = useToast();
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [sortOption, setSortOption] = useState('date_desc');

  // diálogo registrar manual
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'Entrada' | 'Salida'>('Entrada');

  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [];
    try {
      unsubs.push(cashService.onCashTransactionsUpdate((tx) => setCashTransactions(tx)));
      unsubs.push(saleService.onSalesUpdate((s) => setAllSales(s)));
      unsubs.push(serviceService.onServicesUpdate((s) => setAllServices(s)));
    } finally {
      setIsLoading(false);
    }
    return () => unsubs.forEach(u => u());
  }, []);

  const range = useMemo(() => {
    if (!dateRange?.from) return null;
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
    return { from, to };
  }, [dateRange]);

  // Pagos en EFECTIVO (ventas/servicios)
  const cashPayments = useMemo(() => {
    const rows: FlowRow[] = [];

    // Servicios
    for (const s of allServices) {
      if (s.status === 'Cancelado' || s.status === 'Cotizacion') continue;
      const pays = (s as any).payments as Payment[] | undefined;
      if (!Array.isArray(pays)) continue;
      const advisor = getAdvisorForService(s);
      pays.forEach((p, idx) => {
        if (p?.method !== 'Efectivo' || typeof p.amount !== 'number') return;
        const d = getPaymentDate(p) || parseDate(s.deliveryDateTime) || parseDate(s.serviceDate);
        const amt = Number(p.amount) || 0;
        rows.push({
          id: `${s.id}-svc-cash-${idx}`,
          date: d || null,
          type: amt >= 0 ? 'Entrada' : 'Salida',
          source: 'Servicio',
          relatedType: 'Servicio',
          refId: s.id,
          user: advisor,
          description: amt >= 0 ? `Pago efectivo (Servicio #${(s.folio || s.id).slice(-6)})` : `Reembolso efectivo (Servicio #${(s.folio || s.id).slice(-6)})`,
          amount: Math.abs(amt),
          method: p.method,
        });
      });
    }

    // Ventas
    for (const s of allSales) {
      if (s.status === 'Cancelado') continue;
      const pays = (s as any).payments as Payment[] | undefined;
      if (!Array.isArray(pays)) continue;
      const client = s.customerName || 'Cliente Mostrador';
      pays.forEach((p, idx) => {
        if (p?.method !== 'Efectivo' || typeof p.amount !== 'number') return;
        const d = getPaymentDate(p) || parseDate(s.saleDate);
        const amt = Number(p.amount) || 0;
        rows.push({
          id: `${s.id}-sale-cash-${idx}`,
          date: d || null,
          type: amt >= 0 ? 'Entrada' : 'Salida',
          source: 'Venta',
          relatedType: 'Venta',
          refId: s.id,
          user: client,
          description: amt >= 0 ? `Pago efectivo (Venta #${s.id.slice(-6)})` : `Reembolso efectivo (Venta #${s.id.slice(-6)})`,
          amount: Math.abs(amt),
          method: p.method,
        });
      });
    }

    return rows;
  }, [allSales, allServices]);

  // Libro (entradas/salidas) - SOLO MANUALES
  const ledgerRows = useMemo((): FlowRow[] => {
    return (cashTransactions || [])
      .filter(t => t.relatedType === 'Manual')
      .map((t) => {
      const d = parseDate((t as any).date || (t as any).createdAt) || null;
      const user = (t as any).userName || (t as any).user || 'Sistema';
      const desc = (t as any).fullDescription || t.description || (t as any).concept || '';
      return {
        id: t.id,
        date: d,
        type: t.type === 'Entrada' ? 'Entrada' : 'Salida',
        source: 'Libro',
        relatedType: (t as any).relatedType || 'Manual',
        refId: (t as any).relatedId,
        user,
        description: desc,
        amount: Math.abs(Number(t.amount) || 0),
      };
    });
  }, [cashTransactions]);

  // Filtrado por rango + combinación
  const flowRows = useMemo(() => {
    if (!range) return [];
    const inRange = (d: Date | null) => d && isValid(d) && isWithinInterval(d, { start: range.from, end: range.to });
    
    // CORRECCIÓN: Filtra cashTransactions para no incluir los que ya están representados por cashPayments
    const filteredCashTransactions = cashTransactions.filter(t => t.relatedType !== 'Venta' && t.relatedType !== 'Servicio');

    const ledgerRows: FlowRow[] = filteredCashTransactions
      .map((t) => {
        const d = parseDate((t as any).date || (t as any).createdAt) || null;
        const user = (t as any).userName || (t as any).user || 'Sistema';
        const desc = (t as any).fullDescription || t.description || (t as any).concept || '';
        return {
          id: t.id, date: d, type: t.type, source: 'Libro',
          relatedType: (t as any).relatedType || 'Manual', refId: (t as any).relatedId,
          user, description: desc, amount: Math.abs(Number(t.amount) || 0),
        };
    });

    const rows = [...cashPayments, ...ledgerRows].filter(r => inRange(r.date || null));

    const [key, direction] = sortOption.split('_');
    return rows.sort((a: any, b: any) => {
      const valA = a[key] ?? '';
      const valB = b[key] ?? '';

      if (key === 'date') {
        const dateA = valA instanceof Date ? valA.getTime() : 0;
        const dateB = valB instanceof Date ? valB.getTime() : 0;
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      const cmp = String(valA).localeCompare(String(valB), 'es', { numeric: true });
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [cashPayments, cashTransactions, range, sortOption]);

  // KPI superiores y Conciliación corregida
  const kpis = useMemo(() => {
    // Detectadas por pagos en efectivo
    const detectedIn = flowRows.filter(r => r.source !== 'Libro' && r.type === 'Entrada').reduce((s, r) => s + r.amount, 0);
    const detectedOut = flowRows.filter(r => r.source !== 'Libro' && r.type === 'Salida').reduce((s, r) => s + r.amount, 0);

    // Libro
    const ledgerIn = flowRows.filter(r => r.source === 'Libro' && r.type === 'Entrada').reduce((s, r) => s + r.amount, 0);
    const ledgerOut = flowRows.filter(r => r.source === 'Libro' && r.type === 'Salida').reduce((s, r) => s + r.amount, 0);

    // Tarjetas superiores: Ingresos = pagos efectivo detectados + entradas libro; Egresos = salidas libro
    const topIncome = detectedIn + ledgerIn;
    const topOutcome = detectedOut + ledgerOut;
    const topNet = topIncome - topOutcome;

    return { topIncome, topOutcome, topNet };
  }, [flowRows]);

  // abrir ref
  const openRef = (row: FlowRow) => {
    if (row.source === 'Venta' && row.refId) window.open(`/pos?saleId=${row.refId}`, '_blank');
    if (row.source === 'Servicio' && row.refId) window.open(`/servicios/${row.refId}`, '_blank');
  };

  // acciones rápidas rango
  const setPresetRange = (preset: 'today' | 'yesterday' | 'week' | 'month') => {
    const now = new Date();
    if (preset === 'today') return setDateRange({ from: startOfDay(now), to: endOfDay(now) });
    if (preset === 'yesterday') {
      const y = subDays(now, 1);
      return setDateRange({ from: startOfDay(y), to: endOfDay(y) });
    }
    if (preset === 'week') return setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
    if (preset === 'month') return setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
  };

  // registrar manual
  const form = useForm<CashTransactionFormValues>({ resolver: zodResolver(cashTransactionSchema) });
  const handleOpenDialog = (type: 'Entrada' | 'Salida') => { setDialogType(type); form.reset(); setIsDialogOpen(true); };
  const { toast: show } = useToast();
  const handleTransactionSubmit = async (values: CashTransactionFormValues) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    try {
      await cashService.addCashTransaction({
        type: dialogType,
        amount: values.amount,
        description: values.description,
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Sistema',
        relatedType: 'Manual',
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

  if (!range || isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Caja</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setPresetRange('today')} className="bg-card">Hoy</Button>
          <Button variant="outline" size="sm" onClick={() => setPresetRange('yesterday')} className="bg-card">Ayer</Button>
          <Button variant="outline" size="sm" onClick={() => setPresetRange('week')} className="bg-card">Semana</Button>
          <Button variant="outline" size="sm" onClick={() => setPresetRange('month')} className="bg-card">Mes</Button>
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
        </div>
      </div>

      {/* KPI superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Entradas Totales (Efectivo)</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(kpis.topIncome)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Salidas Totales (Libro)</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(kpis.topOutcome)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance del Periodo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(kpis.topNet)}</div></CardContent>
        </Card>
      </div>

      {/* Tabla ÚNICA: Flujo de Caja */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Flujo de Caja (Efectivo)</CardTitle>
            {/* Acciones rápidas */}
            <div className="flex justify-end gap-2">
              <Button onClick={() => handleOpenDialog('Entrada')} variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 bg-card">
                <ArrowUp className="mr-2 h-4 w-4" /> Registrar Entrada
              </Button>
              <Button onClick={() => handleOpenDialog('Salida')} variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700 bg-card">
                <ArrowDown className="mr-2 h-4 w-4" /> Registrar Salida
              </Button>
            </div>
          </div>
          <CardDescription>Pagos en efectivo de Ventas/Servicios y movimientos del Libro del periodo.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableTableHeader sortKey="date" label="Fecha" onSort={handleSort} currentSort={sortOption} />
                  <SortableTableHeader sortKey="type" label="Tipo" onSort={handleSort} currentSort={sortOption} />
                  <SortableTableHeader sortKey="source" label="Origen" onSort={handleSort} currentSort={sortOption} />
                  <SortableTableHeader sortKey="refId" label="Folio/Ref." onSort={handleSort} currentSort={sortOption} />
                  <SortableTableHeader sortKey="user" label="Usuario / Asesor" onSort={handleSort} currentSort={sortOption} />
                  <SortableTableHeader sortKey="description" label="Descripción" onSort={handleSort} currentSort={sortOption} />
                  <SortableTableHeader sortKey="amount" label="Monto" onSort={handleSort} currentSort={sortOption} className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {flowRows.length > 0 ? (
                  flowRows.map((r) => {
                    const Icon = r.method ? methodIcon[r.method] : undefined;
                    const clickable = (r.source === 'Venta' || r.source === 'Servicio') && r.refId;
                    return (
                      <TableRow key={r.id} onClick={() => clickable && openRef(r)} className={clickable ? "cursor-pointer hover:bg-muted/50" : ""}>
                        <TableCell>{r.date && isValid(r.date) ? format(r.date, "dd MMM, HH:mm", { locale: es }) : 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={r.type === 'Entrada' ? 'success' : 'destructive'}>
                            {r.type === 'Entrada' ? <ArrowRight className="h-3 w-3 mr-1" /> : <ArrowLeft className="h-3 w-3 mr-1" />}{r.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.source === 'Venta' ? 'secondary' : r.source === 'Servicio' ? 'outline' : 'default'}>
                            {r.source === 'Libro' ? (r.relatedType || 'Libro') : r.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.refId ? String(r.refId).slice(-6) : '—'}</TableCell>
                        <TableCell>{r.user}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            {Icon && <Icon className="h-3 w-3 opacity-70" />}
                            {r.description}
                          </span>
                        </TableCell>
                        <TableCell className={cn("text-right font-semibold", r.type === 'Entrada' ? 'text-green-600' : 'text-red-600')}>
                          {formatCurrency(r.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">No hay movimientos de caja en el periodo.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo registrar manual */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Registrar {dialogType} de Caja</DialogTitle>
            <DialogDescription>Añade una descripción y monto para registrar el movimiento.</DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleTransactionSubmit)} id="cash-transaction-form" className="space-y-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl><Textarea placeholder={dialogType === 'Entrada' ? 'Ej: Fondo inicial' : 'Ej: Compra de insumos'} {...field} /></FormControl>
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
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="pl-8" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
          <DialogFooter className="p-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" form="cash-transaction-form" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : `Registrar ${dialogType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
