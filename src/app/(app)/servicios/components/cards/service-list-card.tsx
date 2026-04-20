// src/app/(app)/servicios/components/cards/service-list-card.tsx
"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import type { ServiceRecord, Vehicle, User, Payment, ServiceSubStatus, PaymentMethod } from "@/types";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { parseDate } from "@/lib/forms";
import { formatCurrency, getStatusInfo, getPaymentMethodVariant, cn } from "@/lib/utils";
import {
  User as UserIcon,
  Wrench,
  Edit,
  Printer,
  Wallet,
  CreditCard,
  Landmark,
  TrendingUp,
  CheckCircle2,
  Clock,
  Link2,
  Phone,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { calcEffectiveProfit } from "@/lib/money-helpers";

export interface ServiceListCardProps {
  service: ServiceRecord;
  vehicle?: Vehicle;
  personnel?: User[];
  currentUser?: User | null;
  onEdit?: () => void;
  onView?: () => void;
  onShowTicket?: () => void;
  onComplete?: () => void;
}

const PAYMENT_ICON: Record<string, React.ElementType> = {
  Efectivo: Wallet,
  Tarjeta: CreditCard,
  "Tarjeta 3 MSI": CreditCard,
  "Tarjeta 6 MSI": CreditCard,
  Transferencia: Landmark,
  "Transferencia/Contadora": Landmark,
};

export function ServiceListCard({
  service,
  vehicle,
  personnel = [],
  onEdit,
  onView,
  onShowTicket,
}: ServiceListCardProps) {
  const router = useRouter();
  const userPermissions = usePermissions();
  const { color, icon: StatusIcon, label } = getStatusInfo(
    service.status as any,
    service.subStatus as ServiceSubStatus
  );

  const technician = useMemo(
    () => personnel.find((u) => u.id === service.technicianId),
    [personnel, service.technicianId]
  );

  const displayDate =
    service.appointmentDateTime ||
    service.receptionDateTime ||
    service.deliveryDateTime ||
    service.serviceDate;
  const parsedDate = displayDate ? parseDate(displayDate) : null;

  const totals = useMemo(() => {
    const dbTotal = Number(service.totalCost || (service as any).total || 0);
    const itemsTotal = (service.serviceItems ?? []).reduce(
      (s, i) => s + (Number(i.sellingPrice) || 0),
      0
    );
    return {
      totalCost: dbTotal > 0 ? dbTotal : itemsTotal,
      profit: calcEffectiveProfit(service),
    };
  }, [service]);

  const primaryPayment: Payment | undefined = useMemo(() => {
    if (service.payments && service.payments.length > 0) {
      if (service.payments.length === 1) return service.payments[0];
      return service.payments.reduce((prev, cur) =>
        (prev.amount ?? 0) > (cur.amount ?? 0) ? prev : cur
      );
    }
    if ((service as any).paymentMethod) {
      return { method: (service as any).paymentMethod as PaymentMethod, amount: totals.totalCost };
    }
    return undefined;
  }, [service.payments, service, totals.totalCost]);

  const isCobrado = service.status === "Entregado";

  const handleEdit = () => {
    if (onEdit) return onEdit();
    router.push(`/servicios/${service.id}`);
  };

  return (
    <Card
      className={cn(
        "shadow-xs overflow-hidden border transition-shadow hover:shadow-md",
        service.status === "Cancelado" ? "bg-muted/60 opacity-80" : "bg-card"
      )}
    >
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row text-sm divide-y md:divide-y-0 md:divide-x divide-border">

          {/* ── BLOQUE 1: Fecha / Hora / Folio ─────────────────────── */}
          <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-30 shrink-0 bg-muted/20">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
              {parsedDate && isValid(parsedDate)
                ? format(parsedDate, "HH:mm 'hrs'", { locale: es })
                : "—"}
            </p>
            <p className="font-bold text-lg text-foreground leading-tight mt-0.5">
              {parsedDate && isValid(parsedDate) ? format(parsedDate, "dd MMM", { locale: es }) : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {parsedDate && isValid(parsedDate) ? format(parsedDate, "yyyy") : ""}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
              #{(service as any).folio || service.id.slice(-6)}
            </p>
          </div>

          {/* ── BLOQUE 2: Vehículo / Propietario ─────────────────── */}
          <div className="p-4 flex flex-col justify-center flex-2 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base text-foreground leading-tight truncate">
                {vehicle?.ownerName || service.customerName || "Cliente no registrado"}
              </span>
              {service.customerPhone && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0">
                  <Phone className="h-3 w-3" />
                  {service.customerPhone}
                </span>
              )}
            </div>
            <p className="font-bold text-xl text-foreground leading-tight tracking-tight">
              {vehicle
                ? `${vehicle.licensePlate} — ${vehicle.make} ${vehicle.model}${vehicle.year ? ` ${vehicle.year}` : ""}`
                : service.vehicleIdentifier || "—"}
            </p>
            {service.notes && (
              <p className="text-[11px] text-muted-foreground line-clamp-1">{service.notes}</p>
            )}
          </div>

          {/* ── BLOQUE 3: Trabajos + Asesor ───────────────────────── */}
          <div className="p-4 flex flex-col justify-center flex-2 min-w-0 space-y-2">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Trabajos
            </span>
            {service.serviceItems && service.serviceItems.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {service.serviceItems.slice(0, 4).map((item, i) => (
                  <span
                    key={i}
                    className="inline-block text-[10px] bg-muted px-2 py-0.5 rounded-full text-foreground/90 font-medium border border-border/50 truncate max-w-[150px]"
                    title={item.name}
                  >
                    {item.itemName || item.name}
                  </span>
                ))}
                {service.serviceItems.length > 4 && (
                  <span className="inline-block text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground border border-border/50">
                    +{service.serviceItems.length - 4}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Sin trabajos asignados</span>
            )}

            <div className="mt-auto pt-2 border-t border-border/30">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <UserIcon className="h-3 w-3 shrink-0" />
                <span className="font-medium truncate">
                  {service.serviceAdvisorName || "Sin asesor"}
                </span>
              </p>
            </div>
          </div>

          {/* ── BLOQUE 4: Estado / Técnico / Cobro ───────────────── */}
          <div className="p-4 flex flex-col justify-center flex-[1.5] min-w-0 space-y-2 bg-muted/5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={color as any} className="w-fit text-[11px]">
                <Icon
                  icon={typeof StatusIcon === "string" ? StatusIcon : "mdi:information"}
                  className="mr-1 h-3.5 w-3.5"
                />
                {label}
              </Badge>
              {service.subStatus && String(service.subStatus) !== "Sin sub-estado" && (
                <span className="text-[10px] bg-background border px-1.5 py-0.5 rounded-sm font-semibold truncate max-w-[120px]">
                  {service.subStatus}
                </span>
              )}
            </div>

            {technician || service.technicianName ? (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Wrench className="h-3 w-3 shrink-0" />
                <span className="font-medium truncate">
                  {technician?.name || service.technicianName}
                </span>
              </p>
            ) : (
              <p className="text-[11px] text-orange-500/90 flex items-center gap-1.5">
                <Wrench className="h-3 w-3 shrink-0" />
                <span>Sin técnico</span>
              </p>
            )}

            <div className="mt-auto">
              {isCobrado ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Cobrado
                </span>
              ) : service.status !== "Cancelado" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                  <Clock className="h-3 w-3" /> Por cobrar
                </span>
              ) : null}
            </div>
          </div>

          {/* ── BLOQUE 5: Total / Ganancia / Método pago ─────────── */}
          <div className="p-4 flex flex-col justify-center items-end text-right w-full md:w-36 shrink-0 space-y-1.5">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="font-bold text-xl md:text-2xl text-primary leading-tight">
                {formatCurrency(totals.totalCost)}
              </p>
            </div>
            <p className="text-xs text-green-600 flex items-center gap-1 justify-end font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatCurrency(totals.profit)}
            </p>
            {primaryPayment && (
              <Badge
                variant={getPaymentMethodVariant(primaryPayment.method) as any}
                className="text-[10px]"
              >
                {React.createElement(PAYMENT_ICON[primaryPayment.method] ?? Wallet, {
                  className: "h-3 w-3 mr-1",
                })}
                {primaryPayment.method}
              </Badge>
            )}
          </div>

          {/* ── BLOQUE 6: Acciones ───────────────────────────────── */}
          <div className="p-3 flex flex-row md:flex-col justify-center items-center gap-1 w-full md:w-14 shrink-0 bg-muted/10">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onView}
              title="Compartir enlace"
            >
              <Link2 className="h-4 w-4" />
            </Button>
            {userPermissions.has("services:edit") && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={handleEdit}
                title="Editar"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              title="Imprimir ticket"
              onClick={onShowTicket}
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
