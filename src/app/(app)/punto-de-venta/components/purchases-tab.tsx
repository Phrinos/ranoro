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
import { Search, PlusCircle, ChevronLeft, ChevronRight, ShoppingCart, AlertCircle } from "lucide-react";
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
    const total = filtered.reduce((s, p) => s + (p.invoiceTotal || 0), 0);
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

  const handleDeletePurchase = useCallback(async (purchaseId: string) => {
    try {
      const userStr = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      const user = userStr ? JSON.parse(userStr) : null;
      await purchaseService.deletePurchase(purchaseId, user);
      toast({ title: "Compra anulada" });
      setSelectedPurchase(null);
    } catch (e: any) {
      toast({ title: "Error al anular", description: e.message, variant: "destructive" });
    }
  }, [toast]);

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
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Proveedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proveedores</SelectItem>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Método pago" /></SelectTrigger>
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
                <TableHeader className="bg-black">
                  <TableRow>
                    <TableHead className="text-white">Fecha</TableHead>
                    <TableHead className="text-white">Folio</TableHead>
                    <TableHead className="text-white">Proveedor</TableHead>
                    <TableHead className="text-white">Artículos</TableHead>
                    <TableHead className="text-white">Método</TableHead>
                    <TableHead className="text-white text-right">Total</TableHead>
                    <TableHead className="text-white text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.length > 0 ? paged.map((p) => {
                    const d = parseAnyDate(p.invoiceDate);
                    const isCredit = p.paymentMethod === "Crédito";
                    const hasDebt = payables.some((a) => a.purchaseId === p.id && a.status === "pending");
                    return (
                      <TableRow
                        key={p.id}
                        className="hover:bg-muted/40 cursor-pointer"
                        onClick={() => setSelectedPurchase(p)}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {d ? format(d, "dd/MM/yyyy", { locale: es }) : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.invoiceId || p.id.slice(-6)}</TableCell>
                        <TableCell className="font-medium text-sm">{p.supplierName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.items?.length ?? 0} artículos</TableCell>
                        <TableCell>
                          <Badge variant={isCredit ? "outline-solid" : "secondary"} className={cn("text-[11px]", isCredit && "border-amber-400 text-amber-700")}>
                            {p.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(p.invoiceTotal)}</TableCell>
                        <TableCell className="text-center">
                          {isCredit && hasDebt ? (
                            <Badge variant="outline" className="border-amber-400 text-amber-700 text-[10px]">
                              <AlertCircle className="h-3 w-3 mr-1" /> Pendiente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-400 text-emerald-700 text-[10px]">Pagado</Badge>
                          )}
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

      {/* Register Purchase Dialog — reuses the old module's dialog which is fully functional */}
      {dialogOpen && (
        <RegisterPurchaseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          suppliers={suppliers}
          inventoryItems={items as any}
          categories={categories as any}
          onSave={handleSavePurchase}
          onInventoryItemCreated={async (data: any) => {
            // New items should go to inventoryItems collection — handled by the item dialog separately
            return data;
          }}
        />
      )}
    </>
  );
}
