// src/app/(app)/servicios/components/shared/history-summary.tsx
"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, DollarSign, TrendingUp, Wallet, CreditCard, Landmark } from "lucide-react";
import { formatCurrency, getPaymentMethodVariant } from "@/lib/utils";
import { calcEffectiveProfit } from "@/lib/money-helpers";
import type { ServiceRecord, PaymentMethod } from "@/types";

const toNumber = (v: unknown): number => {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};

const PAYMENT_ICONS: Partial<Record<PaymentMethod, React.ElementType>> = {
  Efectivo: Wallet,
  Tarjeta: CreditCard,
  "Tarjeta 3 MSI": CreditCard,
  "Tarjeta 6 MSI": CreditCard,
  Transferencia: Landmark,
  "Transferencia/Contadora": Landmark,
};

interface HistorySummaryProps {
  filteredServices: ServiceRecord[];
}

export function HistorySummary({ filteredServices }: HistorySummaryProps) {
  const stats = useMemo(() => {
    const delivered = filteredServices.filter((s) => s.status === "Entregado");
    const count = delivered.length;

    const getRevenue = (s: ServiceRecord) => {
      if (Array.isArray(s.payments) && s.payments.length > 0) {
        return s.payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
      }
      return toNumber((s as any).totalCost ?? 0);
    };

    let totalRevenue = 0;
    const byMethod = new Map<PaymentMethod, { count: number; total: number }>();

    delivered.forEach((s) => {
      const rev = getRevenue(s);
      totalRevenue += rev;

      if (s.payments && s.payments.length > 0) {
        s.payments.forEach((p) => {
          const key = p.method as PaymentMethod;
          const cur = byMethod.get(key) || { count: 0, total: 0 };
          byMethod.set(key, { count: cur.count + 1, total: cur.total + toNumber(p.amount) });
        });
      } else if ((s as any).paymentMethod) {
        const key = (s as any).paymentMethod as PaymentMethod;
        const cur = byMethod.get(key) || { count: 0, total: 0 };
        byMethod.set(key, { count: cur.count + 1, total: cur.total + rev });
      }
    });

    const totalProfit = delivered.reduce((sum, s) => sum + calcEffectiveProfit(s), 0);
    return { count, totalRevenue, totalProfit, byMethod };
  }, [filteredServices]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Servicios en Periodo</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.count}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            Ganancia: {formatCurrency(stats.totalProfit)}
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Por Método de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          {Array.from(stats.byMethod.entries()).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Array.from(stats.byMethod.entries()).map(([method, data]) => {
                const Ico = PAYMENT_ICONS[method] ?? Wallet;
                return (
                  <Badge key={method} variant={getPaymentMethodVariant(method) as any} className="text-sm gap-1">
                    <Ico className="h-3 w-3" />
                    {method}: <span className="font-semibold">{formatCurrency(data.total)}</span>
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
