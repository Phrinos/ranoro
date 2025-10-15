
"use client"

import * as React from "react"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format, startOfWeek, endOfWeek, subDays, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "./separator"

interface DateRange {
  from: Date | undefined
  to?: Date | undefined
}

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({ className, date, onDateChange }: DatePickerWithRangeProps) {
  const setDate = onDateChange
  const [open, setOpen] = React.useState(false)

  // Controlamos el mes mostrado por el calendario (en vez de defaultMonth)
  const [month, setMonth] = React.useState<Date>(date?.from ?? new Date())
  React.useEffect(() => {
    if (date?.from) setMonth(date.from)
  }, [date?.from])

  const today = new Date()

  // Normaliza a 00:00 para evitar off-by-one por TZ
  const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const selectRange = (from: Date, to: Date) => {
    const start = normalize(from)
    const end = normalize(to)
    setDate({ from: start, to: end })
    setMonth(start)
  }

  const thisMonth = () => {
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    selectRange(from, to)
  }

  const lastMonth = () => {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const to = new Date(today.getFullYear(), today.getMonth(), 0)
    selectRange(from, to)
  }

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
                onChange={(value: any) => {
                  if (Array.isArray(value) && value.length === 2) {
                    setDate({ from: value[0], to: value[1] });
                  } else {
                    setDate({ from: value, to: value });
                  }
                }}
                value={date?.from && date.to ? [date.from, date.to] : date?.from}
                selectRange={true}
                locale="es-MX"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
