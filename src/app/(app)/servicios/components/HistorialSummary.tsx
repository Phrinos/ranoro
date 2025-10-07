// src/app/(app)/servicios/components/HistorialSummary.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, DollarSign, TrendingUp, Wallet, CreditCard, Landmark } from 'lucide-react';
import { formatCurrency, getPaymentMethodVariant } from '@/lib/utils';
import { calcEffectiveProfit } from '@/lib/money-helpers';
import type { ServiceRecord, Payment } from '@/types';

// Helper local para convertir valores a número de forma segura
const toNumber = (v: unknown): number => {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    const n = parseFloat(String(v ?? 0));
    return Number.isFinite(n) ? n : 0;
};

// Hook personalizado para encapsular la lógica de cálculo
function useHistorialSummary(filteredServices: ServiceRecord[]) {
    return useMemo(() => {
        const deliveredServices = filteredServices.filter((s) => s.status === "Entregado");
        const servicesCount = deliveredServices.length;

        const getServiceRevenue = (s: ServiceRecord) => {
            if (Array.isArray(s.payments) && s.payments.length > 0) {
                return s.payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
            }
            return toNumber((s as any).totalCost ?? 0);
        };

        let totalRevenue = 0;
        const paymentsSummary = new Map<Payment['method'], { count: number; total: number }>();

        deliveredServices.forEach((s) => {
            const revenue = getServiceRevenue(s);
            totalRevenue += revenue;

            if (s.payments && s.payments.length > 0) {
                s.payments.forEach((p) => {
                    const key = p.method as Payment["method"];
                    const amt = toNumber(p.amount);
                    const current = paymentsSummary.get(key) || { count: 0, total: 0 };
                    current.count += 1;
                    current.total += amt;
                    paymentsSummary.set(key, current);
                });
            } else if ((s as any).paymentMethod) {
                const key = (s as any).paymentMethod as Payment["method"];
                const current = paymentsSummary.get(key) || { count: 0, total: 0 };
                current.count += 1;
                current.total += revenue;
                paymentsSummary.set(key, current);
            }
        });

        const totalProfit = deliveredServices.reduce((sum, s) => sum + calcEffectiveProfit(s), 0);

        return { servicesCount, totalRevenue, totalProfit, paymentsSummary };
    }, [filteredServices]);
}

const paymentMethodIcons: Record<Payment["method"], React.ElementType> = {
  Efectivo: Wallet,
  Tarjeta: CreditCard,
  "Tarjeta MSI": CreditCard,
  Transferencia: Landmark,
};

interface HistorialSummaryProps {
  filteredServices: ServiceRecord[];
}

export function HistorialSummary({ filteredServices }: HistorialSummaryProps) {
  const summaryData = useHistorialSummary(filteredServices);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Servicios en Periodo</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summaryData.servicesCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos Totales (Periodo)</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summaryData.totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            Ganancia: {formatCurrency(summaryData.totalProfit)}
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Ingresos por Método de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          {Array.from(summaryData.paymentsSummary.entries()).length > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {Array.from(summaryData.paymentsSummary.entries()).map(([method, data]) => {
                const Icon = paymentMethodIcons[method as keyof typeof paymentMethodIcons] || Wallet;
                let variant: "lightGreen" | "lightPurple" | "blue" | "secondary" = "secondary";
                if (method === "Efectivo") variant = "lightGreen";
                if (method.includes("Tarjeta")) variant = "lightPurple";
                if (method === "Transferencia") variant = "blue";
                return (
                  <Badge key={method} variant={variant} className="text-sm">
                    <Icon className="h-3 w-3 mr-1" />
                    {method}: <span className="font-semibold ml-1">{formatCurrency(data.total)}</span>
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay pagos registrados en este periodo.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
