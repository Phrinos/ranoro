// src/app/(app)/servicios/components/shared/daily-earnings.tsx
"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Wrench, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ServiceRecord } from "@/types";
import { calcEffectiveProfit } from "@/lib/money-helpers";

interface DailyEarningsProps {
  services: ServiceRecord[];
}

export function DailyEarnings({ services }: DailyEarningsProps) {
  const stats = useMemo(() => {
    const delivered = services.filter((s) => s.status === "Entregado");
    const totalRevenue = delivered.reduce(
      (sum, s) => sum + Number(s.totalCost || (s as any).total || 0),
      0
    );
    const totalProfit = delivered.reduce((sum, s) => sum + calcEffectiveProfit(s), 0);
    const inShop = services.filter((s) => s.status === "En Taller").length;
    const scheduled = services.filter((s) => s.status === "Agendado").length;
    return { totalRevenue, totalProfit, inShop, scheduled, deliveredCount: delivered.length };
  }, [services]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <Card className="border-0 bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Cobrado hoy</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Ganancia</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(stats.totalProfit)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Wrench className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">En Taller</p>
            <p className="text-lg font-bold text-foreground">{stats.inShop}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-linear-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Entregados</p>
            <p className="text-lg font-bold text-foreground">{stats.deliveredCount}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
