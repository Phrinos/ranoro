

"use client";

import React, { useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { es } from 'date-fns/locale';

interface Option {
    value: string;
    label: string;
}

interface FilterGroup {
    value: string; // e.g., 'status'
    label: string; // e.g., 'Estado'
    options: Option[];
}

interface TableToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range?: DateRange) => void;
  sortOption: string;
  onSortOptionChange: (value: string) => void;
  sortOptions: Option[];
  otherFilters?: Record<string, string | 'all'>;
  onFilterChange?: (filters: Record<string, string | 'all'>) => void;
  filterOptions?: FilterGroup[];
  searchPlaceholder?: string;
  paginationSummary?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchTerm,
  onSearchTermChange,
  dateRange,
  onDateRangeChange,
  sortOption,
  onSortOptionChange,
  sortOptions,
  otherFilters = {},
  onFilterChange,
  filterOptions = [],
  searchPlaceholder = 'Buscar...',
  paginationSummary,
  canGoPrevious,
  canGoNext,
  onPreviousPage,
  onNextPage,
}) => {
    
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);

    useEffect(() => {
        setTempDateRange(dateRange);
    }, [dateRange]);

    const handleApplyDateFilter = () => {
        if (onDateRangeChange) {
            onDateRangeChange(tempDateRange);
        }
        setIsCalendarOpen(false);
    };

    const handleCalendarSelect = (range?: DateRange) => {
        setTempDateRange(range);
    };

    const setPresetDateRange = (range: DateRange) => {
        if (onDateRangeChange) {
            onDateRangeChange(range);
            setTempDateRange(range);
        }
    };

    const setDateToToday = () => setPresetDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
    const setDateToYesterday = () => {
      const yesterday = subDays(new Date(), 1);
      setPresetDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
    };
    const setDateToThisWeek = () => setPresetDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
    const setDateToThisMonth = () => setPresetDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    
    const showPagination = paginationSummary && onPreviousPage && onNextPage;
    const showDatePicker = dateRange !== undefined && onDateRangeChange !== undefined;

    
  return (
    <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder={searchPlaceholder}
                    className="w-full rounded-lg bg-card pl-8"
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-start">
                {/* Sort Dropdown */}
                {sortOptions.length > 0 && (
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" className="flex-1 sm:flex-initial bg-card"><ListFilter className="mr-2 h-4 w-4" /><span>Ordenar</span></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={sortOption} onValueChange={onSortOptionChange}>
                          {sortOptions.map(opt => (<DropdownMenuRadioItem key={opt.value} value={opt.value}>{opt.label}</DropdownMenuRadioItem>))}
                      </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Filters Dropdown */}
                {filterOptions.length > 0 && onFilterChange && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" className="flex-1 sm:flex-initial bg-card"><Filter className="mr-2 h-4 w-4" /><span>Filtros</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {filterOptions.map((group, index) => (
                                <React.Fragment key={group.value}>
                                    {index > 0 && <DropdownMenuSeparator />}
                                    <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup value={otherFilters[group.value] || 'all'} onValueChange={(value) => onFilterChange({ ...otherFilters, [group.value]: value })}>
                                        {group.options.map(opt => (<DropdownMenuRadioItem key={opt.value} value={opt.value}>{opt.label}</DropdownMenuRadioItem>))}
                                    </DropdownMenuRadioGroup>
                                </React.Fragment>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* Date Picker */}
                {showDatePicker && (
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full sm:w-[280px] justify-start text-left font-normal flex-1 sm:flex-initial bg-card", !dateRange && "text-muted-foreground")}>
                            <CalendarDateIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (`${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}`) : format(dateRange.from, "LLL dd, y", { locale: es })) : (<span>Seleccione rango</span>)}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <div className="flex p-2">
                                <Button variant="ghost" size="sm" onClick={setDateToToday}>Hoy</Button>
                                <Button variant="ghost" size="sm" onClick={setDateToYesterday}>Ayer</Button>
                                <Button variant="ghost" size="sm" onClick={setDateToThisWeek}>Semana</Button>
                                <Button variant="ghost" size="sm" onClick={setDateToThisMonth}>Mes</Button>
                            </div>
                        <Calendar initialFocus mode="range" defaultMonth={tempDateRange?.from} selected={tempDateRange} onSelect={handleCalendarSelect} numberOfMonths={2} locale={es} showOutsideDays={false} />
                        <div className="p-2 border-t flex justify-end">
                            <Button size="sm" onClick={handleApplyDateFilter}>Aceptar</Button>
                        </div>
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        </div>

        {showPagination && (
             <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">{paginationSummary}</p>
                <div className="flex items-center space-x-2">
                    <Button size="sm" onClick={onPreviousPage} disabled={!canGoPrevious} variant="outline" className="bg-card">
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                    </Button>
                    <Button size="sm" onClick={onNextPage} disabled={!canGoNext} variant="outline" className="bg-card">
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )}
    </div>
  );
};

TableToolbar.displayName = 'TableToolbar';
