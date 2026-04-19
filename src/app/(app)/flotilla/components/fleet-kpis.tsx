// src/app/(app)/flotilla/components/fleet-kpis.tsx
"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { MonthTotals } from "../hooks/use-fleet-data";
import { TrendingUp, TrendingDown, HandCoins, Landmark, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FleetKpisProps {
  totals: MonthTotals;
  activeDrivers: number;
}

export function FleetKpis({ totals, activeDrivers }: FleetKpisProps) {
  const kpis = useMemo(() => [
    {
      label: "Generado",
      value: totals.totalCharges,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/40",
      border: "border-blue-200/60",
      description: "Cargos del mes",
    },
    {
      label: "Cobrado",
      value: totals.totalPayments,
      icon: HandCoins,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-200/60",
      description: "Abonos recibidos",
    },
    {
      label: "Salidas",
      value: totals.expenses + totals.withdrawals,
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/40",
      border: "border-red-200/60",
      description: "Gastos + retiros",
    },
    {
      label: "Utilidad",
      value: totals.utility,
      icon: Landmark,
      color: totals.utility >= 0 ? "text-emerald-700" : "text-red-700",
      bg: totals.utility >= 0 ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-red-50 dark:bg-red-950/40",
      border: totals.utility >= 0 ? "border-emerald-200/60" : "border-red-200/60",
      description: "Cobrado − Salidas",
    },
    {
      label: "Adeudo Total",
      value: -totals.balance, // positive = they owe
      icon: AlertCircle,
      color: totals.balance < 0 ? "text-red-600" : "text-emerald-600",
      bg: totals.balance < 0 ? "bg-red-50 dark:bg-red-950/40" : "bg-emerald-50 dark:bg-emerald-950/40",
      border: totals.balance < 0 ? "border-red-200/60" : "border-emerald-200/60",
      description: `${activeDrivers} conductores`,
    },
  ], [totals, activeDrivers]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map(({ label, value, icon: Icon, color, bg, border, description }) => (
        <Card key={label} className={cn("border", border, bg, "shadow-none")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", bg)}>
                <Icon className={cn("h-3.5 w-3.5", color)} />
              </div>
            </div>
            <p className={cn("text-lg font-black font-mono leading-none", color)}>
              {formatCurrency(Math.abs(value))}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
