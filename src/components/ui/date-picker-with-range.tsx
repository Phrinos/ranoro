
"use client";

import * as React from "react";
import {
  format,
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  subDays, subWeeks, subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar"; // <- tu wrapper de react-calendar
import {
  Dialog, DialogContent, DialogTrigger,
  DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** MAYO 2024 como inicio del sistema */
const earliest = new Date(2024, 4, 1);

/** Rango de fechas simple (sin react-day-picker) */
export type DateRange = { from?: Date; to?: Date };

const useIsMobile = () => {
  const [m, setM] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const cb = () => setM(mq.matches);
    cb(); mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, []);
  return m;
};

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
}

/** Mapeos entre DateRange y value de react-calendar */
type RcValue = Date | [Date, Date] | null;
const toRcValue = (r?: DateRange): RcValue =>
  r?.from && r.to ? [r.from, r.to] : r?.from ? r.from : null;

const fromRcValue = (v: RcValue): DateRange | undefined => {
  if (!v) return undefined;
  if (Array.isArray(v)) {
    const [from, to] = v;
    return from ? { from, to: to ?? from } : undefined;
  }
  return { from: v, to: undefined };
};

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
}: DatePickerWithRangeProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date);
  const [activePreset, setActivePreset] = React.useState<string | null>(null);
  const [month, setMonth] = React.useState<Date>(date?.from ?? new Date());

  React.useEffect(() => {
    if (isOpen) {
      setTempDate(date);
      setActivePreset(null);
      setMonth(date?.from ?? new Date());
    }
  }, [isOpen, date]);

  const handleApply = () => { onDateChange(tempDate); setIsOpen(false); };
  const handleCancel = () => { setTempDate(date); setIsOpen(false); };

  /** Presets en el orden solicitado */
  const presetItems = [
    { k: "today",      t: "Hoy" },
    { k: "yesterday",  t: "Ayer" },
    { k: "this_week",  t: "Esta Semana" },
    { k: "last_week",  t: "La Semana Pasada" },
    { k: "this_month", t: "Este Mes" },
    { k: "last_month", t: "Mes Pasado" },
    { k: "this_year",  t: "Este Año" },
    { k: "last_year",  t: "Año Pasado" },
    { k: "from_start", t: "Desde el Inicio" },
  ] as const;

  const setPreset = (key: typeof presetItems[number]["k"]) => {
    const now = new Date();
    let range: DateRange | undefined;
    switch (key) {
      case "today":      range = { from: startOfDay(now), to: endOfDay(now) }; break;
      case "yesterday":  range = { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) }; break;
      case "this_week":  range = { from: startOfWeek(now, { locale: es }), to: endOfWeek(now, { locale: es }) }; break;
      case "last_week":  range = { from: startOfWeek(subWeeks(now, 1), { locale: es }), to: endOfWeek(subWeeks(now, 1), { locale: es }) }; break;
      case "this_month": range = { from: startOfMonth(now), to: endOfMonth(now) }; break;
      case "last_month": range = { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) }; break;
      case "this_year":  range = { from: startOfYear(now), to: endOfYear(now) }; break;
      case "last_year":  range = { from: startOfYear(new Date(now.getFullYear() - 1, 0, 1)), to: endOfYear(new Date(now.getFullYear() - 1, 0, 1)) }; break;
      case "from_start": range = { from: earliest, to: endOfDay(now) }; break;
      default: range = undefined;
    }
    setActivePreset(key);
    setTempDate(range);
    setMonth(range?.from ?? new Date());
  };

  const label =
    date?.from
      ? date?.to
        ? `${format(date.from, "dd MMM yyyy", { locale: es })} – ${format(date.to, "dd MMM yyyy", { locale: es })}`
        : `${format(date.from, "dd MMM yyyy", { locale: es })}`
      : "Seleccione un rango";

  return (
    <div className={cn("grid gap-2", className)}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full sm:w-[340px] justify-start text-left font-normal bg-white",
              !date && "text-muted-foreground"
            )}
            aria-label="Elegir rango de fechas"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{label}</span>
          </Button>
        </DialogTrigger>

        {/* Modal sin la X */}
        <DialogContent
          hideClose
          className={cn(
            "p-0 bg-background border-0 sm:rounded-2xl shadow-2xl",
            "sm:max-w-none max-w-none w-[min(100vw-1rem,640px)] h-auto"
          )}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Seleccionar Rango de Fechas</DialogTitle>
            <DialogDescription>Elige un rango predefinido o selección manual.</DialogDescription>
          </DialogHeader>

          <div className="flex">
            {/* Presets en desktop */}
            {!isMobile && (
              <aside className="w-56 shrink-0 border-r bg-muted/30">
                <ul className="py-2">
                  {presetItems.map(({ k, t }) => (
                    <li key={k}>
                      <button
                        type="button"
                        onClick={() => setPreset(k)}
                        className={cn(
                          "w-full text-left px-4 py-2 text-sm rounded-md mx-2 my-1 transition-colors",
                          activePreset === k
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "hover:bg-muted/60"
                        )}
                      >
                        {t}
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
            )}

            <div className="flex-1 flex flex-col min-w-0">
              {/* Presets móvil (chips) */}
              {isMobile && (
                <div className="px-3 py-2 border-b overflow-x-auto whitespace-nowrap space-x-2 bg-muted/40">
                  {presetItems.map(({ k, t }) => (
                    <button
                      key={k}
                      onClick={() => setPreset(k)}
                      className={cn(
                        "inline-flex h-8 px-3 items-center rounded-full text-sm",
                        activePreset === k ? "bg-red-600 text-white" : "bg-white border"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-4">
                <Calendar
                  /* rango controlado */
                  selectRange
                  value={toRcValue(tempDate)}
                  onChange={(v) => {
                    const r = fromRcValue(v as RcValue);
                    setTempDate(r);
                    setActivePreset(null);
                    if (r?.from) setMonth(r.from);
                  }}
                  /* mes visible controlado */
                  activeStartDate={new Date(month.getFullYear(), month.getMonth(), 1)}
                  onActiveStartDateChange={({ activeStartDate }) => {
                    if (activeStartDate) setMonth(activeStartDate);
                  }}
                  /* ajustes */
                  minDetail="month"
                  maxDetail="month"
                  minDate={earliest}
                  // maxDate={new Date()} // habilítalo si quieres bloquear futuro
                  className="bg-white"
                />

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    readOnly
                    className="bg-white text-sm"
                    value={tempDate?.from ? format(tempDate.from, "dd MMM yyyy", { locale: es }) : ""}
                    placeholder="Inicio"
                  />
                  <Input
                    readOnly
                    className="bg-white text-sm"
                    value={tempDate?.to ? format(tempDate.to, "dd MMM yyyy", { locale: es }) : ""}
                    placeholder="Fin"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-background">
                <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                <Button onClick={handleApply} className="bg-red-600 hover:bg-red-600 text-white">Aceptar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
