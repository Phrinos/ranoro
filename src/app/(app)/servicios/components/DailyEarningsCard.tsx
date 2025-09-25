"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { parseISO, isValid, startOfDay, endOfDay } from "date-fns";
import type { ServiceRecord } from "@/types";

function asDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = parseISO(iso); // "2025-09-24T19:07:51.146Z" -> Date local
  return isValid(d) ? d : null;
}

function toNumberLoose(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") return Number(v.replace(/[^\d.-]/g, "")) || 0;
  return 0;
}

function getAmount(s: any): number {
  // Principal: 'Total' (number). Fallbacks si algún registro trae otras claves:
  return toNumberLoose(s?.Total ?? s?.total ?? s?.payments?.Total ?? s?.payments?.total ?? 0);
}

/** Hash barato para reaccionar a cambios aunque muten el array in-place */
function servicesHash(services: ServiceRecord[]): string {
  try {
    return services
      .map((s: any) => [
        s?.id ?? "",
        s?.status ?? "",
        s?.deliveryDateTime ?? "",
        getAmount(s),
      ].join("|"))
      .join("~");
  } catch {
    // En caso extremo, forzamos recomputando siempre
    return String(Math.random());
  }
}

interface DailyEarningsCardProps {
  services: ServiceRecord[];
}

export function DailyEarningsCard({ services }: DailyEarningsCardProps) {
  const hash = useMemo(() => servicesHash(services), [services]); // <- cambia si cambian campos relevantes

  const { sum, count } = useMemo(() => {
    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);

    let sum = 0;
    let count = 0;

    for (const s of services) {
      const anyS = s as any;
      if (anyS.status !== "Entregado") continue;

      const deliveredAt = asDate(anyS.deliveryDateTime);
      if (!deliveredAt || deliveredAt < start || deliveredAt > end) continue;

      const amount = getAmount(anyS);
      sum += amount;
      count++;
      
      if (process.env.NODE_ENV !== "production") {
        console.debug(
          "[DailyEarningsCard] id:", anyS.id,
          "| delivery:", anyS.deliveryDateTime,
          "| amount:", amount
        );
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.debug("[DailyEarningsCard] entregados hoy:", count, "suma:", sum);
    }

    return { sum, count };
  // 👇 dependemos del hash para detectar cambios profundos sin stringify gigante
  }, [hash, services]);

  return (
    <Card className="mb-6" aria-label="Ingresos del Día">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Ingresos del Día</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(sum)}</div>
        <p className="text-xs text-muted-foreground">
          Total de servicios entregados hoy ({count}).
        </p>
      </CardContent>
    </Card>
  );
}
