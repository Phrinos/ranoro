// src/app/(app)/administracion/components/detalles-reporte-content.tsx
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, cn } from '@/lib/utils';
import { format, isValid, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search, TrendingUp, TrendingDown, ArrowUpDown, Sparkles,
  Car, ShoppingBag, ArrowDownCircle, ArrowUpCircle, Package,
  FileText, Wrench, CreditCard,
  ExternalLink, StickyNote, MoreHorizontal, Pencil, Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ServiceRecord, SaleReceipt, CashDrawerTransaction, User as UserType, InventoryItem } from '@/types';

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

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

interface Props {
  services: ServiceRecord[];
  sales: SaleReceipt[];
  cashTransactions: CashDrawerTransaction[];
  users: UserType[];
  purchases?: any[];
  inventoryItems?: InventoryItem[];
}

type TransactionRow = {
  id: string;
  date: Date;
  type: 'Servicio' | 'Venta' | 'Entrada' | 'Salida' | 'Compra';
  description: string;
  notes?: string;
  amount: number;
  isIncome: boolean;
  cost: number;
  profit: number | null;
  // Raw record for the detail modal
  raw: any;
};

// ── Detail modal content ──────────────────────────────────────────────────────

function DetailField({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">{label}</span>
      <span className={cn("text-sm font-semibold text-right", valueClass)}>{value}</span>
    </div>
  );
}

function ServicioDetail({ row, inventoryCostMap }: { row: TransactionRow; inventoryCostMap: Map<string, number> }) {
  const s = row.raw;
  const folio = s.folio ?? s.id?.slice(0, 8);
  const plate = s.vehiclePlate ?? s.vehicleIdentifier ?? '—';
  const serviceItems: any[] = s.serviceItems ?? [];

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="divide-y">
        <DetailField label="Folio" value={`#${folio}`} />
        <DetailField label="Vehículo" value={plate} />
        {s.technicianName && <DetailField label="Técnico" value={s.technicianName} />}
        {s.serviceAdvisorName && <DetailField label="Asesor" value={s.serviceAdvisorName} />}
        <DetailField label="Fecha" value={format(row.date, "dd 'de' MMMM yyyy, HH:mm", { locale: es })} />
        {s.paymentMethod && <DetailField label="Método de Pago" value={s.paymentMethod} />}
      </div>

      {/* Service items */}
      {serviceItems.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" /> Trabajos realizados
            </p>
            <div className="space-y-2">
              {serviceItems.map((si, i) => {
                const siPrice = toNum(si.sellingPrice ?? si.price ?? 0);
                const siCost = (si.suppliesUsed ?? []).reduce((acc: number, su: any) => {
                  const uc = inventoryCostMap.get(su.supplyId) ?? toNum(su.unitCost ?? su.unitPrice);
                  return acc + uc * toNum(su.quantity);
                }, 0);
                return (
                  <div key={i} className="bg-muted/40 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold">{si.itemName ?? si.name ?? `Trabajo ${i + 1}`}</p>
                        {si.serviceType && <p className="text-xs text-muted-foreground">{si.serviceType}</p>}
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(siPrice)}</span>
                    </div>
                    {(si.suppliesUsed ?? []).length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {(si.suppliesUsed ?? []).map((su: any, j: number) => (
                          <div key={j} className="flex justify-between text-xs text-muted-foreground">
                            <span>• {su.name ?? su.supplyName ?? 'Insumo'} ×{toNum(su.quantity)}</span>
                            <span className="text-red-500">
                              -{formatCurrency((inventoryCostMap.get(su.supplyId) ?? toNum(su.unitCost ?? su.unitPrice)) * toNum(su.quantity))}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-medium pt-1 border-t border-dashed">
                          <span className="text-muted-foreground">Costo insumos</span>
                          <span className="text-red-500">-{formatCurrency(siCost)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-emerald-700">Ganancia trabajo</span>
                          <span className="text-emerald-600">{formatCurrency(siPrice - siCost)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Totals */}
      <Separator />
      <div className="divide-y">
        <DetailField label="Total cobrado" value={formatCurrency(row.amount)} valueClass="text-lg text-emerald-600" />
        {row.cost > 0 && <DetailField label="Costo total insumos" value={`-${formatCurrency(row.cost)}`} valueClass="text-red-500" />}
        {row.profit !== null && (
          <DetailField
            label="Ganancia real"
            value={formatCurrency(row.profit)}
            valueClass={cn("text-lg font-black", row.profit >= 0 ? "text-amber-600" : "text-red-600")}
          />
        )}
      </div>

      {/* Notes */}
      {row.notes && (
        <>
          <Separator />
          <div className="flex gap-2 bg-muted/40 rounded-lg p-3">
            <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{row.notes}</p>
          </div>
        </>
      )}

      {/* Link to full service */}
      <Link
        href={`/servicios/${row.id}`}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border text-sm font-semibold hover:bg-muted transition-colors"
      >
        <ExternalLink className="h-4 w-4" /> Abrir orden completa
      </Link>
    </div>
  );
}

function VentaDetail({ row, inventoryCostMap }: { row: TransactionRow; inventoryCostMap: Map<string, number> }) {
  const s = row.raw;
  const items: any[] = s.items ?? [];
  const payments: any[] = s.payments ?? [];

  return (
    <div className="space-y-4">
      <div className="divide-y">
        <DetailField label="Folio" value={`#${s.id?.slice(-8) ?? '—'}`} />
        <DetailField label="Cliente" value={s.customerName ?? 'Cliente Mostrador'} />
        <DetailField label="Fecha" value={format(row.date, "dd 'de' MMMM yyyy, HH:mm", { locale: es })} />
        {s.registeredByName && <DetailField label="Registrado por" value={s.registeredByName} />}
      </div>

      {/* Items */}
      {items.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" /> Artículos
            </p>
            <div className="space-y-1.5">
              {items.map((it, i) => {
                const unitCost = inventoryCostMap.get(it.inventoryItemId ?? it.itemId) ?? 0;
                const itemCost = it.isService ? 0 : unitCost * toNum(it.quantity ?? 1);
                const itemTotal = toNum(it.total ?? it.totalPrice ?? 0);
                return (
                  <div key={i} className="bg-muted/40 rounded-lg p-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold">{it.itemName}</p>
                        <p className="text-xs text-muted-foreground">Cant. {it.quantity ?? 1} {it.isService ? '· Servicio' : ''}</p>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(itemTotal)}</span>
                    </div>
                    {!it.isService && itemCost > 0 && (
                      <div className="flex justify-between text-xs mt-1.5 pt-1.5 border-t border-dashed">
                        <span className="text-red-500">Costo: -{formatCurrency(itemCost)}</span>
                        <span className="text-emerald-600 font-medium">Ganancia: {formatCurrency(itemTotal - itemCost)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Payments */}
      {payments.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Pagos
            </p>
            <div className="divide-y">
              {payments.map((p, i) => (
                <div key={i} className="flex justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground">{p.method}</span>
                  <span className="font-semibold">{formatCurrency(p.amount ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Totals */}
      <Separator />
      <div className="divide-y">
        <DetailField label="Total venta" value={formatCurrency(row.amount)} valueClass="text-lg text-emerald-600" />
        {row.cost > 0 && <DetailField label="Costo productos" value={`-${formatCurrency(row.cost)}`} valueClass="text-red-500" />}
        {row.profit !== null && (
          <DetailField
            label="Ganancia real"
            value={formatCurrency(row.profit)}
            valueClass={cn("text-lg font-black", row.profit >= 0 ? "text-amber-600" : "text-red-600")}
          />
        )}
      </div>

      {row.notes && (
        <>
          <Separator />
          <div className="flex gap-2 bg-muted/40 rounded-lg p-3">
            <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{row.notes}</p>
          </div>
        </>
      )}
    </div>
  );
}

function CajaDetail({ row }: { row: TransactionRow }) {
  const t = row.raw;
  return (
    <div className="space-y-4">
      <div className="divide-y">
        <DetailField label="Tipo" value={row.type} />
        <DetailField label="Fecha" value={format(row.date, "dd 'de' MMMM yyyy, HH:mm", { locale: es })} />
        <DetailField label="Descripción" value={row.description} />
        {t.userName && <DetailField label="Registrado por" value={t.userName} />}
        {t.paymentMethod && <DetailField label="Método" value={t.paymentMethod} />}
        {t.concept && <DetailField label="Concepto" value={t.concept} />}
        <DetailField
          label="Monto"
          value={`${row.isIncome ? '+' : '-'}${formatCurrency(row.amount)}`}
          valueClass={cn("text-xl font-black", row.isIncome ? "text-emerald-600" : "text-red-600")}
        />
      </div>
      {row.notes && (
        <>
          <Separator />
          <div className="flex gap-2 bg-muted/40 rounded-lg p-3">
            <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{row.notes}</p>
          </div>
        </>
      )}
    </div>
  );
}

function CompraDetail({ row }: { row: TransactionRow }) {
  const p = row.raw;
  return (
    <div className="space-y-4">
      <div className="divide-y">
        {p.supplierName && <DetailField label="Proveedor" value={p.supplierName} />}
        {p.invoiceId && <DetailField label="Factura #" value={p.invoiceId} />}
        <DetailField label="Fecha" value={format(row.date, "dd 'de' MMMM yyyy, HH:mm", { locale: es })} />
        {p.paymentMethod && <DetailField label="Método de Pago" value={p.paymentMethod} />}
        <DetailField label="Total" value={formatCurrency(row.amount)} valueClass="text-xl font-black text-red-600" />
      </div>
      {row.notes && (
        <>
          <Separator />
          <div className="flex gap-2 bg-muted/40 rounded-lg p-3">
            <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{row.notes}</p>
          </div>
        </>
      )}
    </div>
  );
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  Servicio: Car,
  Venta:    ShoppingBag,
  Entrada:  ArrowDownCircle,
  Salida:   ArrowUpCircle,
  Compra:   Package,
};

const TYPE_COLORS: Record<string, string> = {
  Servicio: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Venta:    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Entrada:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  Salida:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Compra:   'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

const TYPE_MODAL_HEADER: Record<string, { bg: string; icon: string }> = {
  Servicio: { bg: 'bg-blue-600',    icon: 'text-blue-50' },
  Venta:    { bg: 'bg-purple-600',  icon: 'text-purple-50' },
  Entrada:  { bg: 'bg-emerald-600', icon: 'text-emerald-50' },
  Salida:   { bg: 'bg-red-600',     icon: 'text-red-50' },
  Compra:   { bg: 'bg-orange-600',  icon: 'text-orange-50' },
};

// ── Main Component ────────────────────────────────────────────────────────────

// Firestore collection per transaction type
const COLLECTION_MAP: Record<string, string> = {
  Servicio: 'serviceRecords',
  Venta:    'sales',
  Entrada:  'cashDrawerTransactions',
  Salida:   'cashDrawerTransactions',
  Compra:   'purchases',
};

// Edit URL per type (null = no standalone edit page)
const EDIT_URL_MAP: Record<string, (id: string) => string | null> = {
  Servicio: (id) => `/servicios/${id}`,
  Venta:    () => null,
  Entrada:  () => null,
  Salida:   () => null,
  Compra:   () => null,
};

export default function DetallesReporteContent({ services, sales, cashTransactions, users, purchases = [], inventoryItems = [] }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  }));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [selectedRow, setSelectedRow] = useState<TransactionRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TransactionRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const collection = COLLECTION_MAP[pendingDelete.type];
    if (!collection || !pendingDelete.id) {
      toast({ title: 'No se puede eliminar este tipo de movimiento', variant: 'destructive' });
      setPendingDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, collection, pendingDelete.id));
      toast({ title: 'Movimiento eliminado', description: pendingDelete.description });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  // Build inventory cost map: id → unitPrice (costPrice)
  const inventoryCostMap = useMemo(() => {
    const m = new Map<string, number>();
    inventoryItems.forEach(item => m.set(item.id, toNum(item.unitPrice)));
    return m;
  }, [inventoryItems]);

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

    // ── Servicios ─────────────────────────────────────────────────────────────
    services
      .filter(s => s.status === 'Entregado' && inInterval((s as any).deliveryDateTime ?? (s as any).completedAt ?? (s as any).createdAt))
      .forEach(s => {
        const d = parseAnyDate((s as any).deliveryDateTime ?? (s as any).completedAt ?? (s as any).createdAt)!;
        const amount = toNum((s as any).totalCost ?? (s as any).total ?? 0);
        const cost = ((s as any).serviceItems ?? []).reduce((acc: number, si: any) => {
          return acc + (si.suppliesUsed ?? []).reduce((sAcc: number, su: any) => {
            const uc = inventoryCostMap.get(su.supplyId) ?? toNum(su.unitCost ?? su.unitPrice);
            return sAcc + uc * toNum(su.quantity);
          }, 0);
        }, 0);

        const folio = (s as any).folio ?? (s as any).id?.slice(0, 8);
        const plate = (s as any).vehiclePlate ?? (s as any).vehicleIdentifier ?? '';

        rows.push({
          id: (s as any).id,
          date: d,
          type: 'Servicio',
          description: `Orden #${folio}${plate ? ` — ${plate}` : ''}`,
          notes: (s as any).notes ?? (s as any).note,
          amount,
          isIncome: true,
          cost,
          profit: amount - cost,
          raw: s,
        });
      });

    // ── Ventas PDV ────────────────────────────────────────────────────────────
    sales
      .filter(s => s.status === 'Completado' && inInterval((s as any).saleDate))
      .forEach(s => {
        const d = parseAnyDate((s as any).saleDate)!;
        const amount = toNum(s.totalAmount);
        const cost = (s.items ?? []).reduce((acc, it: any) => {
          if (it.isService) return acc;
          return acc + (inventoryCostMap.get(it.inventoryItemId ?? it.itemId) ?? 0) * toNum(it.quantity ?? 1);
        }, 0);

        rows.push({
          id: (s as any).id,
          date: d,
          type: 'Venta',
          description: `Venta PDV — ${s.customerName ?? 'Cliente Mostrador'}`,
          notes: (s as any).notes ?? (s as any).note,
          amount,
          isIncome: true,
          cost,
          profit: amount - cost,
          raw: s,
        });
      });

    // ── Movimientos de Caja ───────────────────────────────────────────────────
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
          notes: t.note ?? (t as any).notes,
          amount: toNum(t.amount),
          isIncome,
          cost: 0,
          profit: null,
          raw: t,
        });
      });

    // ── Compras ───────────────────────────────────────────────────────────────
    purchases
      .filter(p => inInterval(p.invoiceDate ?? p.purchaseDate))
      .forEach(p => {
        const d = parseAnyDate(p.invoiceDate ?? p.purchaseDate)!;
        rows.push({
          id: p.id ?? Math.random().toString(),
          date: d,
          type: 'Compra',
          description: `Compra — ${p.supplierName ?? 'Proveedor'} ${p.invoiceId ? `#${p.invoiceId}` : ''}`,
          notes: p.notes,
          amount: toNum(p.invoiceTotal ?? p.total ?? 0),
          isIncome: false,
          cost: 0,
          profit: null,
          raw: p,
        });
      });

    return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [dateRange, services, sales, cashTransactions, purchases, inventoryCostMap]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter(t => {
      const matchType = typeFilter === 'todos' || t.type === typeFilter;
      const matchSearch = !q || t.description.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [transactions, search, typeFilter]);

  const totals = useMemo(() => {
    const income = filtered.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0);
    const realProfit = filtered.filter(t => t.profit !== null).reduce((s, t) => s + (t.profit ?? 0), 0);
    return { income, expense, net: income - expense, realProfit };
  }, [filtered]);

  // ── Modal header style ─────────────────────────────────────────────────────
  const modalStyle = selectedRow ? TYPE_MODAL_HEADER[selectedRow.type] : null;
  const ModalIcon = selectedRow ? (TYPE_ICONS[selectedRow.type] ?? FileText) : FileText;

  return (
    <div className="space-y-6">

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-black text-emerald-600">{formatCurrency(totals.income)}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Ingresos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-black text-red-600">{formatCurrency(totals.expense)}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Egresos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className={cn("text-2xl font-black", totals.net >= 0 ? "text-emerald-600" : "text-red-600")}>
              {formatCurrency(totals.net)}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5 flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" /> Neto
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-4">
            <p className={cn("text-2xl font-black", totals.realProfit >= 0 ? "text-amber-600" : "text-red-600")}>
              {formatCurrency(totals.realProfit)}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wide mt-0.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Ganancia Real
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Movimientos</CardTitle>
          <CardDescription>{filtered.length} registro(s) · Clic en cualquier fila para ver detalle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
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

          {/* Table */}
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Fecha</TableHead>
                  <TableHead className="w-[90px]">Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right w-[110px]">Costo</TableHead>
                  <TableHead className="text-right w-[120px]">Ganancia</TableHead>
                  <TableHead className="text-right w-[120px]">Monto</TableHead>
                  <TableHead className="w-[44px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Sin registros para el período seleccionado.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((row, i) => (
                  <TableRow
                    key={`${row.id}-${i}`}
                    onClick={() => setSelectedRow(row)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                  >
                    {/* Fecha */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums py-3">
                      {format(row.date, "dd MMM", { locale: es })}
                      <br />
                      <span className="text-[10px]">{format(row.date, "HH:mm")}</span>
                    </TableCell>

                    {/* Tipo */}
                    <TableCell className="py-3">
                      <span className={cn(
                        "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                        TYPE_COLORS[row.type] ?? "bg-muted text-muted-foreground"
                      )}>
                        {row.type}
                      </span>
                    </TableCell>

                    {/* Descripción + Notas */}
                    <TableCell className="py-3">
                      <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">
                        {row.description}
                      </p>
                      {row.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-1">
                          {row.notes}
                        </p>
                      )}
                    </TableCell>

                    {/* Costo */}
                    <TableCell className="text-right py-3">
                      {row.profit !== null && row.cost > 0 ? (
                        <span className="text-sm font-medium text-red-500 tabular-nums">
                          {formatCurrency(row.cost)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Ganancia */}
                    <TableCell className="text-right py-3">
                      {row.profit !== null ? (
                        <span className={cn(
                          "text-sm font-bold tabular-nums",
                          row.profit >= 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                          {formatCurrency(row.profit)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Monto */}
                    <TableCell className={cn(
                      "text-right font-semibold text-sm py-3 tabular-nums",
                      row.isIncome ? "text-emerald-600" : "text-red-600"
                    )}>
                      {row.isIncome ? '+' : '-'}{formatCurrency(row.amount)}
                    </TableCell>

                    {/* Acciones — 3 puntos */}
                    <TableCell className="py-3 pr-2" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 transition-opacity data-[state=open]:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {/* Ver detalle */}
                          <DropdownMenuItem onClick={() => setSelectedRow(row)}>
                            <FileText className="h-3.5 w-3.5 mr-2" /> Ver detalle
                          </DropdownMenuItem>

                          {/* Editar — solo si hay URL */}
                          {EDIT_URL_MAP[row.type]?.(row.id) && (
                            <DropdownMenuItem onClick={() => router.push(EDIT_URL_MAP[row.type]!(row.id)!)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Editar orden
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {/* Eliminar */}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-red-50"
                            onClick={() => setPendingDelete(row)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      <Dialog open={!!selectedRow} onOpenChange={(open) => { if (!open) setSelectedRow(null); }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {selectedRow && (
            <>
              {/* Colored header */}
              <div className={cn("px-6 py-5 flex items-center gap-4", modalStyle?.bg ?? "bg-slate-700")}>
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <ModalIcon className={cn("h-6 w-6", modalStyle?.icon ?? "text-white")} />
                </div>
                <div>
                  <DialogTitle className="text-white text-base font-black leading-tight">
                    {selectedRow.type === 'Servicio' && 'Detalle de Servicio'}
                    {selectedRow.type === 'Venta' && 'Detalle de Venta PDV'}
                    {selectedRow.type === 'Entrada' && 'Entrada de Caja'}
                    {selectedRow.type === 'Salida' && 'Salida de Caja'}
                    {selectedRow.type === 'Compra' && 'Detalle de Compra'}
                  </DialogTitle>
                  <p className="text-white/70 text-xs mt-0.5">
                    {format(selectedRow.date, "EEEE dd 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-6 py-4">
                {selectedRow.type === 'Servicio' && (
                  <ServicioDetail row={selectedRow} inventoryCostMap={inventoryCostMap} />
                )}
                {selectedRow.type === 'Venta' && (
                  <VentaDetail row={selectedRow} inventoryCostMap={inventoryCostMap} />
                )}
                {(selectedRow.type === 'Entrada' || selectedRow.type === 'Salida') && (
                  <CajaDetail row={selectedRow} />
                )}
                {selectedRow.type === 'Compra' && (
                  <CompraDetail row={selectedRow} />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> Eliminar movimiento
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este movimiento? Esta acción no se puede deshacer.
              {pendingDelete && (
                <span className="block mt-2 font-semibold text-foreground">
                  {pendingDelete.description}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
