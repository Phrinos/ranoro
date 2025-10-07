"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = es,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      // ✅ un solo mes, estilo minimal
      numberOfMonths={1}
      showOutsideDays={showOutsideDays}
      locale={locale}
      className={cn("p-4", className)}
      classNames={{
        // Layout
        months: "flex",
        month: "w-full",
        // ✅ Título centrado con flechas a los lados
        caption: "relative flex items-center justify-center py-2",
        caption_label: "text-base font-medium",
        nav: "absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2",
        nav_button:
          "inline-flex h-8 w-8 items-center justify-center rounded-full text-red-600 hover:bg-red-50 focus-visible:outline-none",
        // Tabla
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "w-10 text-xs font-medium text-gray-400",
        row: "flex w-full",
        cell: "p-0 w-10 h-10 text-center",
        // Días
        day:
          "inline-flex h-10 w-10 items-center justify-center rounded-full text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500",
        day_selected:
          "bg-red-600 text-white hover:bg-red-600 focus:bg-red-600",
        day_today: "text-red-600 font-semibold",
        day_outside: "text-gray-300 opacity-70",
        day_disabled: "text-gray-400 opacity-50",
        // Si usas modo range, se verá limpio (sin textura)
        day_range_middle: "bg-red-100 text-red-900 rounded-none",
        day_range_start: "bg-red-600 text-white rounded-l-full",
        day_range_end: "bg-red-600 text-white rounded-r-full",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";
export { Calendar };
