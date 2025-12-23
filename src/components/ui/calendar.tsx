"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import type { Locale } from "date-fns";
import { es as esLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

import ReactCalendar, {
  type CalendarProps as ReactCalendarProps,
  type Value as ReactCalendarValue,
} from "react-calendar";

import "react-day-picker/dist/style.css";
import "react-calendar/dist/Calendar.css";

/**
 * Calendar (DayPicker / shadcn-like)
 * - Soporta: selected/onSelect (nativo)
 * - Soporta: value/onChange (alias para compat con formularios viejos)
 * - locale: puede ser Locale o "es"
 */
export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  value?: Date | undefined;
  onChange?: (date: Date | undefined) => void;
  locale?: Locale | "es" | string;
};

export function Calendar({
  className,
  selected,
  onSelect,
  value,
  onChange,
  locale,
  ...props
}: CalendarProps) {
  const mergedSelected = (selected ?? value) as any;

  const normalizedLocale: Locale | undefined =
    typeof locale === "string" ? (locale.startsWith("es") ? esLocale : undefined) : locale;

  const handleSelect = (d: any) => {
    onSelect?.(d);
    onChange?.(d);
  };

  return (
    <DayPicker
      className={cn("p-3", className)}
      selected={mergedSelected}
      onSelect={handleSelect}
      locale={normalizedLocale as any}
      {...props}
    />
  );
}

/**
 * NewCalendar (react-calendar)
 * - Para vistas tipo “calendario grande”
 * - Soporta value/onChange/locale="es"
 */
export type NewCalendarProps = Omit<ReactCalendarProps, "value" | "onChange" | "locale"> & {
  value?: ReactCalendarValue;
  onChange?: ReactCalendarProps["onChange"];
  locale?: string;
};

export function NewCalendar({ value, onChange, locale, ...props }: NewCalendarProps) {
  return <ReactCalendar value={value ?? null} onChange={onChange} locale={locale} {...props} />;
}
