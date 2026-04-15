
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { DollarSign, PlusCircle, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { parseISO, isValid, startOfDay, endOfDay } from "date-fns";
import type { ServiceRecord } from "@/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";

function asDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
}

function toNumberLoose(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") return Number(v.replace(/[^\d.-]/g, "")) || 0;
  return 0;
}

function getAmount(s: any): number {
  // Priority: sum of payments array > totalCost field > total field
  if (Array.isArray(s?.payments) && s.payments.length > 0) {
    return s.payments.reduce((sum: number, p: any) => sum + toNumberLoose(p?.amount), 0);
  }
  return toNumberLoose(s?.totalCost ?? s?.total ?? 0);
}

interface DailyEarningsCardProps {
  services: ServiceRecord[];
}

export function DailyEarningsCard({ services }: DailyEarningsCardProps) {
  const userPermissions = usePermissions();

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

      sum += getAmount(anyS);
      count++;
    }

    return { sum, count };
  }, [services]);

  return (
    <div className="flex items-center gap-4 p-4 bg-card border rounded-xl shadow-sm mb-6">
      {/* Earnings section */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <DollarSign className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ingresos del Día</p>
          <p className="font-bold text-2xl text-foreground leading-tight">{formatCurrency(sum)}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <TrendingUp className="h-3 w-3 text-green-500" />
            {count} servicio{count !== 1 ? 's' : ''} entregado{count !== 1 ? 's' : ''} hoy
          </p>
        </div>
      </div>

      {/* New Service button */}
      {userPermissions.has('services:create') && (
        <Button asChild size="default" className="shrink-0">
          <Link href="/servicios/nuevo">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Servicio
          </Link>
        </Button>
      )}
    </div>
  );
}
