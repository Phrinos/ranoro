
"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DropdownProps } from "react-day-picker";
import "react-day-picker/style.css";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { ScrollArea } from "./scroll-area";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  locale = es,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      className={cn("p-3", className)}
      /* No forcemos grid en <tr>; dejamos que el reset CSS mantenga table layout */
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        caption_dropdowns: "flex justify-center gap-1",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full",
        head_cell: "text-muted-foreground font-normal text-[0.8rem]",
        cell: "p-0 text-sm align-middle relative",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_selected:
          "bg-red-600 text-white hover:bg-red-600 hover:text-white focus:bg-red-600 focus:text-white",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        ...classNames,
      }}
      /* Abreviaturas de días: “lu ma mi ju vi sá do” */
      formatters={{
        formatWeekdayName: (date, options) =>
          format(date, "EE", { ...(options || {}), locale }).toLowerCase(),
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        Dropdown: ({ value, onChange, children }: DropdownProps) => {
          const options = React.Children.toArray(
            children
          ) as React.ReactElement<React.HTMLProps<HTMLOptionElement>>[];
          const currentValue = value?.toString() ?? "";
          const selected = options.find(
            (opt) => opt.props.value?.toString() === currentValue
          );
          const emit = (next: string) =>
            next !== currentValue &&
            onChange?.({
              target: { value: next },
            } as unknown as React.ChangeEvent<HTMLSelectElement>);
          return (
            <Select value={currentValue} onValueChange={emit}>
              <SelectTrigger className="pr-1.5 focus:ring-0 h-7 text-xs w-[64px]">
                <SelectValue>{selected?.props?.children}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper">
                <ScrollArea className="h-48">
                  {options.map((opt, i) => {
                    const v = opt.props.value?.toString() ?? "";
                    return (
                      <SelectItem key={`${v}-${i}`} value={v}>
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
      /* Tema rojo */
      style={
        {
          "--rdp-accent-color": "rgb(220 38 38)",               // red-600
          "--rdp-accent-background-color": "rgb(254 226 226)",  // red-100
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
