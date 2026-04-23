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
import Link from "next/link";

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

const CARD_BG: Record<string, string> = {
  Pendiente: "bg-amber-50/80 border-amber-200 hover:border-amber-300",
  Confirmada: "bg-emerald-50/80 border-emerald-200 hover:border-emerald-300",
  Cancelada: "bg-slate-50 border-slate-200 opacity-60 grayscale-[0.5]",
  "No se presentó": "bg-rose-50/80 border-rose-200 hover:border-rose-300",
  Completada: "bg-blue-50/80 border-blue-200 hover:border-blue-300",
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
  const isTemporal = appointment.vehicleId === "temporal";
  const startHref = isTemporal
    ? `/vehiculos`
    : `/servicios/nuevo?vehicleId=${appointment.vehicleId}&appointmentId=${appointment.id}`;

  return (
    <Card
      className={cn(
        "border shadow-xs hover:shadow-md transition-all rounded-xl relative group w-full",
        CARD_BG[appointment.status] || "bg-white border-slate-200 hover:border-slate-300",
        isCancelled && "opacity-60 grayscale-[0.5]"
      )}
    >
      <div className="p-3.5 flex flex-col gap-2.5">
        
        {/* Row 1: Placas & Estado */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="font-mono font-black text-[17px] text-slate-800 leading-none">
              {appointment.licensePlate}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              {appointment.vehicleIdentifier?.replace(appointment.licensePlate, "").replace("–", "").trim() || "Vehículo"}
            </span>
          </div>
          <div className={cn("inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border", config.badge)}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </div>
        </div>

        {/* Row 2: Propietario - Teléfono */}
        {appointment.ownerName && (
          <div className="flex items-center gap-2 text-[11px] text-slate-600 font-semibold bg-slate-50/50 p-1.5 rounded-md border border-slate-100">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{appointment.ownerName}</span>
            {appointment.ownerPhone && (
              <>
                <span className="text-slate-300">•</span>
                <span>{appointment.ownerPhone}</span>
              </>
            )}
          </div>
        )}

        {/* Row 3: Servicio a Realizar & Acciones */}
        <div className="mt-1 flex items-end justify-between border-t border-slate-100 pt-2.5 gap-2">
          
          {/* Servicio */}
          <div className="flex-1 min-w-0">
            {appointment.serviceTypeLabels && appointment.serviceTypeLabels.length > 0 && (
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5 truncate">
                {appointment.serviceTypeLabels[0]}
              </p>
            )}
            <p className="text-[11px] text-slate-500 leading-tight line-clamp-1 italic font-medium">
              {appointment.notes || "Sin detalles"}
            </p>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            {["Pendiente", "Confirmada"].includes(appointment.status) && (
              <Link href={startHref}>
                <Button variant="default" size="sm" className="h-7 px-2.5 text-[10px] uppercase font-bold tracking-wider mr-1 shadow-md bg-slate-800 hover:bg-slate-700 text-white">
                  {isTemporal ? "Crear Auto" : "Iniciar"}
                </Button>
              </Link>
            )}
            
            {appointment.status === "Pendiente" && onConfirm && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={onConfirm} title="Confirmar">
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            {appointment.status !== "Cancelada" && onCancel && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onCancel} title="Cancelar">
                <XCircle className="h-4 w-4" />
              </Button>
            )}
            {perms.has("services:edit") && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-primary hover:bg-primary/10" onClick={onEdit} title="Editar">
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {perms.has("services:delete") && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-destructive hover:bg-destructive/10" onClick={onDelete} title="Eliminar">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
