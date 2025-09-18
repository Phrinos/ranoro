// src/components/shared/table-toolbar.tsx
"use client";

import { ReactNode, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Option = { value: string; label: string };

interface FilterBlock {
  value: string; // key en otherFilters
  label: string;
  options: Option[];
}

interface TableToolbarProps {
  searchTerm: string;
  onSearchTermChange: (v: string) => void;

  sortOption?: string;
  onSortOptionChange?: (v: string) => void;
  sortOptions?: Option[];

  dateRange?: DateRange;
  onDateRangeChange?: (r: DateRange | undefined) => void;

  otherFilters?: Record<string, string | "all">;
  setOtherFilters?: (updater: Record<string, string | "all"> | ((prev: Record<string, string | "all">) => Record<string, string | "all">)) => void;
  filterOptions?: FilterBlock[];

  searchPlaceholder?: string;
  actions?: ReactNode;
}

export function TableToolbar({
  searchTerm,
  onSearchTermChange,
  sortOption,
  onSortOptionChange,
  sortOptions,
  dateRange,
  onDateRangeChange,
  otherFilters,
  setOtherFilters,
  filterOptions,
  searchPlaceholder = "Buscar...",
  actions,
}: TableToolbarProps) {

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      if (!setOtherFilters) return;
      setOtherFilters(prev => {
        const prevVal = prev?.[key] ?? "all";
        if (prevVal === value) return prev; // evita sets redundantes
        return { ...prev, [key]: value };
      });
    },
    [setOtherFilters]
  );

  const handleSortChange = useCallback(
    (val: string) => {
      if (!onSortOptionChange) return;
      if (val === sortOption) return; // evita sets redundantes
      onSortOptionChange(val);
    },
    [onSortOptionChange, sortOption]
  );

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Input
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        className="h-10 w-full sm:w-auto sm:flex-grow lg:w-full bg-white"
      />

      <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
        {/* Filtros */}
        {filterOptions?.map((block) => {
          const current = (otherFilters?.[block.value] ?? "all") as string;
          return (
            <Select
              key={`filter:${block.value}:${current}`}
              defaultValue={current}
              onValueChange={(val) => handleFilterChange(block.value, val)}
            >
              <SelectTrigger className="h-10 min-w-[12rem] bg-white">
                <SelectValue placeholder={block.label} />
              </SelectTrigger>
              <SelectContent>
                {block.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        })}

        {/* Rango de fechas */}
        {onDateRangeChange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 bg-white">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from
                  ? dateRange.to
                    ? `${format(dateRange.from, "dd MMM yyyy", { locale: es })} – ${format(dateRange.to, "dd MMM yyyy", { locale: es })}`
                    : format(dateRange.from, "dd MMM yyyy", { locale: es })
                  : "Rango de fechas"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={onDateRangeChange}
                numberOfMonths={2}
                locale={es}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Orden */}
        {sortOptions && onSortOptionChange && (
          <Select
            key={`sort:${sortOption ?? 'none'}`}
            defaultValue={sortOption ?? undefined}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="h-10 min-w-[12rem] bg-white">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {actions}
      </div>
    </div>
  );
}
