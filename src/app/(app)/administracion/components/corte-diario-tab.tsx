// src/app/(app)/administracion/components/corte-diario-tab.tsx
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Scissors, CheckCircle2, Clock,
  TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { format, parseISO, isValid, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { capitalizeWords } from "@/lib/utils";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import type { CashDrawerTransaction, User } from "@/types";
import type { DailyCut } from "../hooks/use-admin-data";
import { DailyCutDialog } from "./dialogs/daily-cut-dialog";
import Link from "next/link";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(v: any): Date | null {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  const d = typeof v === "string" ? parseISO(v) : new Date(v);
  return isValid(d) ? d : null;
}

function isIncome(t: CashDrawerTransaction): boolean {
  const type = (t.type ?? "").toLowerCase();
  const relatedType = (t.relatedType ?? "").toLowerCase();
  const isDebit = type === "salida" || type === "out";
  const isExpenseSource = ["compra", "purchase", "gasto"].some((k) => relatedType.includes(k));
  return !isDebit && !isExpenseSource;
}

function getPaymentCategory(t: CashDrawerTransaction): "cash" | "card" | "transfer" {
  const m = (t.paymentMethod ?? t.method ?? "").toLowerCase();
  if (m.includes("tarjeta") || m.includes("card")) return "card";
  if (m.includes("transfer")) return "transfer";
  return "cash";
}

function getSourceLabel(t: CashDrawerTransaction): string {
  const rt = t.relatedType ?? "";
  const type = t.type ?? "";
  if (rt === "Servicio" || type === "Servicio") return "Servicio";
  if (rt === "Venta" || type === "Venta") return "Venta PDV";
  if (type === "Entrada" || type === "in") return "Entrada Manual";
  if (type === "Salida" || type === "out") return "Salida Manual";
  if (rt === "Compra" || rt === "Purchase") return "Compra";
  return type || rt || "Otro";
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  cashTransactions: CashDrawerTransaction[];
  dailyCuts: DailyCut[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CorteDiarioTab({ cashTransactions, dailyCuts }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [cutDialogOpen, setCutDialogOpen] = useState(false);
  const [currentUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) ?? "null"); } catch { return null; }
  });

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);
  const interval = { start: dayStart, end: dayEnd };

  // Transactions of the selected day
  const dayTxs = useMemo(() => {
    return cashTransactions.filter((t) => {
      const d = parseDate(t.date);
      return d && isWithinInterval(d, interval);
    });
  }, [cashTransactions, selectedDate]);

  // Breakdown calculations
  const breakdown = useMemo(() => {
    const init = () => ({ income: 0, expenses: 0, net: 0 });
    const cash = init(), card = init(), transfer = init();
    const bySource: Record<string, { total: number; count: number }> = {};

    for (const t of dayTxs) {
      const amount = Number(t.amount ?? 0);
      const income = isIncome(t);
      const cat = getPaymentCategory(t);
      const source = getSourceLabel(t);

      if (income) {
        cash.income += cat === "cash" ? amount : 0;
        card.income += cat === "card" ? amount : 0;
        transfer.income += cat === "transfer" ? amount : 0;
      } else {
        cash.expenses += cat === "cash" ? amount : 0;
        card.expenses += cat === "card" ? amount : 0;
        transfer.expenses += cat === "transfer" ? amount : 0;
      }

      if (!bySource[source]) bySource[source] = { total: 0, count: 0 };
      bySource[source].total += income ? amount : -amount;
      bySource[source].count += 1;
    }

    cash.net = cash.income - cash.expenses;
    card.net = card.income - card.expenses;
    transfer.net = transfer.income - transfer.expenses;

    const totalIncome = cash.income + card.income + transfer.income;
    const totalExpenses = cash.expenses + card.expenses + transfer.expenses;

    return {
      income: totalIncome,
      expenses: totalExpenses,
      net: totalIncome - totalExpenses,
      cash, card, transfer, bySource,
      count: dayTxs.length,
    };
  }, [dayTxs]);

  // Check if this day already has a saved cut
  const existingCut = useMemo(() => dailyCuts.find((c) => c.date === dateStr), [dailyCuts, dateStr]);

  const goDay = useCallback((delta: number) => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + delta);
      return next;
    });
  }, []);

  const formattedDate = capitalizeWords(format(selectedDate, "EEEE dd 'de' MMMM yyyy", { locale: es }));

  return (
    <>
      <div className="space-y-5">
        {/* Date navigator */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => goDay(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-bold text-base text-center min-w-[200px]">{formattedDate}</h3>
            <Button variant="outline" size="icon" onClick={() => goDay(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>Hoy</Button>
          </div>

          <div className="flex items-center gap-2">
            {existingCut ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Corte cerrado por {existingCut.closedByName}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-700 border-amber-400">
                <Clock className="h-3 w-3 mr-1" /> Sin corte
              </Badge>
            )}
            {!existingCut && (
              <Button size="sm" onClick={() => setCutDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Scissors className="mr-2 h-4 w-4" /> Cerrar Corte
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/administracion/cortes">Ver Historial</Link>
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Ingresos", value: breakdown.income, color: "text-emerald-600", icon: TrendingUp, bg: "bg-emerald-50 border-emerald-200" },
            { label: "Egresos", value: breakdown.expenses, color: "text-red-600", icon: TrendingDown, bg: "bg-red-50 border-red-200" },
            { label: "Neto del Día", value: breakdown.net, color: breakdown.net >= 0 ? "text-emerald-600" : "text-red-600", icon: Minus, bg: breakdown.net >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200" },
          ].map(({ label, value, color, icon: Icon, bg }) => (
            <Card key={label} className={`border ${bg} shadow-sm`}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className={cn("text-2xl font-black", color)}>{formatCurrency(value)}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
                </div>
                <Icon className={cn("h-8 w-8 opacity-20", color)} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Breakdown by method */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Por Método de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            {(["cash", "card", "transfer"] as const).map((method) => {
              const labels = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };
              const b = breakdown[method];
              return (
                <div key={method} className="text-center border rounded-xl p-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">{labels[method]}</p>
                  <p className="text-xs text-muted-foreground">Entradas: <span className="text-emerald-600 font-bold">{formatCurrency(b.income)}</span></p>
                  <p className="text-xs text-muted-foreground">Salidas: <span className="text-red-600 font-bold">{formatCurrency(b.expenses)}</span></p>
                  <p className={cn("mt-1 text-base font-black", b.net >= 0 ? "text-emerald-600" : "text-red-600")}>{formatCurrency(b.net)}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Transactions table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Transacciones del Día ({dayTxs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dayTxs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-black">
                    <TableRow>
                      <TableHead className="text-white text-xs">Hora</TableHead>
                      <TableHead className="text-white text-xs">Concepto</TableHead>
                      <TableHead className="text-white text-xs">Método</TableHead>
                      <TableHead className="text-white text-xs">Fuente</TableHead>
                      <TableHead className="text-white text-xs text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayTxs.map((t) => {
                      const d = parseDate(t.date);
                      const income = isIncome(t);
                      return (
                        <TableRow key={t.id} className="hover:bg-muted/40">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {d ? format(d, "HH:mm") : "—"}
                          </TableCell>
                          <TableCell className="text-xs max-w-[160px] truncate">{t.note || t.description || "—"}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px]">{t.paymentMethod || t.method || "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{getSourceLabel(t)}</TableCell>
                          <TableCell className="text-right text-xs font-bold">
                            <span className={cn("flex items-center justify-end gap-1", income ? "text-emerald-600" : "text-red-600")}>
                              {income ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                              {formatCurrency(Number(t.amount ?? 0))}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                Sin transacciones de taller en este día.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DailyCutDialog
        open={cutDialogOpen}
        onOpenChange={setCutDialogOpen}
        date={dateStr}
        breakdown={breakdown}
        currentUser={currentUser}
        onSaved={() => {}}
      />
    </>
  );
}
