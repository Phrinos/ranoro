"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarProps = DayPickerProps;

/**
 * Calendario base (react-day-picker) con estilos de la app:
 * - Día seleccionado en rojo (var(--primary))
 * - Fines de semana en rojo
 * - Sin selector de año (solo flechas)
 * - Sin subestilos que rompan la tabla
 *
 * IMPORTANTE: no importes "react-day-picker/style.css" en ningún sitio.
 */
export const Calendar: React.FC<CalendarProps> = ({
  className,
  classNames,
  locale = es,
  showOutsideDays = true,
  captionLayout = "buttons", // sin dropdown de mes/año
  ...props
}) => {
  // Forzamos lunes como primer día de la semana
  const localeWithMonday = React.useMemo(
    () => ({ ...(locale as any), options: { ...(locale as any)?.options, weekStartsOn: 1 } }),
    [locale]
  );

  return (
    <>
      <DayPicker
        showOutsideDays={showOutsideDays}
        locale={localeWithMonday}
        captionLayout={captionLayout}
        className={cn("rdp-root p-3", className)}
        classNames={{
          // NO tocar head_row/row para no romper la tabla
          months: "space-y-2",
          month: "space-y-2",
          caption: "flex items-center justify-between px-1",
          caption_label: "text-base font-semibold",
          nav: "flex items-center gap-2",
          nav_button:
            "inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          nav_button_previous: "",
          nav_button_next: "",
          table: "w-full border-collapse",
          head_cell: "py-2 text-xs font-medium text-muted-foreground",
          cell: "p-[2px]",
          day:
            "h-9 w-9 rounded-md text-sm hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          day_today: "font-semibold underline decoration-2 decoration-primary/60",
          day_outside: "text-muted-foreground opacity-50",
          day_disabled: "opacity-50",
          day_weekend: "text-red-600",
          ...classNames,
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
        }}
        {...props}
      />

      {/* Overrides mínimos para eliminar el azul por defecto del paquete */}
      <style jsx global>{`
        .rdp-root .rdp-day_selected:not([disabled]) {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .rdp-root .rdp-day_selected:not([disabled]):hover {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          filter: brightness(0.96);
        }
        .rdp-root .rdp-nav_button {
          color: hsl(var(--foreground));
        }
        /* Fines de semana en rojo; si está seleccionado, mantiene el color del seleccionado */
        .rdp-root .rdp-day_weekend {
          color: #dc2626;
        }
        .rdp-root .rdp-day_selected.rdp-day_weekend {
          color: hsl(var(--primary-foreground));
        }
      `}</style>
    </>
  );
};

Calendar.displayName = "Calendar";
export default Calendar;
