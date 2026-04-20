"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Appointment } from "@/types";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import {
  Car, Clock, Wrench, User, Phone, FileText, Edit, Trash2,
  CheckCircle, XCircle, AlertCircle, CalendarClock, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: () => void;
  onDelete: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const STATUS_CONFIG: Record<
  Appointment["status"],
  { label: string; color: string; icon: React.ElementType; badge: string }
> = {
  Pendiente: {
    label: "Pendiente",
    color: "text-amber-600",
    icon: AlertCircle,
    badge: "bg-amber-100 text-amber-700 border-amber-300",
  },
  Confirmada: {
    label: "Confirmada",
    color: "text-emerald-600",
    icon: CheckCircle,
    badge: "bg-emerald-100 text-emerald-700 border-emerald-300",
  },
  Cancelada: {
    label: "Cancelada",
    color: "text-red-600",
    icon: XCircle,
    badge: "bg-red-100 text-red-700 border-red-300",
  },
  Completada: {
    label: "Completada",
    color: "text-blue-600",
    icon: CheckCircle,
    badge: "bg-blue-100 text-blue-700 border-blue-300",
  },
  "No se presentó": {
    label: "No se presentó",
    color: "text-gray-500",
    icon: XCircle,
    badge: "bg-gray-100 text-gray-600 border-gray-300",
  },
};

export function AppointmentCard({
  appointment,
  onEdit,
  onDelete,
  onConfirm,
  onCancel,
}: AppointmentCardProps) {
  const perms = usePermissions();
  const apptDate = appointment.appointmentDateTime
    ? new Date(appointment.appointmentDateTime)
    : null;
  const config = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG["Pendiente"];
  const StatusIcon = config.icon;
  const isCancelled = appointment.status === "Cancelada";
  const hasQuote = !!appointment.relatedQuoteId;

  return (
    <Card
      className={cn(
        "overflow-hidden border shadow-xs transition-all hover:shadow-md",
        isCancelled && "opacity-60"
      )}
    >
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border">

          {/* ── Col 1: Fecha/Hora ── */}
          <div className="flex flex-row sm:flex-col sm:w-28 shrink-0 items-center justify-center gap-3 sm:gap-1 p-4 bg-muted/20 text-center">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {apptDate && isValid(apptDate) ? format(apptDate, "EEE", { locale: es }) : "—"}
              </p>
              <p className="text-2xl font-bold text-foreground leading-none mt-0.5">
                {apptDate && isValid(apptDate) ? format(apptDate, "dd") : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {apptDate && isValid(apptDate) ? format(apptDate, "MMM yyyy", { locale: es }) : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-foreground sm:mt-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {apptDate && isValid(apptDate) ? format(apptDate, "HH:mm") : "—"}
            </div>
            {appointment.durationMinutes && (
              <div className="hidden sm:flex items-center text-[10px] text-muted-foreground gap-0.5">
                <CalendarClock className="h-3 w-3" /> {appointment.durationMinutes} min
              </div>
            )}
          </div>

          {/* ── Col 2: Vehículo / Propietario ── */}
          <div className="p-4 flex flex-col justify-center flex-2 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Car className="h-4 w-4 text-primary shrink-0" />
              <span className="font-mono font-bold text-base text-foreground">
                {appointment.licensePlate}
              </span>
              {appointment.vehicleIdentifier && (
                <span className="text-sm text-muted-foreground truncate">
                  {appointment.vehicleIdentifier.replace(appointment.licensePlate, "").replace("–", "").trim()}
                </span>
              )}
            </div>

            {appointment.ownerName && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span>{appointment.ownerName}</span>
                {appointment.ownerPhone && (
                  <span className="flex items-center gap-0.5 ml-2">
                    <Phone className="h-3 w-3" /> {appointment.ownerPhone}
                  </span>
                )}
              </div>
            )}

            {/* Service types */}
            {appointment.serviceTypeLabels && appointment.serviceTypeLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {appointment.serviceTypeLabels.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {appointment.notes && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                "{appointment.notes}"
              </p>
            )}
          </div>

          {/* ── Col 3: Personal / Estado ── */}
          <div className="p-4 flex flex-col justify-center flex-1 min-w-0 space-y-2">
            {/* Status badge */}
            <div className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border w-fit", config.badge)}>
              <StatusIcon className="h-3.5 w-3.5" />
              {config.label}
            </div>

            {/* Quote indicator */}
            {hasQuote && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 w-fit">
                <FileText className="h-3 w-3" /> Con cotización previa
              </div>
            )}

            {/* Advisor */}
            {appointment.serviceAdvisorName && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Asesor: {appointment.serviceAdvisorName}</span>
              </p>
            )}

            {/* Technician */}
            {appointment.technicianName ? (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Wrench className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{appointment.technicianName}</span>
              </p>
            ) : (
              <p className="text-[11px] text-orange-500 flex items-center gap-1">
                <Wrench className="h-3.5 w-3.5 shrink-0" /> Sin técnico
              </p>
            )}
          </div>

          {/* ── Col 4: Acciones ── */}
          <div className="p-3 flex flex-row sm:flex-col items-center justify-center gap-1 sm:w-14 shrink-0 bg-muted/10">
            {perms.has("services:edit") && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onEdit} title="Editar">
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {appointment.status === "Pendiente" && onConfirm && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-emerald-600 hover:text-emerald-700" onClick={onConfirm} title="Confirmar">
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            {appointment.status !== "Cancelada" && onCancel && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-600" onClick={onCancel} title="Cancelar">
                <XCircle className="h-4 w-4" />
              </Button>
            )}
            {perms.has("services:delete") && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={onDelete} title="Eliminar">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
