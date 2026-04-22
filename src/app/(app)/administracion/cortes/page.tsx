// src/app/(app)/administracion/cortes/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { withSuspense } from "@/lib/withSuspense";
import { useAdminData, type DailyCut } from "../hooks/use-admin-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, capitalizeWords } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, CheckCircle2, Loader2, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { Loader2 as SpinIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function generateMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ value: format(d, "yyyy-MM"), label: capitalizeWords(format(d, "MMMM yyyy", { locale: es })) });
  }
  return opts;
}

function CutCard({ cut }: { cut: DailyCut }) {
  const [expanded, setExpanded] = useState(false);
  const d = (() => {
    try { return new Date(cut.date + "T12:00:00"); } catch { return null; }
  })();

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpanded(!expanded)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="font-semibold capitalize">
                {d ? format(d, "EEEE dd 'de' MMMM", { locale: es }) : cut.date}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cerrado por <span className="font-medium">{cut.closedByName}</span>
              {cut.closedAt ? ` · ${(() => { try { return format(new Date(cut.closedAt), "HH:mm", { locale: es }); } catch { return ""; } })()}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">{cut.transactionCount} transacciones</p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-lg font-black ${cut.netBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(cut.netBalance)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              <span className="text-emerald-600">+{formatCurrency(cut.income)}</span>
              {" / "}
              <span className="text-red-600">-{formatCurrency(cut.expenses)}</span>
            </p>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-2">
            {/* By method */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(["cash", "card", "transfer"] as const).map((m) => {
                const labels = { cash: "Efectivo", card: "Tarjeta", transfer: "Transf." };
                const b = cut.breakdown?.[m];
                if (!b) return null;
                return (
                  <div key={m} className="bg-muted/40 rounded-lg p-2 text-center">
                    <p className="text-muted-foreground text-[10px] uppercase">{labels[m]}</p>
                    <p className={`font-bold ${b.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(b.net)}</p>
                  </div>
                );
              })}
            </div>
            {/* By source */}
            {cut.bySource && Object.keys(cut.bySource).length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Por Fuente</p>
                {Object.entries(cut.bySource).map(([src, data]) => (
                  <div key={src} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{src}</span>
                    <span className={`font-bold ${data.total >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(Math.abs(data.total))} ({data.count} txs)
                    </span>
                  </div>
                ))}
              </div>
            )}
            {cut.notes && (
              <p className="text-xs text-muted-foreground italic mt-1">📝 {cut.notes}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CortesHistorialPage() {
  const router = useRouter();
  const { dailyCuts, isLoading } = useAdminData();
  const monthOptions = useMemo(generateMonthOptions, []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value ?? "");

  const filtered = useMemo(() => {
    if (!selectedMonth) return dailyCuts;
    return dailyCuts.filter((c) => c.date?.startsWith(selectedMonth));
  }, [dailyCuts, selectedMonth]);

  const summary = useMemo(() => ({
    totalIncome: filtered.reduce((s, c) => s + c.income, 0),
    totalExpenses: filtered.reduce((s, c) => s + c.expenses, 0),
    netBalance: filtered.reduce((s, c) => s + c.netBalance, 0),
    count: filtered.length,
  }), [filtered]);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <Link href="/administracion" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" /> Volver a Administración
        </Link>
        <h1 className="text-2xl font-black">Historial de Cortes</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Todos los cortes de caja cerrados del taller.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar por mes…" /></SelectTrigger>
          <SelectContent>{monthOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{filtered.length} corte{filtered.length !== 1 ? "s" : ""} en el período</p>
      </div>

      {/* Summary KPIs */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Ingresos", value: summary.totalIncome, color: "text-emerald-600" },
            { label: "Total Egresos", value: summary.totalExpenses, color: "text-red-600" },
            { label: "Balance Neto", value: summary.netBalance, color: summary.netBalance >= 0 ? "text-emerald-600" : "text-red-600" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className={`font-black text-xl ${color}`}>{formatCurrency(value)}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cuts list */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((cut) => <CutCard key={cut.id} cut={cut} />)
        ) : (
          <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-2xl">
            <CheckCircle2 className="mx-auto h-10 w-10 mb-3 opacity-20" />
            <p>No hay cortes cerrados en este período.</p>
            <Button asChild variant="link" className="mt-2">
              <Link href="/administracion">Ir a Corte de Caja</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default withSuspense(CortesHistorialPage, null);
