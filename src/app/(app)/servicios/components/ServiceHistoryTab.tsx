// src/app/(app)/servicios/components/ServiceHistoryTab.tsx
"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, ExternalLink, Wrench, Calendar } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import type { ServiceRecord } from "@/types";
import Link from "next/link";
import { parseDate } from "@/lib/forms";

interface ServiceHistoryTabProps {
  serviceHistory: ServiceRecord[];
  vehicleId: string | undefined;
  currentServiceId?: string;
}

const statusBadge: Record<string, { label: string; variant: string }> = {
  Cotizacion: { label: "Cotización", variant: "secondary" },
  Agendado: { label: "Agendado", variant: "blue" },
  "En Taller": { label: "En Taller", variant: "waiting" },
  Entregado: { label: "Entregado", variant: "success" },
  Cancelado: { label: "Cancelado", variant: "destructive" },
  "Proveedor Externo": { label: "Proveedor Ext.", variant: "secondary" },
};

export function ServiceHistoryTab({
  serviceHistory,
  vehicleId,
  currentServiceId,
}: ServiceHistoryTabProps) {
  const vehicleServices = useMemo(() => {
    if (!vehicleId) return [];
    return serviceHistory
      .filter(
        (s) => s.vehicleId === vehicleId && s.id !== currentServiceId
      )
      .sort((a, b) => {
        const dateA = parseDate(a.serviceDate)?.getTime() ?? 0;
        const dateB = parseDate(b.serviceDate)?.getTime() ?? 0;
        return dateB - dateA;
      });
  }, [serviceHistory, vehicleId, currentServiceId]);

  if (!vehicleId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <History className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          Selecciona un vehículo para ver su historial
        </p>
      </div>
    );
  }

  if (vehicleServices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <History className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          Este vehículo no tiene servicios anteriores
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          El historial aparecerá aquí después del primer servicio
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <History className="h-4 w-4" />
          {vehicleServices.length} servicio{vehicleServices.length !== 1 ? "s" : ""} anterior{vehicleServices.length !== 1 ? "es" : ""}
        </h3>
      </div>

      {vehicleServices.map((service) => {
        const date = parseDate(service.serviceDate);
        const formattedDate = date && isValid(date)
          ? format(date, "dd MMM yyyy", { locale: es })
          : "Sin fecha";

        const items = service.serviceItems ?? [];
        const total = items.reduce(
          (sum, item) => sum + (Number(item?.sellingPrice) || 0),
          0
        );
        const badge = statusBadge[service.status] || statusBadge.Cotizacion;

        return (
          <Card
            key={service.id}
            className="group hover:shadow-md transition-all duration-200 hover:border-primary/30"
          >
            <CardContent className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant={badge.variant as any} className="text-[10px] px-1.5 h-5">
                      {badge.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formattedDate}
                    </span>
                    {service.folio && (
                      <span className="text-xs font-mono text-muted-foreground">
                        #{service.folio}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {items.slice(0, 3).map((item, idx) => (
                      <p key={idx} className="text-sm truncate flex items-center gap-1.5">
                        <Wrench className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">
                          {item.name || item.itemName || "Trabajo sin nombre"}
                        </span>
                      </p>
                    ))}
                    {items.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-[18px]">
                        +{items.length - 3} más
                      </p>
                    )}
                  </div>

                  {service.mileage && (
                    <p className="text-xs text-muted-foreground mt-1">
                      KM: {Number(service.mileage).toLocaleString("es-MX")}
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                  <p className="font-bold text-sm">{formatCurrency(total)}</p>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Link href={`/servicios/${service.id}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
