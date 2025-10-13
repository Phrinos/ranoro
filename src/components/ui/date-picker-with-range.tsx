"use client"

import * as React from "react"
import { CalendarIcon } from "@radix-ui/react-icons"
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns"
import { es } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NewCalendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
    date: DateRange | undefined;
    onDateChange: (date: DateRange | undefined) => void;
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
}: DatePickerWithRangeProps) {
    const setDate = onDateChange;
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal bg-white",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale: es })} -{" "}
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
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="p-4 border-r">
                <div className="space-y-2">
                    <Button onClick={() => setDate({ from: new Date(), to: new Date() })} variant="ghost" className="w-full justify-start">Hoy</Button>
                    <Button onClick={() => setDate({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) })} variant="ghost" className="w-full justify-start">Ayer</Button>
                    <Button onClick={() => setDate({ from: subDays(new Date(), 6), to: new Date() })} variant="ghost" className="w-full justify-start">Últimos 7 días</Button>
                    <Button onClick={() => setDate({ from: startOfWeek(new Date(), { locale: es }), to: endOfWeek(new Date(), { locale: es }) })} variant="ghost" className="w-full justify-start">Esta Semana</Button>
                    <Button onClick={() => setDate({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })} variant="ghost" className="w-full justify-start">Este Mes</Button>
                    <Button onClick={() => setDate({ from: startOfMonth(subDays(new Date(), new Date().getDate())), to: endOfMonth(subDays(new Date(), new Date().getDate())) })} variant="ghost" className="w-full justify-start">Mes Pasado</Button>
                </div>
            </div>
            <NewCalendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={1}
                locale={es}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
