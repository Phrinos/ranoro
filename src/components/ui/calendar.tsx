"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { es as esLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  locale?: DayPickerProps["locale"];
};

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = esLocale,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      style={
        {
          "--rdp-accent-color": "hsl(var(--primary))",
          "--rdp-accent-color-dark": "hsl(var(--primary))",
          "--rdp-background-color": "hsl(var(--primary))",
          "--rdp-outline": "2px solid hsl(var(--ring))",
          "--rdp-outline-selected": "2px solid hsl(var(--ring))",
        } as React.CSSProperties
      }
      className={cn("p-3", className)}
      classNames={{
        caption: "flex items-center justify-center pt-1 relative",
        caption_label: "text-base font-semibold",
        nav: "flex items-center space-x-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 p-0 bg-transparent opacity-70 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_cell:
          "text-muted-foreground w-9 font-medium text-[0.8rem] text-center",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "text-destructive font-semibold",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}