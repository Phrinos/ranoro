"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DropdownProps } from "react-day-picker";
import "react-day-picker/style.css";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
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
      showOutsideDays={showOutsideDays}
      // 🔴 Forzamos variables de RDP en el nodo raíz (gana a cualquier CSS que venga después)
      style={
        {
          // red-600 / red-100 / red-900
          ["--rdp-accent-color" as any]: "#dc2626",
          ["--rdp-accent-background" as any]: "#dc2626",
          ["--rdp-range_middle-background" as any]: "#fee2e2",
          ["--rdp-range_middle-color" as any]: "#7f1d1d",
        } as React.CSSProperties
      }
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        caption_dropdowns: "flex justify-center gap-1",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-6 w-6 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.75rem]",
        row: "flex w-full mt-2",
        cell:
          "h-8 w-8 text-center text-sm p-0 relative " +
          // fondo suave para tramos seleccionados (usa vars ya en rojo)
          "[&:has([aria-selected])]:bg-[var(--rdp-range_middle-background)] " +
          "[&:has([aria-selected].day-outside)]:bg-[var(--rdp-range_middle-background)] " +
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md " +
          "focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        // botón/día seleccionado usa var(--rdp-accent-background) = rojo
        day_selected:
          "text-white hover:text-white focus:text-white",
        // “hoy” borde rojo
        day_today: "border border-red-600 text-inherit",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-[var(--rdp-range_middle-background)] aria-selected:text-[var(--rdp-range_middle-color)]",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...iconProps }) => (
          <ChevronLeft className={cn("h-4 w-4 text-red-600", className)} {...iconProps} />
        ),
        IconRight: ({ className, ...iconProps }) => (
          <ChevronRight className={cn("h-4 w-4 text-red-600", className)} {...iconProps} />
        ),
        Dropdown: ({ value, onChange, children }: DropdownProps) => {
          const options = React.Children.toArray(children) as React.ReactElement<React.HTMLProps<HTMLOptionElement>>[];
          const currentValue = value?.toString() ?? "";
          const selected = options.find((opt) => opt.props.value?.toString() === currentValue);
          const emitChange = (next: string) => {
            if (next === currentValue) return;
            onChange?.({ target: { value: next } } as unknown as React.ChangeEvent<HTMLSelectElement>);
          };
          return (
            <Select value={currentValue} onValueChange={emitChange}>
              <SelectTrigger className="pr-1.5 focus:ring-0 h-7 text-xs w-[60px]">
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
