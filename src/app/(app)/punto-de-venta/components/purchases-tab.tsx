// src/app/(app)/punto-de-venta/components/purchases-tab.tsx
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, cn } from "@/lib/utils";
import { Search, PlusCircle, ChevronLeft, ChevronRight, ShoppingCart, AlertCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, isValid, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { purchaseService } from "@/lib/services/purchase.service";
import { useToast } from "@/hooks/use-toast";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import type { PosPurchase, PosPayableAccount, PosInventoryItem, PosCategory } from "../hooks/use-pos-data";
import type { Supplier } from "@/types";
import { registerPurchaseSchema, type RegisterPurchaseFormValues } from "@/schemas/register-purchase-schema";
import dynamic from "next/dynamic";

const RegisterPurchaseDialog = dynamic(
  () => import("@/app/(app)/punto-de-venta/components/register-purchase-dialog").then((m) => ({ default: m.RegisterPurchaseDialog })),
  { ssr: false }
);

const PAGE_SIZE = 25;

const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Tarjeta 3 MSI", "Tarjeta 6 MSI", "Transferencia", "Crédito"];

function parseAnyDate(v: any): Date | null {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  const d = typeof v === "string" ? parseISO(v) : new Date(v);
  return isValid(d) ? d : null;
}

interface Props {
  purchases: PosPurchase[];
  payables: PosPayableAccount[];
  suppliers: Supplier[];
  items: PosInventoryItem[];
  categories: PosCategory[];
}

export function PurchasesTab({ purchases, payables, suppliers, items, categories }: Props) {
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PosPurchase | null>(null);
  const [editPurchase, setEditPurchase] = useState<PosPurchase | null>(null);
  const [deletePending, setDeletePending] = useState<PosPurchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const q = search.trim().toLowerCase();
      if (q && !`${p.invoiceId} ${p.supplierName}`.toLowerCase().includes(q)) return false;
      if (supplierFilter !== "all" && p.supplierId !== supplierFilter) return false;
      if (methodFilter !== "all" && p.paymentMethod !== methodFilter) return false;
      if (dateRange?.from) {
        const d = parseAnyDate(p.invoiceDate);
        if (!d) return false;
        const interval = { start: dateRange.from, end: dateRange.to ?? dateRange.from };
        if (!isWithinInterval(d, interval)) return false;
      }
      return true;
    });
  }, [purchases, search, supplierFilter, methodFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpis = useMemo(() => {
    const total = filtered.reduce((s, p) => {
      const t = (p.invoiceTotal && p.invoiceTotal > 0)
        ? p.invoiceTotal
        : (p.items ?? []).reduce((si: number, it: any) =>
            si + (Number(it.purchasePrice) || 0) * (Number(it.quantity) || 1), 0);
      return s + t;
    }, 0);
    const pending = payables.filter((a) => a.status === "pending").reduce((s, a) => s + (a.amount || 0), 0);
    return { total, count: filtered.length, pendingDebt: pending };
  }, [filtered, payables]);

  const handleSavePurchase = useCallback(async (data: RegisterPurchaseFormValues) => {
    try {
      await purchaseService.registerPurchase(data);
      toast({ title: "Compra registrada", description: `${data.items.length} artículo(s) registrados.` });
      setDialogOpen(false);
    } catch {
      toast({ title: "Error al registrar compra", variant: "destructive" });
    }
  }, [toast]);

  const handleDeletePurchase = useCallback(async () => {
    if (!deletePending) return;
    setIsDeleting(true);
    try {
      const userStr = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      const user = userStr ? JSON.parse(userStr) : null;
      await purchaseService.deletePurchase(deletePending.id, user);
      toast({ title: "Compra eliminada" });
      setDeletePending(null);
      setSelectedPurchase(null);
    } catch (e: any) {
      toast({ title: "Error al eliminar", description: e.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  }, [deletePending, toast]);

  const handleUpdatePurchase = useCallback(async (data: RegisterPurchaseFormValues) => {
    if (!editPurchase) return;
    try {
      await purchaseService.updatePurchase(editPurchase.id, data);
      toast({ title: "Compra actualizada" });
      setEditPurchase(null);
    } catch (e: any) {
      toast({ title: "Error al actualizar", description: e.message, variant: "destructive" });
    }
  }, [editPurchase, toast]);

  return (
    <>
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Compras en período", value: kpis.count.toString(), color: "text-foreground" },
            { label: "Total comprado", value: formatCurrency(kpis.total), color: "text-red-600" },
            { label: "Crédito pendiente", value: formatCurrency(kpis.pendingDebt), color: kpis.pendingDebt > 0 ? "text-amber-600" : "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="shadow-xs">
              <CardContent className="p-4">
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar folio, proveedor…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" />
          </div>
          <Select value={supplierFilter} onValueChange={(v) => { setSupplierFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white border-slate-200"><SelectValue placeholder="Proveedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proveedores</SelectItem>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white border-slate-200"><SelectValue placeholder="Método pago" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <DatePickerWithRange date={dateRange} onDateChange={(d) => { setDateRange(d); setPage(1); }} />
          <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Registrar Compra
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Folio</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Artículos</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="w-[44px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.length > 0 ? paged.map((p) => {
                    const d = parseAnyDate(p.invoiceDate);
                    const isCredit = p.paymentMethod === "Crédito";
                    const hasDebt = payables.some((a) => a.purchaseId === p.id && a.status === "pending");
                    // Fallback: some legacy records have invoiceTotal=0 but correct items data
                    const effectiveTotal = (p.invoiceTotal && p.invoiceTotal > 0)
                      ? p.invoiceTotal
                      : (p.items ?? []).reduce((s: number, it: any) =>
                          s + (Number(it.purchasePrice) || 0) * (Number(it.quantity) || 1), 0);
                    return (
                      <TableRow
                        key={p.id}
                        className="hover:bg-muted/40 cursor-pointer group"
                        onClick={() => setSelectedPurchase(p)}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {d ? format(d, "dd/MM/yyyy", { locale: es }) : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.invoiceId || p.id.slice(-6)}</TableCell>
                        <TableCell className="font-medium text-sm">{p.supplierName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.items?.length ?? 0} artículos</TableCell>
                        <TableCell>
                          {(() => {
                            const m = p.paymentMethod ?? '';
                            const isEfectivo    = m === 'Efectivo';
                            const isTransfer    = m === 'Transferencia';
                            const isCard        = m.startsWith('Tarjeta');
                            const isCreditPay   = m === 'Crédito';
                            return (
                              <span className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                isEfectivo  && 'bg-emerald-100 text-emerald-800',
                                isCard      && 'bg-purple-100 text-purple-800',
                                isTransfer  && 'bg-blue-100 text-blue-800',
                                isCreditPay && 'bg-amber-100 text-amber-800',
                                !isEfectivo && !isCard && !isTransfer && !isCreditPay && 'bg-slate-100 text-slate-700',
                              )}>
                                {m}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(effectiveTotal)}</TableCell>
                        <TableCell className="text-center">
                          {isCredit && hasDebt ? (
                            <Badge variant="outline" className="border-amber-400 text-amber-700 text-[10px]">
                              <AlertCircle className="h-3 w-3 mr-1" /> Pendiente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-400 text-emerald-700 text-[10px]">Pagado</Badge>
                          )}
                        </TableCell>

                        {/* 3-dot menu */}
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 transition-opacity data-[state=open]:opacity-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => setSelectedPurchase(p)}>
                                <ShoppingCart className="h-3.5 w-3.5 mr-2" /> Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditPurchase(p)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Editar compra
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-red-50"
                                onClick={() => setDeletePending(p)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        <ShoppingCart className="mx-auto h-8 w-8 mb-2 opacity-20" />
                        No hay compras en este período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {/* Register / Edit Purchase Dialog */}
      {(dialogOpen || !!editPurchase) && (
        <RegisterPurchaseDialog
          open={dialogOpen || !!editPurchase}
          onOpenChange={(open) => {
            if (!open) { setDialogOpen(false); setEditPurchase(null); }
          }}
          suppliers={suppliers}
          inventoryItems={items as any}
          categories={categories as any}
          initialValues={editPurchase ?? undefined}
          onSave={editPurchase ? handleUpdatePurchase : handleSavePurchase}
          onInventoryItemCreated={async (data: any) => data}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletePending} onOpenChange={(open) => { if (!open) setDeletePending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> Eliminar compra
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar la compra de <strong>{deletePending?.supplierName}</strong>
              {deletePending?.invoiceId ? ` (${deletePending.invoiceId})` : ""}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePurchase}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
