// src/app/(app)/administracion/components/resumen-mensual-tab.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, capitalizeWords } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, isWithinInterval, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { ServiceRecord, SaleReceipt, CashDrawerTransaction, User } from "@/types";
import type { AdminPurchase, FixedExpense } from "../hooks/use-admin-data";

interface Props {
  services: ServiceRecord[];
  sales: SaleReceipt[];
  cashTransactions: CashDrawerTransaction[];
  purchases: AdminPurchase[];
  fixedExpenses: FixedExpense[];
  users: User[];
}

function parseAnyDate(v: any): Date | null {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  const d = typeof v === "string" ? parseISO(v) : new Date(v);
  return isValid(d) ? d : null;
}

function generateMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ value: format(d, "yyyy-MM"), label: capitalizeWords(format(d, "MMMM yyyy", { locale: es })) });
  }
  return opts;
}

export function ResumenMensualTab({ services, sales, cashTransactions, purchases, fixedExpenses, users }: Props) {
  const monthOptions = useMemo(generateMonthOptions, []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value ?? "");

  const kpis = useMemo(() => {
    if (!selectedMonth) return null;
    const [year, month] = selectedMonth.split("-").map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(start);
    const interval = { start, end };

    const inInterval = (v: any) => { const d = parseAnyDate(v); return d && isValid(d) && isWithinInterval(d, interval); };

    // Services delivered
    const deliveredServices = services.filter((s) => s.status === "Entregado" && inInterval((s as any).deliveryDateTime ?? (s as any).completedAt ?? (s as any).createdAt));
    const serviceRevenue = deliveredServices.reduce((s, sv) => s + (Number((sv as any).totalCost ?? (sv as any).total ?? 0)), 0);

    // POS sales
    const completedSales = sales.filter((s) => s.status === "Completado" && inInterval((s as any).saleDate));
    const saleRevenue = completedSales.reduce((s, sv) => s + (sv.totalAmount ?? 0), 0);

    // Cash entries / exits
    const txInMonth = cashTransactions.filter((t) => inInterval(t.date));
    const manualIncome = txInMonth.filter((t) => t.type === "Entrada" || t.type === "in").reduce((s, t) => s + Number(t.amount ?? 0), 0);
    const manualExpenses = txInMonth.filter((t) => t.type === "Salida" || t.type === "out").reduce((s, t) => s + Number(t.amount ?? 0), 0);

    // Purchases
    const monthPurchases = purchases.filter((p) => inInterval(p.invoiceDate));
    const purchaseCost = monthPurchases.reduce((s, p) => {
      const t = (p.invoiceTotal && p.invoiceTotal > 0)
        ? p.invoiceTotal
        : ((p as any).items ?? []).reduce((si: number, it: any) =>
            si + (Number(it.purchasePrice) || 0) * (Number(it.quantity) || 1), 0);
      return s + t;
    }, 0);

    // Fixed expenses (active, monthly estimate)
    // isActive undefined → treat as active (resilient to legacy docs without the field)
    const fixedTotal = fixedExpenses
      .filter((e) => (e as any).isActive !== false && (e as any).active !== false)
      .reduce((s, e) => {
        const rawAmount = (e as any).amount ?? (e as any).monto ?? (e as any).monthlyAmount ?? (e as any).cost ?? 0;
        const amount = Number(rawAmount) || 0;
        const freq = (e as any).frequency ?? (e as any).frecuencia ?? "mensual";
        const m = freq === "quincenal" ? 2 : freq === "semanal" ? 4.33 : 1;
        return s + amount * m;
      }, 0);

    // Payroll — sum of monthlySalary for all non-archived users
    const totalPayroll = users
      .filter((u) => !u.isArchived)
      .reduce((s, u) => s + (Number(u.monthlySalary) || 0), 0);

    const totalRevenue = serviceRevenue + saleRevenue + manualIncome;
    const totalExpenses = manualExpenses + purchaseCost + fixedTotal + totalPayroll;
    const netProfit = totalRevenue - totalExpenses;

    return {
      serviceRevenue,
      saleRevenue,
      manualIncome,
      manualExpenses,
      purchaseCost,
      fixedTotal,
      totalPayroll,
      totalRevenue,
      totalExpenses,
      netProfit,
      serviceCount: deliveredServices.length,
      saleCount: completedSales.length,
      purchaseCount: monthPurchases.length,
      staffCount: users.filter((u) => !u.isArchived).length,
    };
  }, [selectedMonth, services, sales, cashTransactions, purchases, fixedExpenses, users]);

  if (!kpis) return <div className="text-muted-foreground text-center py-12">Selecciona un mes.</div>;

  const rows = [
    { label: "Ingresos por Servicios", value: kpis.serviceRevenue, note: `${kpis.serviceCount} servicios entregados`, color: "text-emerald-600" },
    { label: "Ingresos por Ventas PDV", value: kpis.saleRevenue, note: `${kpis.saleCount} ventas completadas`, color: "text-emerald-600" },
    { label: "Ingresos Manuales", value: kpis.manualIncome, color: "text-emerald-600" },
    { label: "Compras / Insumos", value: -kpis.purchaseCost, note: `${kpis.purchaseCount} compras`, color: "text-red-600", isExpense: true },
    { label: "Sueldos / Nómina", value: -kpis.totalPayroll, note: `${kpis.staffCount} empleados activos`, color: "text-red-600", isExpense: true },
    { label: "Gastos Fijos (estimado)", value: -kpis.fixedTotal, color: "text-amber-600", isExpense: true },
    { label: "Salidas Manuales", value: -kpis.manualExpenses, color: "text-red-600", isExpense: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold">Resumen Financiero</h3>
          <p className="text-sm text-muted-foreground">Estado de resultados estimado del mes.</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px] bg-white border-slate-200"><SelectValue /></SelectTrigger>
          <SelectContent>{monthOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Ingresos", value: kpis.totalRevenue, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Total Egresos", value: kpis.totalExpenses, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          { label: "Utilidad Neta", value: kpis.netProfit, color: kpis.netProfit >= 0 ? "text-emerald-600" : "text-red-600", bg: kpis.netProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200" },
        ].map(({ label, value, color, bg }) => (
          <Card key={label} className={`border ${bg}`}>
            <CardContent className="p-5">
              <p className={`text-2xl font-black ${color}`}>{formatCurrency(value)}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
              {label === "Utilidad Neta" && (
                <p className="text-xs text-muted-foreground mt-1">Margen: {kpis.totalRevenue > 0 ? ((kpis.netProfit / kpis.totalRevenue) * 100).toFixed(1) : 0}%</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desglose Detallado</CardTitle>
          <CardDescription>Comparativa de todas las fuentes de ingreso y egreso del mes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rows.map(({ label, value, note, color }) => (
              <div key={label} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
                </div>
                <p className={`font-bold text-sm ${color}`}>{formatCurrency(Math.abs(value))}</p>
              </div>
            ))}
            {/* Net line */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t-2 border-foreground/10">
              <p className="font-black text-base">Resultado del Mes</p>
              <p className={`font-black text-xl ${kpis.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(kpis.netProfit)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
