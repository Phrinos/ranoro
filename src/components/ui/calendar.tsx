
"use client";

import * as React from "react";
import ReactCalendar from "react-calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof ReactCalendar>;

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <div className={cn("rc rc-red p-2 select-none", className)}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
/* ======= Tema Ranoro (Rojo) - sin CSS por defecto de react-calendar ======= */
.rc.rc-red{
  --rc-primary: #a2231d;               /* rojo Ranoro */
  --rc-primary-600: #dc2626;           /* rojo 600 para hover/acentos */
  --rc-mid: rgba(162, 35, 29, .14);    /* rojo translúcido para tramo medio */
  --rc-text: #111827;
  --rc-muted:#9ca3af;
  --rc-border: hsl(240 5.9% 88%);
  --rc-bg:#fff;
}

/* Contenedor */
.rc-red .react-calendar{
  width:100%;
  background:var(--rc-bg);
  border:1px solid var(--rc-border);
  border-radius:.75rem;
  box-shadow:0 1px 2px rgba(0,0,0,.04);
  font-family:inherit;
  line-height:1.1;
}

/* Navegación */
.rc-red .react-calendar__navigation{
  display:flex; align-items:center; justify-content:center; gap:.5rem;
  padding:.25rem .5rem .5rem;
  position:relative;
}
.rc-red .react-calendar__navigation__label{
  font-weight:700; color:var(--rc-primary); pointer-events:none;
}
.rc-red .react-calendar__navigation button{
  min-width:2rem; height:2rem; border-radius:9999px;
  color:var(--rc-primary); background:transparent; border:none;
}
.rc-red .react-calendar__navigation button:hover{ background:rgba(162,35,29,.08); }
.rc-red .react-calendar__navigation__prev-button{ position:absolute; left:.25rem; }
.rc-red .react-calendar__navigation__next-button{ position:absolute; right:.25rem; }

/* Semanas */
.rc-red .react-calendar__month-view__weekdays{
  text-transform:none; font-size:.75rem; color:var(--rc-muted);
}
.rc-red .react-calendar__month-view__weekdays__weekday abbr{ text-decoration:none; }

/* Días */
.rc-red .react-calendar__tile{
  padding:.5rem 0; border-radius:.6rem; background-image:none !important;
}
.rc-red .react-calendar__tile:enabled:hover{ background:rgba(17,24,39,.05); }
.rc-red .react-calendar__tile--now{ outline:1px solid rgba(162,35,29,.35); }

/* === RESET fuerte: desactiva el sólido de --active del CSS por defecto === */
.rc-red .react-calendar .react-calendar__tile--active{
  background:transparent !important;
  color:inherit !important;
  background-image:none !important;
}

/* Tramo medio del rango (translúcido) */
.rc-red .react-calendar .react-calendar__tile--range:not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd),
.rc-red .react-calendar.react-calendar--selectRange
  .react-calendar__tile.react-calendar__tile--active:not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd){
  background:var(--rc-mid) !important;
  color:#7f1d1d !important;
  border-radius:0 !important;
}

/* Extremos del rango (sólidos, en píldora) */
.rc-red .react-calendar .react-calendar__tile--rangeStart,
.rc-red .react-calendar .react-calendar__tile--rangeEnd{
  background:var(--rc-primary) !important;
  color:#fff !important;
  border-radius:9999px !important;
}

/* Día único (inicio = fin) */
.rc-red .react-calendar .react-calendar__tile--rangeBothEnds{
  background:var(--rc-primary) !important; color:#fff !important; border-radius:.6rem !important;
}

/* Neighbors (otros meses) */
.rc-red .react-calendar__month-view__days__day--neighboringMonth{ color:#d1d5db; }

/* Botón focus */
.rc-red .react-calendar__tile:focus-visible{
  outline:2px solid rgba(162,35,29,.35);
  outline-offset:2px;
}
          `,
        }}
      />

      <ReactCalendar
        view="month"
        minDetail="month"
        maxDetail="month"
        showNeighboringMonth
        next2Label={null}
        prev2Label={null}
        nextLabel={<ChevronRight className="h-4 w-4" />}
        prevLabel={<ChevronLeft className="h-4 w-4" />}
        locale="es-MX" // Locale for Spanish (Mexico)
        {...props}
      />
    </div>
  );
}
Calendar.displayName = "Calendar";
