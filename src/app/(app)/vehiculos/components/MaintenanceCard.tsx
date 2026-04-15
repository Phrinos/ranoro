// src/app/(app)/vehiculos/components/MaintenanceCard.tsx
"use client";

import React, { useMemo } from "react";
import type { Vehicle, ServiceRecord, NextServiceInfo } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Gauge, Calendar, AlertTriangle } from "lucide-react";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { formatNumber } from "@/lib/utils";
import { parseDate } from "@/lib/forms";
import { pickLatestDeliveredService, getServiceMileage } from "@/lib/vehicles/serviceRecordHelpers";

interface MaintenanceCardProps {
  vehicle: Vehicle;
  serviceHistory?: ServiceRecord[];
}

const NextServiceDisplay = ({ nextServiceInfo }: { nextServiceInfo?: NextServiceInfo | null }) => {
  if (!nextServiceInfo || (!nextServiceInfo.date && !nextServiceInfo.mileage)) {
    return <p className="font-semibold text-sm">No programado</p>;
  }

  const date = nextServiceInfo.date ? parseDate(nextServiceInfo.date) : null;
  const isOverdue = date && isValid(date) ? new Date() > date : false;

  return (
    <div className={isOverdue ? "text-destructive" : ""}>
      <p className="font-semibold text-sm">
        {date && isValid(date) ? format(date, "dd MMM yyyy", { locale: es }) : ""}
        {(date && nextServiceInfo.mileage) && " / "}
        {nextServiceInfo.mileage ? `${formatNumber(nextServiceInfo.mileage)} km` : ""}
      </p>
      {isOverdue && (
        <p className="text-xs font-semibold flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vencido
        </p>
      )}
    </div>
  );
};

export function MaintenanceCard({ vehicle, serviceHistory = [] }: MaintenanceCardProps) {
  const latest = useMemo(() => pickLatestDeliveredService(serviceHistory), [serviceHistory]);

  const lastServiceDate = useMemo(() => {
    const fromHistory = latest?.date ?? null;
    if (fromHistory && isValid(fromHistory)) return fromHistory;
    return vehicle.lastServiceDate ? parseDate(vehicle.lastServiceDate) : null;
  }, [latest, vehicle.lastServiceDate]);

  const lastServiceMileage = useMemo(() => {
    return latest?.mileage ?? null;
  }, [latest]);

  const currentMileage = useMemo(() => {
    const base = Number(vehicle.currentMileage || 0) || 0;
    const maxFromServices = serviceHistory
      .map(getServiceMileage)
      .filter((n): n is number => typeof n === "number" && !isNaN(n))
      .reduce((max, n) => Math.max(max, n), 0);

    return Math.max(base, maxFromServices, lastServiceMileage ?? 0);
  }, [vehicle.currentMileage, serviceHistory, lastServiceMileage]);

  return (
    <Card className="overflow-hidden border-0 shadow-lg relative bg-card">
      <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-5 sm:p-6 overflow-hidden text-white border-b border-red-800/50">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 shadow-inner">
            <Gauge className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-white drop-shadow-sm">Mantenimiento</CardTitle>
            <CardDescription className="text-red-100/90 text-xs mt-0.5">Control de kilometraje y próximos servicios</CardDescription>
          </div>
        </div>
      </div>

      <CardContent className="p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex flex-col p-4 bg-muted/30 border border-muted-foreground/10 rounded-xl shadow-inner group hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-background border shadow-sm group-hover:border-red-500/30 group-hover:text-red-600 transition-colors">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground group-hover:text-red-600" />
              </div>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">KM Actual</p>
            </div>
            <p className="font-extrabold text-xl font-mono tracking-tight text-foreground">
              {formatNumber(currentMileage) || "0"}
            </p>
          </div>

          <div className="flex flex-col p-4 bg-muted/30 border border-muted-foreground/10 rounded-xl shadow-inner group hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
               <div className="p-1.5 rounded-md bg-background border shadow-sm group-hover:border-red-500/30 group-hover:text-red-600 transition-colors">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground group-hover:text-red-600" />
              </div>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Últ. Servicio</p>
            </div>
            <p className="font-extrabold text-[#111] dark:text-slate-100 text-sm">
              {lastServiceDate && isValid(lastServiceDate)
                ? format(lastServiceDate, "dd MMM yy", { locale: es })
                : "N/A"}
            </p>
            {typeof lastServiceMileage === "number" && (
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">{formatNumber(lastServiceMileage)} km</p>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Próximo Recomendado</h4>
          </div>
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl border-dashed flex items-center">
            <NextServiceDisplay nextServiceInfo={(vehicle as any).nextServiceInfo} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
