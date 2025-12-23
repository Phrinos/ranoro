"use client";

import * as React from "react";
import ReactCalendar, { type CalendarProps as ReactCalendarProps } from "react-calendar";
import "react-calendar/dist/Calendar.css";

type Mode = "single";

// Wrapper para que compile con el API que ya estás usando en dialogs
export type CalendarProps = Omit<ReactCalendarProps, "value" | "onChange"> & {
  mode?: Mode;
  selected?: Date;
  onSelect?: (date?: Date) => void;
  initialFocus?: boolean;
};

export function Calendar({ selected, onSelect, ...props }: CalendarProps) {
  return (
    <ReactCalendar
      {...props}
      value={selected}
      onChange={(value) => {
        const d = Array.isArray(value) ? value[0] : value;
        onSelect?.(d ?? undefined);
      }}
    />
  );
}
