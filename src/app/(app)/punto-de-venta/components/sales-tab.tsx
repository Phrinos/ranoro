// src/app/(app)/punto-de-venta/components/sales-tab.tsx
"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, cn } from "@/lib/utils";
import { format, isValid, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Search, ChevronLeft, ChevronRight, Receipt, Eye, Share2, Copy } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { saleService } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import Link from "next/link";
import type { SaleReceipt } from "@/types";
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";
import { TicketContent } from "@/app/(app)/ticket/components";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

const PAGE_SIZE = 25;

function parseAnyDate(v: any): Date | null {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  const d = typeof v === "string" ? parseISO(v) : new Date(v);
  return isValid(d) ? d : null;
}

interface Props {
  sales: SaleReceipt[];
}

const STATUS_COLORS: Record<string, string> = {
  Completado: "border-emerald-400 text-emerald-700",
  Cancelado: "border-red-400 text-red-600",
  Pendiente: "border-amber-400 text-amber-700",
};

export function SalesTab({ sales }: Props) {
  const { toast } = useToast();
  const ticketRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });
  const [page, setPage] = useState(1);
  const [ticketSale, setTicketSale] = useState<SaleReceipt | null>(null);
  const [workshopInfo] = useState<any>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem("workshopTicketInfo") ?? "null"); } catch { return null; }
  });

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const q = search.trim().toLowerCase();
      if (q && !`${s.id} ${(s as any).customerName ?? ""}`.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (dateRange?.from) {
        const d = parseAnyDate((s as any).saleDate);
        if (!d) return false;
        const interval = { start: dateRange.from, end: dateRange.to ?? dateRange.from };
        if (!isWithinInterval(d, interval)) return false;
      }
      return true;
    });
  }, [sales, search, statusFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpis = useMemo(() => {
    const completed = filtered.filter((s) => s.status === "Completado");
    return {
      count: completed.length,
      total: completed.reduce((s, v) => s + (v.totalAmount || 0), 0),
      avg: completed.length ? completed.reduce((s, v) => s + (v.totalAmount || 0), 0) / completed.length : 0,
    };
  }, [filtered]);

  const handleCopy = useCallback(async () => {
    if (!ticketRef.current || !ticketSale) return;
    try {
      const canvas = await html2canvas(ticketRef.current, { scale: 2.5, backgroundColor: null, useCORS: true });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error();
      const _CI = (window as any).ClipboardItem ?? (globalThis as any).ClipboardItem;
      if (_CI && (navigator.clipboard as any)?.write) {
        await (navigator.clipboard as any).write([new _CI({ "image/png": blob })]);
        toast({ title: "Imagen copiada" });
      } else {
        toast({ title: "No disponible", description: "Tu navegador no soporta copiar imágenes." });
      }
    } catch {
      toast({ title: "Error al copiar", variant: "destructive" });
    }
  }, [ticketRef, ticketSale, toast]);

  const handleShare = useCallback(async () => {
    if (!ticketRef.current || !ticketSale) return;
    try {
      const canvas = await html2canvas(ticketRef.current, { scale: 2.5, backgroundColor: null, useCORS: true });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) return;
      const file = new File([blob], `ticket_${ticketSale.id}.png`, { type: "image/png" });
      if ((navigator as any).share) {
        await (navigator as any).share({ files: [file], title: "Ticket de Venta" });
      } else {
        const name = (ticketSale as any).customerName || "Cliente";
        const total = formatCurrency(ticketSale.totalAmount);
        const text = `Hola ${name}, aquí tu ticket de compra.\nFolio: ${ticketSale.id.slice(-6)}\nTotal: ${total}\n¡Gracias!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      }
    } catch (e) {
      if (!String(e).includes("AbortError")) toast({ title: "Error al compartir", variant: "destructive" });
    }
  }, [ticketRef, ticketSale, toast]);

  return (
    <>
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Ventas completadas", value: kpis.count.toString() },
            { label: "Total del período", value: formatCurrency(kpis.total), color: "text-emerald-600" },
            { label: "Ticket promedio", value: formatCurrency(kpis.avg) },
          ].map(({ label, value, color }) => (
            <Card key={label} className="shadow-xs">
              <CardContent className="p-4">
                <p className={cn("text-xl font-black", color)}>{value}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start sm:items-center justify-between">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar folio, cliente…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" />
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {["all", "Completado", "Cancelado", "Pendiente"].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                  statusFilter === s ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:border-foreground"
                )}
              >
                {s === "all" ? "Todos" : s}
              </button>
            ))}
            <DatePickerWithRange date={dateRange} onDateChange={(d) => { setDateRange(d); setPage(1); }} />
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/punto-de-venta/nueva-venta">Nueva Venta</Link>
          </Button>
        </div>

        {/* Table */}
        <div className="hidden md:block">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Folio</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Ítems</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length > 0 ? paged.map((sale) => {
                      const d = parseAnyDate((sale as any).saleDate);
                      return (
                        <TableRow key={sale.id} className="hover:bg-muted/40">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {d ? format(d, "dd/MM/yy HH:mm", { locale: es }) : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{sale.id.slice(-6).toUpperCase()}</TableCell>
                          <TableCell className="text-sm">{(sale as any).customerName || "Mostrador"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{sale.items?.length ?? 0} ítems</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn("text-[11px]", STATUS_COLORS[sale.status ?? ""] ?? "")}>
                              {sale.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(sale.totalAmount)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTicketSale(sale)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                          <Receipt className="mx-auto h-8 w-8 mb-2 opacity-20" />
                          No hay ventas en este período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards — mobile */}
        <div className="grid gap-3 md:hidden">
          {paged.map((sale) => {
            const d = parseAnyDate((sale as any).saleDate);
            return (
              <Card key={sale.id} className="cursor-pointer hover:shadow-md" onClick={() => setTicketSale(sale)}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm">#{sale.id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{(sale as any).customerName || "Mostrador"}</p>
                    <p className="text-[11px] text-muted-foreground">{d ? format(d, "dd/MM/yy HH:mm", { locale: es }) : "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-base">{formatCurrency(sale.totalAmount)}</p>
                    <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[sale.status ?? ""] ?? "")}>
                      {sale.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {paged.length === 0 && (
            <div className="text-center text-muted-foreground py-12">Sin ventas en este período.</div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {/* Ticket preview */}
      {ticketSale && (
        <UnifiedPreviewDialog
          open={!!ticketSale}
          onOpenChange={(v) => !v && setTicketSale(null)}
          title={`Ticket Venta #${ticketSale.id.slice(-6)}`}
          sale={ticketSale}
          footerContent={
            <div className="flex w-full justify-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-11 w-11 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" onClick={handleCopy}>
                      <Copy className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Copiar imagen</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-11 w-11 bg-green-50 text-green-700 border-green-200 hover:bg-green-100" onClick={handleShare}>
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Compartir / WhatsApp</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
        >
          <TicketContent ref={ticketRef} sale={ticketSale} previewWorkshopInfo={workshopInfo || undefined} />
        </UnifiedPreviewDialog>
      )}
    </>
  );
}
