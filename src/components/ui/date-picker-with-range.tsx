
"use client"

import * as React from "react"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format, startOfWeek, endOfWeek, subDays, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "./separator"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({ className, date, onDateChange }: DatePickerWithRangeProps) {
  const [open, setOpen] = React.useState(false);

  const handleCalendarChange = (value: any) => {
    if (Array.isArray(value) && value.length === 2) {
      onDateChange({ from: value[0], to: value[1] });
    } else {
      onDateChange({ from: value, to: value });
    }
  };
  
  const today = new Date();

  const selectRange = (from: Date, to: Date) => {
    onDateChange({ from, to });
    setOpen(false);
  };

  const thisMonth = () => {
    const from = startOfMonth(today);
    const to = endOfMonth(today);
    selectRange(from, to);
  }

  const lastMonth = () => {
    const from = startOfMonth(subDays(today, today.getDate()));
    const to = endOfMonth(subDays(today, today.getDate()));
    selectRange(from, to);
  }
  
  const calendarValue = date?.from && date?.to ? [date.from, date.to] : (date?.from ? date.from : undefined);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal bg-white",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale: es })} –{" "}
                  {format(date.to, "LLL dd, y", { locale: es })}
                </>
              ) : (
                format(date.from, "LLL dd, y", { locale: es })
              )
            ) : (
              <span>Seleccione un rango</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0 flex" align="start">
          <div className="flex flex-col space-y-2 p-4 border-r">
            <Button onClick={() => selectRange(today, today)} variant="ghost" className="w-full justify-start">Hoy</Button>
            <Button onClick={() => { const y = new Date(today); y.setDate(y.getDate() - 1); selectRange(y, y) }} variant="ghost" className="w-full justify-start">Ayer</Button>
            <Button onClick={() => { const from = new Date(today); from.setDate(from.getDate() - 6); selectRange(from, today) }} variant="ghost" className="w-full justify-start">Últimos 7 días</Button>
            <Button onClick={() => { selectRange(startOfWeek(today, { locale: es }), endOfWeek(today, { locale: es })) }} variant="ghost" className="w-full justify-start">Esta semana</Button>
            <Button onClick={thisMonth} variant="ghost" className="w-full justify-start">Este mes</Button>
            <Button onClick={lastMonth} variant="ghost" className="w-full justify-start">Mes pasado</Button>
          </div>

          <Separator orientation="vertical" />
           <div className="p-2">
            <Calendar
                onChange={handleCalendarChange}
                value={calendarValue}
                selectRange={true}
                locale="es-MX"
            />
           </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
