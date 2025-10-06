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
import { Calendar as CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogTrigger,
  DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const earliest = new Date(2018, 0, 1);

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

export function DatePickerWithRange({ className, date, onDateChange }: DatePickerWithRangeProps) {
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

  const setPreset = (key: string) => {
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

  const presetItems = [
    { k: "today",      t: "Hoy" },
    { k: "yesterday",  t: "Ayer" },
    { k: "this_week",  t: "Esta Semana" },
    { k: "this_month", t: "Este Mes" },
    { k: "last_month", t: "Mes Pasado" },
    { k: "this_year",  t: "Este Año" },
    { k: "last_week",  t: "Semana Anterior" },
    { k: "last_year",  t: "Año Anterior" },
    { k: "from_start", t: "Desde Inicio" },
  ];

  return (
    <div className={cn("grid gap-2", className)}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn("w-full sm:w-[340px] justify-start text-left font-normal bg-white", !date && "text-muted-foreground")}
            aria-label="Elegir rango de fechas"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{label}</span>
            {date?.from && (
              <X
                className="ml-auto h-4 w-4 opacity-60 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onDateChange(undefined); }}
              />
            )}
          </Button>
        </DialogTrigger>

        <DialogContent
          className={cn(
            "p-0 bg-background border-0 sm:max-w-none max-w-none overflow-hidden sm:rounded-2xl shadow-2xl",
            // tamaño compacto
            "w-[min(100vw-1rem,760px)] h-[68dvh]"
          )}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Seleccionar Rango de Fechas</DialogTitle>
            <DialogDescription>Elige un rango predefinido o selección manual.</DialogDescription>
          </DialogHeader>

          <div className="flex h-full min-h-0">
            {/* Presets */}
            {isMobile ? (
              <div className="px-3 py-2 border-b overflow-x-auto whitespace-nowrap space-x-2 bg-muted/40">
                {presetItems.map(({ k, t }) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={activePreset === k ? "default" : "outline"}
                    className={cn(
                      "rounded-full",
                      activePreset === k ? "bg-red-600 hover:bg-red-600 text-white" : "bg-white"
                    )}
                    onClick={() => setPreset(k)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            ) : (
              <aside className="w-48 shrink-0 border-r overflow-auto bg-muted/30">
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

            {/* Calendario + fields */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <div className="p-3 sm:p-4 overflow-auto">
                <Calendar
                  locale={es}
                  showOutsideDays
                  fixedWeeks
                  numberOfMonths={isMobile ? 1 : 2}
                  mode="range"
                  month={month}
                  onMonthChange={setMonth}
                  selected={tempDate}
                  onSelect={(r) => {
                    setTempDate(r);
                    setActivePreset(null);
                    if (r?.from) setMonth(r.from);
                  }}
                  fromYear={2018}
                  toYear={2032}
                  className="rounded-lg border bg-white shadow-sm p-2"
                  classNames={{
                    months: "flex gap-4",
                    month: "space-y-1",
                    caption_label: "text-sm font-semibold",
                    nav: "flex items-center",
                    nav_button: "h-7 w-7 rounded-md hover:bg-muted",
                    head_cell: "w-8 text-[0.70rem] font-medium text-muted-foreground",
                    table: "w-full border-collapse",
                    row: "w-full mt-1",
                    cell: "p-0",
                    day: "h-8 w-8 text-sm rounded-md aria-selected:opacity-100",
                    day_today: "font-semibold",
                    day_selected: "bg-red-600 text-white hover:bg-red-600",
                    day_range_start: "bg-red-600 text-white rounded-l-md",
                    day_range_end: "bg-red-600 text-white rounded-r-md",
                    day_range_middle: "bg-red-100 text-red-900 hover:bg-red-100",
                  }}
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

              <div className="mt-auto flex justify-end gap-2 p-3 sm:p-4 border-t bg-background">
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