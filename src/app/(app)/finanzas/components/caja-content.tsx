// src/app/(app)/finanzas/components/caja-content.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { DateRange } from "react-day-picker";
import type { SaleReceipt, ServiceRecord, CashDrawerTransaction, Payment, WorkshopInfo } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from "@/lib/utils";
import { format, isValid, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
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

const cashTransactionSchema = z.object({
  description: z.string().min(3, "La descripción debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});
type CashTransactionFormValues = z.infer<typeof cashTransactionSchema>;

type EnhancedCashDrawerTransaction = CashDrawerTransaction & {
  fullDescription?: string;
};

// === helpers ===
const getPaymentDate = (p: Payment) =>
  parseDate((p as any).date || (p as any).paidAt || (p as any).createdAt);

const methodIcon: Record<NonNullable<Payment["method"]>, React.ElementType> = {
  Efectivo: Wallet,
  Tarjeta: CreditCard,
  "Tarjeta MSI": CreditCard,
  Transferencia: Landmark,
};

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

export default function CajaContent() {
  const { toast } = useToast();
  const router = useRouter();

  // rango por defecto = mes
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [sortOptionLedger, setSortOptionLedger] = useState('date_desc');

  // diálogo de registro manual
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

  // pagos en EFECTIVO detectados (ventas + servicios), positivos = entradas, negativos = reembolsos (salidas)
  const detectedCashPayments = useMemo(() => {
    const items: {
      id: string;
      date: Date | null;
      type: 'Venta' | 'Servicio';
      refId: string;
      user: string;           // cliente o asesor
      method: Payment['method'];
      amount: number;         // siempre ABS
      isRefund: boolean;
      description: string;
    }[] = [];

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
        const isRefund = amt < 0;
        items.push({
          id: `${s.id}-svc-cash-${idx}`,
          date: d || null,
          type: 'Servicio',
          refId: s.id,
          user: advisor,
          method: p.method,
          amount: Math.abs(amt),
          isRefund,
          description: isRefund ? 'Reembolso efectivo (Servicio)' : 'Pago efectivo (Servicio)',
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
        const isRefund = amt < 0;
        items.push({
          id: `${s.id}-sale-cash-${idx}`,
          date: d || null,
          type: 'Venta',
          refId: s.id,
          user: client,
          method: p.method,
          amount: Math.abs(amt),
          isRefund,
          description: isRefund ? 'Reembolso efectivo (Venta)' : 'Pago efectivo (Venta)',
        });
      });
    }

    return items;
  }, [allSales, allServices]);

  // --- Filtrado por periodo
  const range = useMemo(() => {
    if (!dateRange?.from) return null;
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
    return { from, to };
  }, [dateRange]);

  const paymentsInRange = useMemo(() => {
    if (!range) return [];
    return detectedCashPayments
      .filter(x => x.date && isValid(x.date) && isWithinInterval(x.date!, { start: range.from, end: range.to }))
      .sort((a,b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
  }, [detectedCashPayments, range]);

  const ledgerInRange = useMemo(() => {
    if (!range) return [];
    // normalizamos descripción legacy
    return cashTransactions
      .map(t => ({ ...t, fullDescription: (t as any).fullDescription || t.description, description: t.description || (t as any).concept }))
      .filter(t => {
        const d = parseDate((t as any).date || (t as any).createdAt);
        return d && isValid(d) && isWithinInterval(d, { start: range.from, end: range.to });
      })
      .sort((a, b) => {
        const [key, direction] = sortOptionLedger.split('_');
        const va = (a as any)[key] ?? '';
        const vb = (b as any)[key] ?? '';
        const cmp = String(va).localeCompare(String(vb), 'es', { numeric: true });
        return direction === 'asc' ? cmp : -cmp;
      });
  }, [cashTransactions, range, sortOptionLedger]);

  // --- Totales (KPI superiores y conciliación)
  const kpis = useMemo(() => {
    const detectedIn = paymentsInRange.filter(p => !p.isRefund).reduce((s, p) => s + p.amount, 0);
    const detectedOut = paymentsInRange.filter(p => p.isRefund).reduce((s, p) => s + p.amount, 0);

    const ledgerIn = ledgerInRange.filter(t => t.type === 'Entrada').reduce((s, t) => s + (t.amount || 0), 0);
    const ledgerOut = ledgerInRange.filter(t => t.type === 'Salida').reduce((s, t) => s + (t.amount || 0), 0);

    // Tarjetas superiores según requerimiento:
    // - mostrar entradas = pagos en efectivo detectados
    // - mostrar egresos = salidas del libro
    // - balance = entradas detectadas - salidas libro
    const topIncome = detectedIn;
    const topOutcome = ledgerOut;
    const topNet = topIncome - topOutcome;

    // Conciliación (Libro - Detectadas), netos:
    const ledgerNet = ledgerIn - ledgerOut;
    const detectedNet = detectedIn - detectedOut;
    const diff = ledgerNet - detectedNet;

    return {
      detectedIn, detectedOut, ledgerIn, ledgerOut, topIncome, topOutcome, topNet, ledgerNet, detectedNet, diff
    };
  }, [paymentsInRange, ledgerInRange]);

  // --- diálogo registrar movimiento manual
  const form = useForm<CashTransactionFormValues>({ resolver: zodResolver(cashTransactionSchema) });

  const handleOpenDialog = (type: 'Entrada' | 'Salida') => {
    setDialogType(type);
    form.reset();
    setIsDialogOpen(true);
  };

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
      toast({ title: `Se registró una ${dialogType.toLowerCase()} de caja.` });
      setIsDialogOpen(false);
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo registrar la transacción.', variant: 'destructive' });
    }
  };

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

  const handleSortLedger = (key: string) => {
    const isAsc = sortOptionLedger === `${key}_asc`;
    setSortOptionLedger(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  const openRef = (row: { type: 'Venta'|'Servicio'; refId: string }) => {
    if (row.type === 'Venta') window.open(`/pos?saleId=${row.refId}`, '_blank');
    else window.open(`/servicios/${row.refId}`, '_blank');
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

      {/* KPI superiores (entradas = pagos efectivo detectados, egresos = salidas libro) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Entradas Totales (Pagos en Efectivo)</CardTitle>
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

      {/* Conciliación de Caja (Efectivo) */}
      <Card>
        <CardHeader>
          <CardTitle>Conciliación de Caja (Efectivo)</CardTitle>
          <CardDescription>Compara el libro de caja contra los pagos en efectivo registrados en Ventas/Servicios por fecha de pago.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-md border">
              <p className="text-sm text-muted-foreground">Entradas detectadas (pagos en efectivo)</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(kpis.detectedIn)}</p>
            </div>
            <div className="p-3 rounded-md border">
              <p className="text-sm text-muted-foreground">Salidas detectadas (reembolsos/ajustes en efectivo)</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(kpis.detectedOut)}</p>
            </div>
            <div className="p-3 rounded-md border">
              <p className="text-sm text-muted-foreground">Diferencia (Libro − Detectadas)</p>
              <p className={cn("text-2xl font-bold", kpis.diff >= 0 ? "text-green-600" : "text-orange-500")}>
                {formatCurrency(kpis.diff)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Libro: {formatCurrency(kpis.ledgerNet)} vs Detectadas: {formatCurrency(kpis.detectedNet)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones rápidas */}
      <div className="flex justify-end gap-2">
        <Button onClick={() => handleOpenDialog('Entrada')} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 bg-card">
          <ArrowUp className="mr-2 h-4 w-4" /> Registrar Entrada
        </Button>
        <Button onClick={() => handleOpenDialog('Salida')} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700 bg-card">
          <ArrowDown className="mr-2 h-4 w-4" /> Registrar Salida
        </Button>
      </div>

      {/* Tabla: Pagos en efectivo detectados (ventas/servicios) */}
      <Card>
        <CardHeader>
          <CardTitle>Pagos en Efectivo Detectados (Ventas / Servicios)</CardTitle>
          <CardDescription>Por fecha de pago. Haz clic para abrir el movimiento original.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="font-medium">Fecha</TableCell>
                  <TableCell className="font-medium">Tipo</TableCell>
                  <TableCell className="font-medium">Folio/Ref.</TableCell>
                  <TableCell className="font-medium">Cliente / Asesor</TableCell>
                  <TableCell className="font-medium">Descripción</TableCell>
                  <TableCell className="font-medium text-right">Monto</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsInRange.length > 0 ? (
                  paymentsInRange.map((p) => {
                    const Icon = p.method ? methodIcon[p.method] : undefined;
                    return (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openRef({ type: p.type, refId: p.refId })}>
                        <TableCell>{p.date && isValid(p.date) ? format(p.date, "dd MMM, HH:mm", { locale: es }) : 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={p.type === 'Venta' ? 'secondary' : 'outline'}>
                            {p.type === 'Venta' ? 'Venta' : 'Servicio'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.refId.slice(-6)}</TableCell>
                        <TableCell>{p.user}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            {Icon && <Icon className="h-3 w-3 opacity-70" />} {p.description}
                          </span>
                        </TableCell>
                        <TableCell className={cn("text-right font-semibold", p.isRefund ? "text-red-600" : "text-green-600")}>
                          {formatCurrency(p.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No se detectaron pagos en efectivo en el periodo.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tabla: Libro de caja (sólo ledger) */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Caja del Periodo (Libro)</CardTitle>
          <CardDescription>Todos los asientos del libro de caja (entradas/salidas manuales o vinculadas).</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHeader sortKey="date" label="Hora" onSort={handleSortLedger} currentSort={sortOptionLedger} />
                  <SortableTableHeader sortKey="type" label="Tipo" onSort={handleSortLedger} currentSort={sortOptionLedger} />
                  <SortableTableHeader sortKey="relatedType" label="Origen" onSort={handleSortLedger} currentSort={sortOptionLedger} />
                  <SortableTableHeader sortKey="relatedId" label="ID Movimiento/Folio" onSort={handleSortLedger} currentSort={sortOptionLedger} />
                  <SortableTableHeader sortKey="description" label="Descripción" onSort={handleSortLedger} currentSort={sortOptionLedger} />
                  <SortableTableHeader sortKey="userName" label="Usuario" onSort={handleSortLedger} currentSort={sortOptionLedger} />
                  <SortableTableHeader sortKey="amount" label="Monto" onSort={handleSortLedger} currentSort={sortOptionLedger} className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerInRange.length > 0 ? (
                  ledgerInRange.map((m: EnhancedCashDrawerTransaction) => {
                    const d = parseDate((m as any).date || (m as any).createdAt);
                    return (
                      <TableRow key={m.id} className={m.relatedId ? "cursor-pointer hover:bg-muted/50" : ""}>
                        <TableCell>{d && isValid(d) ? format(d, "dd MMM, HH:mm", { locale: es }) : 'N/A'}</TableCell>
                        <TableCell><Badge variant={m.type === 'Entrada' ? 'success' : 'destructive'}>{m.type}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{m.relatedType || 'Manual'}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{m.relatedId ? String(m.relatedId).slice(-6) : m.id.slice(-6)}</TableCell>
                        <TableCell className="max-w-[280px] truncate">{(m as any).fullDescription || m.description}</TableCell>
                        <TableCell>{(m as any).userName || (m as any).user || 'Sistema'}</TableCell>
                        <TableCell className={cn("text-right font-semibold", m.type === 'Entrada' ? 'text-green-600' : 'text-red-600')}>
                          {formatCurrency(m.amount || 0)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">No hay movimientos de caja para este periodo.</TableCell></TableRow>
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
