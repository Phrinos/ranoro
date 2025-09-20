
// src/components/shared/table-toolbar.tsx
"use client";

import { ReactNode, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Search } from "lucide-react";

type Option = { value: string; label: string };

interface FilterBlock {
  value: string; // key en otherFilters
  label: string;
  options: Option[];
}

interface TableToolbarProps {
  searchTerm?: string;
  onSearchTermChange?: (v: string) => void;

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

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row w-full sm:w-auto flex-wrap items-center gap-2">
            {onSearchTermChange && (
                 <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchTerm ?? ''}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                        className="h-10 w-full sm:w-[250px] pl-8 bg-white"
                    />
                </div>
            )}
            {/* Filtros */}
            {filterOptions?.map((block) => {
            const current = (otherFilters?.[block.value] ?? "all") as string;
            return (
                <Select
                key={`filter:${block.value}:${current}`}
                defaultValue={current}
                onValueChange={(val) => handleFilterChange(block.value, val)}
                >
                <SelectTrigger className="h-10 min-w-[10rem] w-full sm:w-auto bg-white">
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
            <DatePickerWithRange date={dateRange} onDateChange={onDateRangeChange} />
            )}
        </div>
        
        {/* Acciones */}
        <div className="flex w-full sm:w-auto items-center justify-end gap-2">
            {actions}
        </div>
    </div>
  );
}
