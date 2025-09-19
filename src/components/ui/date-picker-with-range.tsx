
"use client";

import * as React from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  /** Si quieres mostrar solo 1 mes en pantallas chicas */
  months?: 1 | 2;
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
  months = 1, // Default to 1 month to make it smaller
}: DatePickerWithRangeProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date);

  React.useEffect(() => {
    if (isOpen) {
      setTempDate(date);
    }
  }, [isOpen, date]);

  const handleApply = () => {
    onDateChange(tempDate);
    setIsOpen(false);
  };

  const setPreset = (preset: "last_month" | "last_3" | "last_6" | "clear") => {
    const now = new Date();
    let newRange: DateRange | undefined;
    if (preset === "clear") {
      newRange = undefined;
    } else if (preset === "last_month") {
      const last = subMonths(now, 1);
      newRange = { from: startOfMonth(last), to: endOfMonth(last) };
    } else if (preset === "last_3") {
      newRange = { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
    } else { // last_6
      newRange = { from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) };
    }
    setTempDate(newRange);
  };

  const label =
    date?.from
      ? date?.to
        ? `${format(date.from, "dd MMM yyyy", { locale: es })} – ${format(date.to, "dd MMM yyyy", { locale: es })}`
        : `${format(date.from, "dd MMM yyyy", { locale: es })}`
      : "Seleccione un rango";

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal bg-white",
              !date && "text-muted-foreground"
            )}
            aria-label="Elegir rango de fechas"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{label}</span>
            {date?.from && (
              <X
                className="ml-auto h-4 w-4 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDateChange(undefined);
                }}
              />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-auto p-0 rounded-xl border shadow-lg bg-popover"
          sideOffset={8}
        >
          {/* Header sticky con presets */}
          <div className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur px-3 py-2">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setPreset("last_month")}>
                Mes anterior
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreset("last_3")}>
                Últimos 3 meses
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreset("last_6")}>
                Últimos 6 meses
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPreset("clear")}>
                Limpiar
              </Button>
            </div>
          </div>

          {/* Calendario (puede crecer, por eso no limitamos height aquí) */}
          <div className="p-2">
            <Calendar
              locale={es}
              showOutsideDays
              fixedWeeks
              numberOfMonths={months}
              mode="range"
              defaultMonth={tempDate?.from}
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
          </div>
          <div className="flex justify-end p-2 border-t">
              <Button size="sm" onClick={handleApply}>Aceptar</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
