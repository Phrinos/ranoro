// src/components/shared/table-toolbar.tsx
"use client";

import { ReactNode, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Search } from "lucide-react";


interface DateRange {
    from: Date | undefined;
    to?: Date | undefined;
  }

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
      {/* Search Input on the left */}
      {onSearchTermChange && (
        <div className="relative w-full flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm ?? ''}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="h-10 w-full pl-8 bg-card"
          />
        </div>
      )}

      {/* Filters and Actions on the right */}
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto flex-shrink-0">
        {/* Other select filters */}
        {filterOptions?.map((block) => {
          const current = (otherFilters?.[block.value] ?? "all") as string;
          return (
            <Select
              key={`filter:${block.value}:${current}`}
              defaultValue={current}
              onValueChange={(val) => handleFilterChange(block.value, val)}
            >
              <SelectTrigger className="h-10 min-w-[10rem] w-full sm:w-auto bg-card">
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

        {/* Date Range Picker */}
        {onDateRangeChange && (
          <DatePickerWithRange date={dateRange} onDateChange={onDateRangeChange} />
        )}

        {/* Sort Options */}
        {sortOptions && onSortOptionChange && (
          <Select value={sortOption} onValueChange={onSortOptionChange}>
            <SelectTrigger className="h-10 w-full sm:w-auto bg-card">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Custom Actions */}
        {actions}
      </div>
    </div>
  );
}
