// src/app/(app)/pos/components/ventas-pos-content.tsx
"use client";

import React, { useMemo, useState, useCallback, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Wallet, CreditCard, TrendingUp, Edit, Printer, Trash2, User as UserIcon, Landmark, Search, ShoppingCart, DollarSign, BarChart2, X, CalendarDays, MoreHorizontal, Receipt } from "lucide-react";
import type { SaleReceipt, InventoryItem, User, PaymentMethod, ServiceRecord } from "@/types";
import { startOfMonth, endOfMonth, isValid, format as formatLocale, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, getPaymentMethodVariant, cn } from '@/lib/utils';
import { calculateSaleProfit, calcEffectiveProfit } from '@/lib/money-helpers';
import { Badge } from '@/components/ui/badge';
import { parseDate } from '@/lib/forms';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Month selector helpers ─────────────────────────────────────────────────
const getLast12Months = () => {
  const months: { value: string; label: string; from: Date; to: Date }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: formatLocale(d, 'MMMM yyyy', { locale: es }),
      from: startOfMonth(d),
      to: endOfMonth(d),
    });
  }
  return months;
};

const MONTH_OPTIONS = getLast12Months();

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos los métodos' },
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Tarjeta', label: 'Tarjeta' },
  { value: 'Tarjeta 3 MSI', label: 'Tarjeta 3 MSI' },
  { value: 'Tarjeta 6 MSI', label: 'Tarjeta 6 MSI' },
  { value: 'Transferencia', label: 'Transferencia' },
  { value: 'Transferencia/Contadora', label: 'Transferencia/Contadora' },
];

const paymentMethodIcons: Partial<Record<PaymentMethod, React.ElementType>> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Tarjeta 3 MSI": CreditCard,
  "Tarjeta 6 MSI": CreditCard,
  "Transferencia": Landmark,
  "Transferencia/Contadora": Landmark,
};

interface VentasPosContentProps {
  allSales: SaleReceipt[];
  allInventory: InventoryItem[];
  allUsers: User[];
  allServices: ServiceRecord[];
  currentUser: User | null;
  onReprintTicket: (sale: SaleReceipt) => void;
  onViewSale: (sale: SaleReceipt) => void;
  onDeleteSale: (saleId: string) => void;
  onEditPayment: (sale: SaleReceipt) => void;
  onCancelSale: (saleId: string, reason: string) => void;
  pageActions?: ReactNode;
}

export default function VentasPosContent({
  allSales,
  allInventory,
  allUsers,
  allServices,
  currentUser,
  onReprintTicket,
  onViewSale,
  onDeleteSale,
  onEditPayment,
  onCancelSale,
  pageActions,
}: VentasPosContentProps) {

  // ── Shared filter state ────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0].value);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | 'all'>('all');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const monthRange = useMemo(() =>
    MONTH_OPTIONS.find(m => m.value === selectedMonth) ?? MONTH_OPTIONS[0],
    [selectedMonth]
  );

  // ── Filter sales ────────────────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    const from = startOfDay(monthRange.from);
    const to = endOfDay(monthRange.to);
    const sSearch = search.toLowerCase().trim();

    return allSales.filter(sale => {
      const saleDate = parseDate(sale.saleDate);
      if (!saleDate || !isValid(saleDate)) return false;
      if (!isWithinInterval(saleDate, { start: from, end: to })) return false;

      // Payment filter
      if (selectedPayment !== 'all') {
        const hasMethod = sale.payments?.some(p => p.method === selectedPayment)
          || sale.paymentMethod === selectedPayment
          || (sale.paymentMethod as string)?.includes(selectedPayment);
        if (!hasMethod) return false;
      }

      // Search filter
      if (sSearch) {
        const desc = sale.items?.map(i => i.itemName).join(' ').toLowerCase() ?? '';
        const customer = (sale.customerName ?? '').toLowerCase();
        const id = sale.id.toLowerCase();
        const seller = (sale.registeredByName ?? '').toLowerCase();
        if (!desc.includes(sSearch) && !customer.includes(sSearch) && !id.includes(sSearch) && !seller.includes(sSearch)) return false;
      }

      return true;
    });
  }, [allSales, monthRange, selectedPayment, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedSales = filteredSales.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // Reset page when filters change
  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const handleMonth = useCallback((v: string) => { setSelectedMonth(v); setPage(1); }, []);
  const handlePayment = useCallback((v: string) => { setSelectedPayment(v as PaymentMethod | 'all'); setPage(1); }, []);

  // ── Stats cards — siempre del mes seleccionado en el selector ──────
  const stats = useMemo(() => {
    const from = startOfDay(monthRange.from);
    const to   = endOfDay(monthRange.to);

    // Ventas del mes (excluyendo canceladas)
    const activeSales = allSales.filter(s => {
      if (s.status === 'Cancelado') return false;
      const d = parseDate(s.saleDate);
      return d && isValid(d) && isWithinInterval(d, { start: from, end: to });
    });

    const totalRevenue = activeSales.reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);

    const totalProfit = activeSales.reduce((sum, s) => sum + calculateSaleProfit(s, allInventory), 0);

    const itemCounts = activeSales
      .flatMap(s => s.items ?? [])
      .reduce((acc, item) => {
        const key = item.itemName ?? 'Sin nombre';
        acc[key] = (acc[key] ?? 0) + (item.quantity ?? 0);
        return acc;
      }, {} as Record<string, number>);
    const topEntry = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      operations: activeSales.length,
      salesCount: activeSales.length,
      totalRevenue,
      totalProfit,
      mostSold: topEntry ? { name: topEntry[0], qty: topEntry[1] } : null,
    };
  }, [allSales, allInventory, monthRange]);

  return (
    <div className="space-y-6">
      {/* ── Page Header & Month Selector ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Punto de Venta</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona ventas de mostrador, revisa el historial y visualiza ganancias.
          </p>
        </div>
        
        <Select value={selectedMonth} onValueChange={handleMonth}>
          <SelectTrigger className="w-full sm:w-56 bg-white h-10 shrink-0 font-medium shadow-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map(m => (
              <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operaciones</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-blue-600"/>
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-3xl font-bold text-foreground">{stats.operations}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.salesCount} ventas de mostrador</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ingresos Totales</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-primary"/>
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Ventas de mostrador del período</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ganancia Bruta</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-600"/>
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">Antes de gastos fijos</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Más Vendido</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-orange-500"/>
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-lg font-bold text-foreground truncate" title={stats.mostSold?.name ?? 'N/A'}>
              {stats.mostSold?.name ?? 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.mostSold ? `${stats.mostSold.qty} unidades` : 'Sin ventas registradas'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Unified filter bar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por ID, vendedor, artículo..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9 bg-white h-10 shadow-sm"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={selectedPayment} onValueChange={handlePayment}>
          <SelectTrigger className="w-full sm:w-52 bg-white h-10 shrink-0 shadow-sm">
            <Wallet className="h-4 w-4 text-muted-foreground mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHOD_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {pageActions}
      </div>

      {/* ── Sales Table ─────────────────────────────────────────────── */}
      {paginatedSales.length > 0 ? (
        <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden mt-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
                <TableHead className="font-semibold text-xs tracking-wider text-slate-500 uppercase w-24 text-left">ID Venta</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider text-slate-500 uppercase w-48 text-left whitespace-nowrap">Fecha / Hora</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider text-slate-500 uppercase w-64 text-left">Vendedor</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider text-slate-500 uppercase w-32 text-left">Categoría</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider text-slate-500 uppercase w-80 text-left">Producto</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider text-slate-500 uppercase text-center w-32">Monto</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider text-slate-500 uppercase text-center w-40">Método</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider text-slate-500 uppercase text-right pr-6">⋮</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSales.map(sale => {
                const saleDate = parseDate(sale.saleDate);
                const isCancelled = sale.status === 'Cancelado';
                const profit = calculateSaleProfit(sale, allInventory);
                const validItems = sale.items?.filter((item: any) => item.inventoryItemId !== 'COMMISSION_FEE' && item.itemId !== 'COMMISSION_FEE') || [];
                const itemsDescription = validItems.map(item => `${item.quantity}x ${item.itemName}`).join(', ');
                
                const categoriesSet = new Set<string>();
                validItems.forEach((item: any) => {
                  if (item.category) {
                    categoriesSet.add(item.category);
                  } else if (item.inventoryItemId) {
                    const inv = allInventory.find(i => i.id === item.inventoryItemId);
                    if (inv && inv.category) categoriesSet.add(inv.category);
                  }
                });
                const categoriesArray = Array.from(categoriesSet);

                const paymentBadges = isCancelled
                  ? [<Badge key="cancelled" variant="destructive" className="font-bold text-[10px]">CANCELADO</Badge>]
                  : (sale.payments && sale.payments.length > 0)
                    ? sale.payments.map((p, i) => {
                        const Icon = paymentMethodIcons[p.method as PaymentMethod] ?? Wallet;
                        return (
                          <Badge key={i} variant={getPaymentMethodVariant(p.method)} className="text-[10px] gap-1">
                            <Icon className="h-3 w-3"/>{p.method}
                            <span className="font-normal opacity-75">{formatCurrency(p.amount)}</span>
                          </Badge>
                        );
                      })
                    : sale.paymentMethod
                      ? [<Badge key={sale.paymentMethod} variant={getPaymentMethodVariant(sale.paymentMethod)} className="text-[10px]">{sale.paymentMethod}</Badge>]
                      : [<Badge key="no-pay" variant="outline" className="text-[10px]">Sin Pago</Badge>];

                const sellerName = sale.registeredByName
                  || allUsers.find(u => u.id === sale.registeredById)?.name
                  || 'N/A';

                return (
                  <TableRow
                    key={sale.id}
                    className={cn(
                      "group transition-colors hover:bg-slate-50/50 border-b border-slate-100",
                      isCancelled && "bg-slate-50 opacity-70"
                    )}
                  >
                    {/* Columna 1: ID Venta */}
                    <TableCell className="align-middle py-3 w-24 text-left">
                      <p className="font-mono text-xs font-semibold text-slate-600">#{sale.id.slice(-6)}</p>
                    </TableCell>

                    {/* Columna 2: Fecha y Hora */}
                    <TableCell className="align-middle py-3 w-48 text-left whitespace-nowrap">
                      <p className="font-medium text-sm text-slate-700">
                        {saleDate && isValid(saleDate) ? formatLocale(saleDate, "dd MMM yyyy, HH:mm 'hrs'", { locale: es }) : 'N/A'}
                      </p>
                    </TableCell>

                    {/* Columna 3: Vendedor */}
                    <TableCell className="align-middle py-3 w-64 text-left">
                      <div className="flex items-center justify-start gap-1.5 text-slate-700">
                        <UserIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-sm font-medium truncate" title={sellerName}>{sellerName}</span>
                      </div>
                    </TableCell>

                    {/* Columna Extra: Categoría */}
                    <TableCell className="align-middle py-3 w-32 text-left">
                      <div className="flex flex-wrap gap-1">
                        {categoriesArray.length > 0 ? categoriesArray.map(c => (
                          <Badge key={c} variant="secondary" className="text-[10px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">{c}</Badge>
                        )) : <span className="text-xs text-slate-400">Genérica</span>}
                      </div>
                    </TableCell>

                    {/* Columna 4: Producto */}
                    <TableCell className="align-middle py-3 text-slate-700 text-left w-80">
                      <p className="font-bold text-base text-slate-900 leading-snug line-clamp-2" title={itemsDescription}>{itemsDescription || 'Sin artículos'}</p>
                    </TableCell>

                    {/* Columna 5: Monto & Ganancia */}
                    <TableCell className="align-middle py-3 text-center w-32">
                      <div className="flex flex-col items-center">
                        <p className="font-bold text-base text-slate-900">{formatCurrency(sale.totalAmount ?? 0)}</p>
                        <p className="font-medium text-[11px] text-green-600 mt-0.5 flex items-center gap-1" title="Ganancia bruta">
                          <TrendingUp className="h-3 w-3 inline" /> {formatCurrency(profit)}
                        </p>
                      </div>
                    </TableCell>

                    {/* Columna 6: Método de Pago */}
                    <TableCell className="align-middle py-3 w-40">
                      <div className="flex flex-col gap-1 items-center justify-center">{paymentBadges}</div>
                    </TableCell>

                    {/* Columna 7: Acciones */}
                    <TableCell className="align-middle py-3 text-right pr-6" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[180px] bg-white/95 backdrop-blur-xl shadow-xl border-white/40">
                          <DropdownMenuItem onClick={() => onViewSale(sale)} className="gap-2 cursor-pointer font-medium">
                            <Edit className="h-4 w-4 text-blue-500" /> Ver / Editar Venta
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onReprintTicket(sale)} className="gap-2 cursor-pointer font-medium" disabled={isCancelled}>
                            <Printer className="h-4 w-4 text-slate-500" /> Reimprimir Ticket
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <ConfirmDialog
                            triggerButton={
                              <DropdownMenuItem onSelect={e => e.preventDefault()} className="gap-2 text-destructive focus:bg-red-50 focus:text-destructive cursor-pointer font-medium" disabled={isCancelled}>
                                <Trash2 className="h-4 w-4" /> {isCancelled ? 'Ya cancelada' : 'Cancelar Venta'}
                              </DropdownMenuItem>
                            }
                            title={`¿Cancelar Venta #${sale.id.slice(-6)}?`}
                            description="Esta acción no se puede deshacer. El stock se restaurará y los movimientos de caja asociados se eliminan."
                            onConfirm={() => onCancelSale(sale.id, prompt('Motivo de cancelación:') || 'Sin motivo especificado.')}
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
          <Receipt className="h-12 w-12 mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-foreground">Sin ventas para este período</h3>
          <p className="text-sm mt-1">Cambia el mes, el método de pago o el término de búsqueda.</p>
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────── */}
      {filteredSales.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-muted-foreground">
            {filteredSales.length} registros · página {safePage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="bg-white" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button size="sm" variant="outline" className="bg-white" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
