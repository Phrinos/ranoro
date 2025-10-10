"use client";

import { cn } from "@/lib/utils";
import { es } from "date-fns/locale";
import Calendar, { type CalendarProps } from "react-calendar";
import "react-calendar/dist/Calendar.css";

export const NewCalendar = ({ className, ...props }: CalendarProps) => {
  return (
    <Calendar
      locale={es.code}
      className={cn(
        "rounded-lg border border-border p-4 text-sm",
        className,
      )}
      {...props}
    />
  );
};
