
// src/components/ui/calendar.tsx
"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DropdownProps } from "react-day-picker";
import "react-day-picker/style.css";

import { es } from "date-fns/locale";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { ScrollArea } from "./scroll-area";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      /* ✅ Español por defecto */
      locale={es}
      showOutsideDays={showOutsideDays}
      /* ✅ Colores del acento → rojo (evita azul por defecto) */
      style={
        {
          // @ts-expect-error CSS var
          "--rdp-accent-color": "rgb(220 38 38)",           // red-600
          "--rdp-accent-background-color": "rgb(254 226 226)", // red-100
        } as React.CSSProperties
      }
      /* ✅ Fuerza layout estable (vence CSS de react-day-picker) */
      styles={{
        caption: {
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 4,
        },
        head_row: {
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0,1fr))",
        },
        row: {
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0,1fr))",
          marginTop: "0.5rem",
        },
        head_cell: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "2.25rem",
        },
        table: { width: "100%", borderCollapse: "separate" },
      }}
      /* ✅ Días de la semana en 2 letras: lu, ma, mi, ju, vi, sá, do */
      formatters={{
        formatWeekdayName: (date) => format(date, "EEEEEE", { locale: es }),
      }}
      className={cn("p-3", className)}
      classNames={{
        months:
          "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",

        caption_label: "text-sm font-medium",
        caption_dropdowns: "flex justify-center gap-1",

        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        /* ✅ Flechas a los lados del mes */
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",

        head_cell:
          "text-muted-foreground rounded-md font-normal text-[0.8rem]",

        cell:
          "h-9 w-9 text-center text-sm p-0 relative " +
          "[&:has([aria-selected].day-range-end)]:rounded-r-md " +
          "[&:has([aria-selected].day-outside)]:bg-accent/50 " +
          "[&:has([aria-selected])]:bg-accent " +
          "first:[&:has([aria-selected])]:rounded-l-md " +
          "last:[&:has([aria-selected])]:rounded-r-md " +
          "focus-within:relative focus-within:z-20",

        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        /* ✅ Selección en rojo (sin aro azul) */
        day_selected:
          "bg-red-600 text-white hover:bg-red-600 hover:text-white focus:bg-red-600 focus:text-white",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 " +
          "aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",

        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        /* Dropdowns de mes/año integrados con tu Select */
        Dropdown: ({ value, onChange, children }: DropdownProps) => {
          const options = React.Children.toArray(
            children
          ) as React.ReactElement<React.HTMLProps<HTMLOptionElement>>[];
          const currentValue = value?.toString() ?? "";
          const selected = options.find(
            (opt) => opt.props.value?.toString() === currentValue
          );
          const emitChange = (next: string) => {
            if (next === currentValue) return;
            onChange?.({
              target: { value: next },
            } as unknown as React.ChangeEvent<HTMLSelectElement>);
          };
          return (
            <Select value={currentValue} onValueChange={emitChange}>
              <SelectTrigger className="pr-1.5 focus:ring-0 h-7 text-xs w-[72px]">
                <SelectValue>{selected?.props?.children}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper">
                <ScrollArea className="h-48">
                  {options.map((opt, idx) => {
                    const optVal = opt.props.value?.toString() ?? "";
                    return (
                      <SelectItem key={`${optVal}-${idx}`} value={optVal}>
                        {opt.props.children}
                      </SelectItem>
                    );
                  })}
                </ScrollArea>
              </SelectContent>
            </Select>
          );
        },
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";
export { Calendar };
