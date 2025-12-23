"use client";

import * as React from "react";
import ReactCalendar, { type CalendarProps as ReactCalendarProps } from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { cn } from "@/lib/utils";
import { DayPicker } from "react-day-picker";
import type { Locale } from "date-fns";
import { es as esLocale } from "date-fns/locale";

type ValuePiece = Date | null;
export type CalendarValue = ValuePiece | [ValuePiece, ValuePiece];

export type CalendarProps = Omit<React.ComponentProps<typeof DayPicker>, "value" | "onChange"> & {
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

export type NewCalendarProps = Omit<ReactCalendarProps, "value" | "onChange"> & {
  value?: CalendarValue;
  onChange?: (value: CalendarValue, event?: any) => void; // 👈 flexible
  locale?: string;
};

export function NewCalendar({ value, onChange, locale, ...props }: NewCalendarProps) {
  return (
    <ReactCalendar
      {...props}
      locale={locale}
      value={(value ?? null) as any}
      onChange={(v: any, e: any) => onChange?.(v as CalendarValue, e)}
    />
  );
}
