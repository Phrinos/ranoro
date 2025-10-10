"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import type { DayPickerProps } from "react-day-picker";
import { es } from "date-fns/locale";

// Importa SOLO el CSS base de la librería (desde node_modules)
import "react-day-picker/style.css";
// Overrides pequeños, seguros (no cambian el layout de la grilla)
import "./calendar.css";

export type CalendarProps = DayPickerProps;

export function Calendar({
  className,
  showOutsideDays = true,
  locale,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      {...props}
      showOutsideDays={showOutsideDays}
      fixedWeeks
      locale={locale ?? es}
      captionLayout="buttons" // Habilita la navegación por año
      className={["rdp-root", className].filter(Boolean).join(" ")}
      // Iconos simples; puedes cambiarlos si quieres usar lucide
      components={{
        IconLeft: () => (
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
        IconRight: () => (
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      }}
    />
  );
}
