// src/app/(app)/servicios/components/cards/autosave-indicator.tsx
"use client";

import React from "react";
import { Cloud, CloudOff, Loader2, Check, AlertCircle } from "lucide-react";
import type { AutosaveStatus } from "@/hooks/useAutosave";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;
}

const STATUS_CONFIG: Record<AutosaveStatus, {
  icon: React.ElementType;
  label: string;
  color: string;
  animate?: boolean;
}> = {
  idle: { icon: Cloud, label: "Sin cambios", color: "text-muted-foreground" },
  saving: { icon: Loader2, label: "Guardando…", color: "text-blue-600", animate: true },
  saved: { icon: Check, label: "Guardado", color: "text-emerald-600" },
  unsaved: { icon: CloudOff, label: "Cambios sin guardar", color: "text-amber-600" },
  error: { icon: AlertCircle, label: "Error al guardar", color: "text-red-600" },
};

export function AutosaveIndicator({ status, lastSavedAt, hasUnsavedChanges }: AutosaveIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={cn("flex items-center gap-1.5 transition-colors duration-300", config.color)}>
        <Icon className={cn("h-3.5 w-3.5 shrink-0", config.animate && "animate-spin")} />
        <span className="text-xs font-semibold whitespace-nowrap">{config.label}</span>
      </div>
      {lastSavedAt && (
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {format(lastSavedAt, "HH:mm:ss", { locale: es })}
        </span>
      )}
    </div>
  );
}
