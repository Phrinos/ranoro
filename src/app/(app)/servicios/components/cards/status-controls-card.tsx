// src/app/(app)/servicios/components/cards/status-controls-card.tsx
"use client";

import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NewCalendar } from "@/components/ui/calendar";
import { DialogTitle, Dialog, DialogContent, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Save, Ban, Loader2, CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceFormValues } from "@/schemas/service-form";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_OPTIONS: { value: ServiceFormValues["status"]; label: string }[] = [
  { value: "Cotizacion", label: "Cotización" },
  { value: "Agendado", label: "Agendado" },
  { value: "En Taller", label: "En Taller" },
  { value: "Entregado", label: "Entregado" },
  { value: "Cancelado", label: "Cancelado" },
  { value: "Proveedor Externo", label: "Proveedor Externo" },
];

const SUB_STATUS_OPTIONS = [
  "En Diagnóstico",
  "Esperando Refacciones",
  "En Reparación",
  "Pruebas Finales",
  "Lavado",
  "Listo para Entrega",
];

interface StatusControlsCardProps {
  onSave: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isReadOnly?: boolean;
}

export function StatusControlsCard({
  onSave,
  onCancel,
  isSubmitting,
  isReadOnly,
}: StatusControlsCardProps) {
  const { control, watch, setValue } = useFormContext<ServiceFormValues>();
  const status = watch("status");
  const isFinal = status === "Entregado" || status === "Cancelado";

  // Appointment datetime picker state
  const [apptDialogOpen, setApptDialogOpen] = useState(false);
  const [apptDate, setApptDate] = useState<Date | undefined>(undefined);
  const [apptTimeStr, setApptTimeStr] = useState("09:00");
  const [calOpen, setCalOpen] = useState(false);

  const handleStatusChange = (newStatus: ServiceFormValues["status"]) => {
    setValue("status", newStatus, { shouldValidate: true, shouldDirty: true });
    if (newStatus === "En Taller") {
      (setValue as any)("receptionDateTime", new Date().toISOString(), { shouldDirty: true });
    }
    if (newStatus === "Agendado") {
      setApptDialogOpen(true);
    }
  };

  const handleConfirmAppointment = () => {
    if (!apptDate) return;
    const [hours, minutes] = apptTimeStr.split(":").map(Number);
    const dt = new Date(apptDate);
    dt.setHours(hours ?? 9, minutes ?? 0, 0, 0);
    (setValue as any)("appointmentDateTime", dt.toISOString(), { shouldDirty: true });
    setApptDialogOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        {/* Status selector */}
        <FormField
          control={control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex-1 min-w-[150px]">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Estado
              </Label>
              <Select
                key={`status-${field.value}`}
                onValueChange={(v) => handleStatusChange(v as ServiceFormValues["status"])}
                value={field.value}
                disabled={isFinal || isReadOnly}
              >
                <SelectTrigger className="font-bold bg-card h-10">
                  <SelectValue>{STATUS_OPTIONS.find((s) => s.value === field.value)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {/* Sub-status (only when En Taller) */}
        {status === "En Taller" && (
          <FormField
            control={control}
            name={"subStatus" as any}
            render={({ field }) => (
              <FormItem className="flex-1 min-w-[160px]">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sub-estado
                </Label>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? "Sin sub-estado"}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="bg-card h-10">
                    <SelectValue placeholder="Sub-estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sin sub-estado">Sin sub-estado</SelectItem>
                    {SUB_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        )}

        {/* Save + Cancel buttons */}
        {!isReadOnly && (
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              onClick={onSave}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 h-10"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="h-10"
            >
              <Ban className="mr-2 h-4 w-4" />
              {status === "Cotizacion" ? "Eliminar" : "Cancelar"}
            </Button>
          </div>
        )}
      </div>

      {/* Appointment date-time dialog */}
      <Dialog open={apptDialogOpen} onOpenChange={setApptDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Seleccionar Fecha y Hora de Cita</DialogTitle>
            <DialogDescription>
              Elige el día y la hora exacta para agendar este servicio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !apptDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {apptDate ? format(apptDate, "EEEE, dd 'de' MMMM yyyy", { locale: es }) : "Seleccionar día"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <NewCalendar
                  onChange={(d) => {
                    if (d && !Array.isArray(d)) {
                      setApptDate(d);
                      setCalOpen(false);
                    }
                  }}
                  value={apptDate}
                  minDate={new Date()}
                  locale="es-MX"
                />
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="time"
                value={apptTimeStr}
                onChange={(e) => setApptTimeStr(e.target.value)}
                className="font-mono text-base"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setApptDialogOpen(false);
                  setValue("status", "Cotizacion", { shouldDirty: true });
                }}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleConfirmAppointment} disabled={!apptDate}>
                Confirmar Cita
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
