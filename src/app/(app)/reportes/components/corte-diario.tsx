// src/app/(app)/reportes/components/corte-diario.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, cn } from "@/lib/utils";
import { format, isValid, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { parseDate } from "@/lib/forms";
import type { CashDrawerTransaction } from "@/types";
import { exportToCsv } from "@/lib/services/export.service";
import {
  TrendingUp, TrendingDown, DollarSign, Download, ChevronLeft, ChevronRight,
  Car, Wrench, ShoppingCart, BarChart3, Banknote, Receipt, ArrowRight
} from "lucide-react";

interface CorteDiarioProps {
  cashTransactions: CashDrawerTransaction[];
}

const SOURCE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  Flotilla:       { label: "Flotilla",       icon: Car,        color: "bg-blue-100 text-blue-700 border-blue-200" },
  GastoVehiculo:  { label: "Gasto Flotilla", icon: Car,        color: "bg-orange-100 text-orange-700 border-orange-200" },
  RetiroSocio:    { label: "Retiro Socio",   icon: Banknote,   color: "bg-purple-100 text-purple-700 border-purple-200" },
  Compra:         { label: "Compra",         icon: ShoppingCart, color: "bg-red-100 text-red-700 border-red-200" },
  Servicio:       { label: "Servicio Taller",icon: Wrench,     color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  Venta:          { label: "Venta POS",      icon: Receipt,    color: "bg-green-100 text-green-700 border-green-200" },
  Manual:         { label: "Manual",         icon: DollarSign, color: "bg-gray-100 text-gray-700 border-gray-200" },
};

function getSourceMeta(relatedType?: string) {
  if (!relatedType) return SOURCE_META["Manual"];
  return SOURCE_META[relatedType] ?? SOURCE_META["Manual"];
}

export function CorteDiario({ cashTransactions }: CorteDiarioProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dayTxs = useMemo(() => {
    const interval = {
      start: startOfDay(selectedDate),
      end: endOfDay(selectedDate),
    };
    return cashTransactions.filter((t) => {
      const d = parseDate(t.date);
      return d && isValid(d) && isWithinInterval(d, interval);
    });
  }, [cashTransactions, selectedDate]);

  const kpis = useMemo(() => {
    const entradas = dayTxs.filter((t) => t.type === "Entrada" || (t.type as string) === "in");
    const salidas  = dayTxs.filter((t) => t.type === "Salida"  || (t.type as string) === "out");
    const totalEntradas = entradas.reduce((s, t) => s + (t.amount || 0), 0);
    const totalSalidas  = salidas.reduce((s, t) => s + (t.amount || 0), 0);
    return { totalEntradas, totalSalidas, balance: totalEntradas - totalSalidas, entradas, salidas };
  }, [dayTxs]);

  // Group by source
  const bySource = useMemo(() => {
    const map: Record<string, { label: string; total: number; count: number; isIncome: boolean }> = {};
    dayTxs.forEach((t) => {
      const key = t.relatedType || "Manual";
      const isIncome = t.type === "Entrada" || (t.type as string) === "in";
      if (!map[key]) map[key] = { label: getSourceMeta(key).label, total: 0, count: 0, isIncome };
      map[key].total += t.amount || 0;
      map[key].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [dayTxs]);

  const goToPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const goToNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) setSelectedDate(d);
  };
  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  const handleExport = () => {
    exportToCsv({
      data: dayTxs.map((t) => ({
        fecha: t.date ? format(parseDate(t.date)!, "dd/MM/yyyy HH:mm") : "",
        tipo: t.type,
        concepto: t.concept,
        monto: t.amount,
        metodo: t.paymentMethod || "N/A",
        origen: t.relatedType || "Manual",
        responsable: t.userName || "Sistema",
      })),
      headers: [
        { key: "fecha", label: "Fecha" },
        { key: "tipo", label: "Tipo" },
        { key: "concepto", label: "Concepto" },
        { key: "monto", label: "Monto" },
        { key: "metodo", label: "Método" },
        { key: "origen", label: "Origen" },
        { key: "responsable", label: "Responsable" },
      ],
      fileName: `corte_diario_${format(selectedDate, "yyyy-MM-dd")}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* DATE NAV */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Corte Diario de Caja</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Control de ingresos y egresos por día.</p>
        </div>
        <div className="flex items-center gap-2 bg-card border rounded-xl px-4 py-2 shadow-sm">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={goToPrevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[140px]">
            <p className="font-bold text-base capitalize">{format(selectedDate, "EEEE", { locale: es })}</p>
            <p className="text-sm text-muted-foreground">{format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}</p>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={goToNextDay} disabled={isToday}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button size="sm" variant="outline" className="ml-2 text-xs" onClick={() => setSelectedDate(new Date())}>
              Hoy
            </Button>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="bg-emerald-500 p-2 rounded-xl">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-[10px] uppercase font-bold">
                Ingresos
              </Badge>
            </div>
            <p className="text-3xl font-black text-emerald-700">{formatCurrency(kpis.totalEntradas)}</p>
            <p className="text-xs text-emerald-600/70 mt-1 font-medium">{kpis.entradas.length} movimientos de entrada</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white shadow-sm overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="bg-red-500 p-2 rounded-xl">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 text-[10px] uppercase font-bold">
                Egresos
              </Badge>
            </div>
            <p className="text-3xl font-black text-red-700">{formatCurrency(kpis.totalSalidas)}</p>
            <p className="text-xs text-red-600/70 mt-1 font-medium">{kpis.salidas.length} movimientos de salida</p>
          </CardContent>
        </Card>

        <Card className={cn("border-2 shadow-sm overflow-hidden", kpis.balance >= 0 ? "border-blue-200 bg-gradient-to-br from-blue-50 to-white" : "border-orange-200 bg-gradient-to-br from-orange-50 to-white")}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn("p-2 rounded-xl", kpis.balance >= 0 ? "bg-blue-500" : "bg-orange-500")}>
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", kpis.balance >= 0 ? "text-blue-700 border-blue-300 bg-blue-50" : "text-orange-700 border-orange-300 bg-orange-50")}>
                Balance Neto
              </Badge>
            </div>
            <p className={cn("text-3xl font-black", kpis.balance >= 0 ? "text-blue-700" : "text-orange-700")}>
              {formatCurrency(Math.abs(kpis.balance))}
            </p>
            <p className={cn("text-xs mt-1 font-medium", kpis.balance >= 0 ? "text-blue-600/70" : "text-orange-600/70")}>
              {kpis.balance >= 0 ? "Superávit del día" : "Déficit del día"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SOURCE BREAKDOWN */}
      {bySource.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {bySource.map(([key, data]) => {
            const meta = getSourceMeta(key);
            const Icon = meta.icon;
            return (
              <div key={key} className={cn("rounded-xl border p-3 flex items-center gap-3", meta.color)}>
                <div className="p-1.5 rounded-lg bg-white/60">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold tracking-wider opacity-70 truncate">{data.label}</p>
                  <p className="font-bold text-sm">{formatCurrency(data.total)}</p>
                  <p className="text-[10px] opacity-60">{data.count} mov.</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TRANSACTION TABLE */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Detalle de Movimientos</CardTitle>
            <CardDescription>{dayTxs.length} transacciones en este día</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {dayTxs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Sin movimientos en este día</p>
              <p className="text-sm mt-1 text-muted-foreground/70">Prueba seleccionando otro día del calendario.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-black">
                  <TableRow>
                    <TableHead className="text-white">Hora</TableHead>
                    <TableHead className="text-white">Origen</TableHead>
                    <TableHead className="text-white">Concepto</TableHead>
                    <TableHead className="text-white">Método</TableHead>
                    <TableHead className="text-white text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...dayTxs]
                    .sort((a, b) => {
                      const da = parseDate(a.date)?.getTime() ?? 0;
                      const db = parseDate(b.date)?.getTime() ?? 0;
                      return db - da;
                    })
                    .map((t) => {
                      const isIncome = t.type === "Entrada" || (t.type as string) === "in";
                      const meta = getSourceMeta(t.relatedType);
                      const parsedDate = parseDate(t.date);
                      return (
                        <TableRow key={t.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {parsedDate && isValid(parsedDate) ? format(parsedDate, "HH:mm") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px] uppercase font-bold border", meta.color)}>
                              {meta.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate text-sm font-medium" title={t.concept}>
                            {t.concept}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{t.paymentMethod || "N/A"}</TableCell>
                          <TableCell className={cn("text-right font-bold whitespace-nowrap", isIncome ? "text-emerald-600" : "text-red-600")}>
                            {isIncome ? "+" : "−"} {formatCurrency(t.amount || 0)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
