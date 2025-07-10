
"use client";

import React from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

interface SortOption {
    value: string;
    label: string;
}

interface FilterOption {
    value: string;
    label: string;
}

interface TableToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  dateRange?: DateRange;
  onDateRangeChange: (range?: DateRange) => void;
  sortOption: string;
  onSortOptionChange: (value: string) => void;
  sortOptions?: SortOption[];
  filterOption?: string;
  onFilterOptionChange?: (value: string) => void;
  filterOptions?: FilterOption[];
  filterLabel?: string;
  searchPlaceholder?: string;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchTerm,
  onSearchTermChange,
  dateRange,
  onDateRangeChange,
  sortOption,
  onSortOptionChange,
  sortOptions = [
    { value: 'date_desc', label: 'Más Reciente' },
    { value: 'date_asc', label: 'Más Antiguo' }
  ],
  filterOption,
  onFilterOptionChange,
  filterOptions,
  filterLabel = 'Filtrar',
  searchPlaceholder = 'Buscar...',
}) => {
    
    const setDateToToday = () => onDateRangeChange({ from: new Date(), to: new Date() });
    const setDateToThisWeek = () => {
        const now = new Date();
        const start = new Date(now.setDate(now.getDate() - now.getDay()));
        const end = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        onDateRangeChange({ from: start, to: end });
    };
    const setDateToThisMonth = () => {
        const now = new Date();
        onDateRangeChange({ from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0) });
    };
    
    
  return (
    <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              className="w-full rounded-lg bg-card pl-8"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className={cn("min-w-[240px] justify-start text-left font-normal flex-1 sm:flex-initial bg-card", !dateRange && "text-muted-foreground")}>
                <CalendarDateIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}`) : format(dateRange.from, "LLL dd, y", { locale: es })) : (<span>Seleccione rango</span>)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <div className="flex p-2">
                    <Button variant="ghost" size="sm" onClick={setDateToToday}>Hoy</Button>
                    <Button variant="ghost" size="sm" onClick={setDateToThisWeek}>Semana</Button>
                    <Button variant="ghost" size="sm" onClick={setDateToThisMonth}>Mes</Button>
                </div>
              <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={onDateRangeChange} numberOfMonths={2} locale={es} />
            </PopoverContent>
          </Popover>

          {filterOptions && onFilterOptionChange && filterOption && (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial bg-card">
                    <Filter className="mr-2 h-4 w-4" />
                    <span>{filterOptions.find(f=> f.value === filterOption)?.label || filterLabel}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{filterLabel}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={filterOption} onValueChange={onFilterOptionChange}>
                    {filterOptions.map(opt => (
                        <DropdownMenuRadioItem key={opt.value} value={opt.value}>{opt.label}</DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial bg-card">
                <ListFilter className="mr-2 h-4 w-4" />
                <span>Ordenar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sortOption} onValueChange={onSortOptionChange}>
                {sortOptions.map(opt => (
                    <DropdownMenuRadioItem key={opt.value} value={opt.value}>{opt.label}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
    </div>
  );
};

TableToolbar.displayName = 'TableToolbar';
