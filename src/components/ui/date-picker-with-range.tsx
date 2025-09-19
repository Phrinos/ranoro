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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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

  React.useEffect(() => {
    if (isOpen) { setTempDate(date); setActivePreset(null); }
  }, [isOpen, date]);

  const handleApply = () => { onDateChange(tempDate); setIsOpen(false); };
  const handleCancel = () => { setTempDate(date); setIsOpen(false); };

  const setPreset = (key: string) => {
    const now = new Date();
    let range: DateRange | undefined;
    switch (key) {
      case "yesterday":  range = { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) }; break;
      case "this_week":  range = { from: startOfWeek(now, { locale: es }), to: endOfWeek(now, { locale: es }) }; break;
      case "last_week":  range = { from: startOfWeek(subWeeks(now, 1), { locale: es }), to: endOfWeek(subWeeks(now, 1), { locale: es }) }; break;
      case "this_month": range = { from: startOfMonth(now), to: endOfMonth(now) }; break;
      case "last_month": range = { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) }; break;
      case "this_year":  range = { from: startOfYear(now), to: endOfYear(now) }; break;
      case "last_year":  range = { from: startOfYear(new Date(now.getFullYear()-1,0,1)), to: endOfYear(new Date(now.getFullYear()-1,0,1)) }; break;
      case "from_start": range = { from: earliest, to: endOfDay(now) }; break;
      default: range = undefined;
    }
    setActivePreset(key);
    setTempDate(range);
  };

  const label =
    date?.from
      ? date?.to
        ? `${format(date.from, "dd MMM yyyy", { locale: es })} – ${format(date.to, "dd MMM yyyy", { locale: es })}`
        : `${format(date.from, "dd MMM yyyy", { locale: es })}`
      : "Seleccione un rango";

  const presetItems = [
    { k: "yesterday",  t: "Ayer" },
    { k: "this_week",  t: "Esta semana" },
    { k: "last_week",  t: "Semana anterior" },
    { k: "this_month", t: "Este mes" },
    { k: "last_month", t: "Mes anterior" },
    { k: "this_year",  t: "Este año" },
    { k: "last_year",  t: "Año anterior" },
    { k: "from_start", t: "Desde inicio" },
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

        {/* Modal centrado y con scroll interno */}
        <DialogContent
          className={cn(
            "p-0 border-0 bg-background",
            "w-[min(100vw-1.5rem,920px)] sm:rounded-xl",
            "max-h-[90vh] overflow-hidden"
          )}
        >
          <div className="flex h-full">
            {/* Presets */}
            {isMobile ? (
              <div className="px-3 py-2 border-b overflow-x-auto whitespace-nowrap space-x-2">
                {presetItems.map(({ k, t }) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={activePreset === k ? "default" : "outline"}
                    className={cn("rounded-full", activePreset === k ? "bg-red-600 hover:bg-red-600" : "")}
                    onClick={() => setPreset(k)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            ) : (
              <aside className="w-56 shrink-0 border-r overflow-auto">
                <ul className="py-2">
                  {presetItems.map(({ k, t }) => (
                    <li key={k}>
                      <button
                        type="button"
                        onClick={() => setPreset(k)}
                        className={cn(
                          "w-full text-left px-4 py-2 text-sm hover:bg-muted/60",
                          activePreset === k ? "bg-red-100 text-red-700" : ""
                        )}
                      >
                        {t}
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
            )}

            {/* Contenido scrollable */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-3 sm:p-4 overflow-auto">
                <Calendar
                  locale={es}
                  showOutsideDays
                  fixedWeeks
                  numberOfMonths={isMobile ? 1 : 2}
                  mode="range"
                  defaultMonth={tempDate?.from ?? new Date()}
                  selected={tempDate}
                  onSelect={setTempDate}
                  fromYear={2018}
                  toYear={2032}
                  className="bg-white rounded-md"
                  classNames={{
                    caption_label: "text-sm font-semibold",
                    head_cell: "w-9 text-[0.75rem] font-medium text-muted-foreground",
                    day: "h-9 w-9",
                  }}
                  weekStartsOn={1}
                />

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input readOnly value={tempDate?.from ? format(tempDate.from, "dd MMM yyyy", { locale: es }) : ""} placeholder="Inicio" />
                  <Input readOnly value={tempDate?.to ? format(tempDate.to, "dd MMM yyyy", { locale: es }) : ""} placeholder="Fin" />
                </div>
              </div>

              {/* Footer sticky */}
              <div className="mt-auto flex justify-end gap-2 p-3 sm:p-4 border-t bg-background">
                <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                <Button onClick={handleApply} className="bg-red-600 hover:bg-red-600">Aceptar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
