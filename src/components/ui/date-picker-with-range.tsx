"use client";

import * as React from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
}

function sameDay(a?: Date, b?: Date) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function sameRange(a?: DateRange, b?: DateRange) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return sameDay(a.from, b.from) && sameDay(a.to, b.to);
}

export function DatePickerWithRange({ className, date, onDateChange }: DatePickerWithRangeProps) {
  const applyRange = (next?: DateRange) => {
    // Evita setState si el rango no cambia (previene bucles de render)
    if (!sameRange(next, date)) onDateChange(next);
  };

  const handlePresetChange = (value: string) => {
    const now = new Date();
    if (value === "last_month") {
      const last = subMonths(now, 1);
      applyRange({ from: startOfMonth(last), to: endOfMonth(last) });
      return;
    }
    if (value === "last_3_months") {
      applyRange({ from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) });
      return;
    }
    if (value === "last_6_months") {
      applyRange({ from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) });
      return;
    }
    // “Limpiar”
    applyRange(undefined);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn("w-full sm:w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} – {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Seleccione un rango</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex items-center justify-center p-2">
            <Select onValueChange={handlePresetChange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selecciones comunes..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_month">Mes anterior</SelectItem>
                <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
                <SelectItem value="last_6_months">Últimos 6 meses</SelectItem>
                <SelectItem value="clear">Limpiar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Calendar
            mode="range"
            numberOfMonths={2}
            showOutsideDays
            initialFocus
            defaultMonth={date?.from ?? new Date()}
            selected={date}
            onSelect={(range) => applyRange(range)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
