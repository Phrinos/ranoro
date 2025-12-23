"use client"

import * as React from "react"
import ReactCalendar, { type CalendarProps as ReactCalendarProps } from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { cn } from "@/lib/utils";

type ValuePiece = Date | null;
export type CalendarValue = ValuePiece | [ValuePiece, ValuePiece];

export type CalendarProps = Omit<ReactCalendarProps, "value" | "onChange"> & {
  mode?: "single";
  selected?: Date;
  onSelect?: (date?: Date) => void;
  initialFocus?: boolean;
  value?: Date | null;
  onChange?: (date?: Date) => void;
  locale?: string;
};

export function Calendar({ selected, onSelect, value, onChange, locale, ...props }: CalendarProps) {
  const v: CalendarValue = (selected ?? value ?? null) as CalendarValue;

  return (
    <ReactCalendar
      {...props}
      locale={locale}
      value={v}
      onChange={(next: any) => {
        const d = Array.isArray(next) ? next[0] : next;
        const date = d ?? undefined;
        onSelect?.(date);
        onChange?.(date);
      }}
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
