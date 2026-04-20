"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { withSuspense } from "@/lib/withSuspense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, PlusCircle, Search, X, CalendarX } from "lucide-react";
import type { Appointment, User } from "@/types";
import { agendaService } from "@/lib/services/agenda.service";
import { adminService, inventoryService } from "@/lib/services";
import { AppointmentDialog } from "./components/AppointmentDialog";
import { AppointmentCard } from "./components/AppointmentCard";
import { useToast } from "@/hooks/use-toast";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, isValid, compareAsc } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<Appointment["status"], string> = {
  "Pendiente": "bg-amber-400",
  "Confirmada": "bg-emerald-500",
  "Cancelada": "bg-red-400",
  "Completada": "bg-blue-400",
  "No se presentó": "bg-gray-400",
};

function PageInner() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [serviceTypeLabels, setServiceTypeLabels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [];

    // Real-time appointments listener
    unsubs.push(
      agendaService.onAppointmentsUpdate((data) => {
        setAppointments(data);
        setIsLoading(false);
      })
    );

    // Personnel
    unsubs.push(
      adminService.onUsersUpdate((users) => setPersonnel(users))
    );

    // Service types for the dialog chips
    unsubs.push(
      inventoryService.onServiceTypesUpdate((types) =>
        setServiceTypeLabels(types.map((t) => t.name))
      )
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  const handleEdit = useCallback((appt: Appointment) => {
    setEditingAppt(appt);
    setDialogOpen(true);
  }, []);

  const handleNew = useCallback(() => {
    setEditingAppt(null);
    setDialogOpen(true);
  }, []);

  const handleConfirm = useCallback(async (appt: Appointment) => {
    try {
      await agendaService.updateAppointment(appt.id, { status: "Confirmada" });
      toast({ title: "Cita confirmada" });
    } catch {
      toast({ title: "Error al confirmar", variant: "destructive" });
    }
  }, [toast]);

  const handleCancel = useCallback(async (appt: Appointment) => {
    try {
      await agendaService.updateAppointment(appt.id, { status: "Cancelada" });
      toast({ title: "Cita cancelada" });
    } catch {
      toast({ title: "Error al cancelar", variant: "destructive" });
    }
  }, [toast]);

  const handleDelete = useCallback(async (appt: Appointment) => {
    try {
      await agendaService.deleteAppointment(appt.id);
      toast({ title: "Cita eliminada", variant: "destructive" });
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  }, [toast]);

  // Map date → appointments
  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appt of appointments) {
      if (!appt.appointmentDateTime) continue;
      const d = new Date(appt.appointmentDateTime);
      if (!isValid(d)) continue;
      const key = format(d, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(appt);
    }
    return map;
  }, [appointments]);

  // Selected Day Appointments
  const dayAppointments = useMemo(() => {
    const key = format(selectedDate, "yyyy-MM-dd");
    let appts = byDate.get(key) || [];

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      appts = appts.filter((a) =>
        a.licensePlate?.toLowerCase().includes(q) ||
        a.ownerName?.toLowerCase().includes(q) ||
        a.ownerPhone?.includes(q) ||
        a.vehicleIdentifier?.toLowerCase().includes(q) ||
        a.notes?.toLowerCase().includes(q)
      );
    }

    return appts.sort((a, b) =>
      compareAsc(new Date(a.appointmentDateTime!), new Date(b.appointmentDateTime!))
    );
  }, [selectedDate, byDate, search]);

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return null;
    const key = format(date, "yyyy-MM-dd");
    const appts = byDate.get(key);
    if (!appts || appts.length === 0) return null;
    return (
      <div className="flex justify-center gap-0.5 mt-0.5 max-w-full overflow-hidden">
        {appts.slice(0, 3).map((a, i) => (
          <span key={i} className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[a.status] || "bg-gray-400")} />
        ))}
        {appts.length > 3 && (
          <span className="text-[8px] text-muted-foreground font-bold leading-none">+</span>
        )}
      </div>
    );
  };

  // Stats
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = appointments.filter(
    (a) => a.appointmentDateTime?.slice(0, 10) === today && a.status !== "Cancelada"
  ).length;
  const pendingCount = appointments.filter(
    (a) => a.status === "Pendiente" && a.appointmentDateTime >= new Date().toISOString()
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agenda Unificada</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona las citas y servicios programados en una vista de calendario.
          </p>
        </div>
        <Button onClick={handleNew} className="shrink-0 group">
          <PlusCircle className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
          Nueva Cita
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr] gap-6 items-start">
        {/* Left Column: Calendar */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <Card className="flex flex-col items-center justify-center p-3 sm:p-5 overflow-hidden border shadow-xs">
            <style>{`
              /* Estilos mejorados para el calendario */
              .react-calendar {
                width: 100%;
                border: none;
                font-family: inherit;
                background: transparent;
              }
              .react-calendar__navigation {
                margin-bottom: 1rem;
              }
              .react-calendar__navigation button {
                min-width: 44px;
                background: none;
                font-size: 1rem;
                font-weight: 500;
                color: hsl(var(--foreground));
                border-radius: var(--radius);
                padding: 8px;
              }
              .react-calendar__navigation button:enabled:hover,
              .react-calendar__navigation button:enabled:focus {
                background-color: hsl(var(--accent));
              }
              .react-calendar__month-view__weekdays {
                text-align: center;
                text-transform: uppercase;
                font-weight: 600;
                font-size: 0.75rem;
                color: hsl(var(--muted-foreground));
                text-decoration: none;
                abbr { text-decoration: none; }
              }
              .react-calendar__tile {
                text-align: center;
                padding: 0.75em 0.5em;
                background: none;
                border-radius: var(--radius);
                color: hsl(var(--foreground));
                font-size: 0.875rem;
                font-weight: 500;
                margin-bottom: 4px;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 54px;
              }
              .react-calendar__tile:enabled:hover,
              .react-calendar__tile:enabled:focus {
                background-color: hsl(var(--accent));
                color: hsl(var(--accent-foreground));
              }
              .react-calendar__tile--now {
                background: hsl(var(--secondary));
                color: hsl(var(--secondary-foreground));
              }
              .react-calendar__tile--now:enabled:hover,
              .react-calendar__tile--now:enabled:focus {
                background: hsl(var(--secondary)/0.8);
              }
              .react-calendar__tile--active {
                background: hsl(var(--primary)) !important;
                color: hsl(var(--primary-foreground)) !important;
                font-weight: bold;
              }
              .react-calendar__tile--active:enabled:hover,
              .react-calendar__tile--active:enabled:focus {
                background: hsl(var(--primary)/0.9) !important;
              }
            `}</style>
            <Calendar
              onChange={(v) => v instanceof Date && setSelectedDate(v)}
              value={selectedDate}
              locale="es-MX"
              tileContent={tileContent}
              next2Label={null}
              prev2Label={null}
            />
          </Card>

          {/* Legend */}
          <div className="flex flex-wrap gap-2.5 px-1 justify-center sm:justify-start">
            {(Object.entries(STATUS_DOT) as [Appointment["status"], string][]).map(([status, dot]) => (
              <div key={status} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />
                {status}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Appointments List */}
        <div className="space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-foreground">
                {format(selectedDate, "EEEE, dd 'de' MMMM yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
              </h2>
              <div className="flex gap-3 mt-1">
                <span className="inline-flex items-center gap-1.5 text-[11px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 font-medium">
                  Citas Hoy: <strong>{todayCount}</strong>
                </span>
                {pendingCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2.5 py-0.5 font-medium">
                    Sin confirmar: <strong>{pendingCount}</strong>
                  </span>
                )}
              </div>
            </div>
            
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar (ej. DZT-59)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {dayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/10">
                <CalendarX className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-foreground font-medium">Sin citas programadas</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {search ? "No hay resultados para tu búsqueda." : "Selecciona otro día en el calendario o crea una nueva cita."}
                </p>
              </div>
            ) : (
              dayAppointments.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  onEdit={() => handleEdit(appt)}
                  onDelete={() => handleDelete(appt)}
                  onConfirm={appt.status === "Pendiente" ? () => handleConfirm(appt) : undefined}
                  onCancel={appt.status !== "Cancelada" ? () => handleCancel(appt) : undefined}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dialog */}
      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={editingAppt}
        selectedDate={selectedDate} // Pass selected date
        personnel={personnel}
        serviceTypes={serviceTypeLabels}
        onSaved={() => {}} // realtime listener auto-refreshes
      />
    </div>
  );
}

export default withSuspense(PageInner, null);

