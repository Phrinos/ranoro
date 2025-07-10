
"use client";

import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { isWithinInterval, parseISO, isValid, startOfDay, endOfDay, compareAsc, compareDesc } from 'date-fns';
import { TableToolbar } from '@/components/shared/table-toolbar';

interface UseTableManagerOptions<T> {
  initialData: T[];
  initialSortOption?: string;
  searchKeys: (keyof T)[];
  dateFilterKey: keyof T;
}

export function useTableManager<T extends { [key: string]: any }>({
  initialData,
  initialSortOption = 'date_desc',
  searchKeys,
  dateFilterKey,
}: UseTableManagerOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<string>(initialSortOption);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [otherFilters, setOtherFilters] = useState<Record<string, string | 'all'>>({});

  const filteredData = useMemo(() => {
    let data = [...initialData];

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      data = data.filter(item => 
        searchKeys.some(key => 
          String(item[key]).toLowerCase().includes(lowercasedTerm)
        )
      );
    }

    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      data = data.filter(item => {
        const dateValue = item[dateFilterKey];
        if (!dateValue || typeof dateValue !== 'string') return false;
        const parsedDate = parseISO(dateValue);
        return isValid(parsedDate) && isWithinInterval(parsedDate, { start: from, end: to });
      });
    }

    Object.entries(otherFilters).forEach(([key, value]) => {
      if (value !== 'all') {
        data = data.filter(item => item[key] === value);
      }
    });
    
    // Generic sorter - can be expanded
    data.sort((a, b) => {
      switch (sortOption) {
        case 'date_asc':
          return compareAsc(parseISO(a[dateFilterKey]), parseISO(b[dateFilterKey]));
        case 'total_desc':
            return (b.totalAmount ?? b.totalCost ?? 0) - (a.totalAmount ?? a.totalCost ?? 0);
        case 'total_asc':
            return (a.totalAmount ?? a.totalCost ?? 0) - (b.totalAmount ?? b.totalCost ?? 0);
        case 'date_desc':
        default:
          return compareDesc(parseISO(a[dateFilterKey]), parseISO(b[dateFilterKey]));
      }
    });

    return data;
  }, [initialData, searchTerm, sortOption, dateRange, otherFilters, searchKeys, dateFilterKey]);

  return {
    filteredData,
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    dateRange,
    setDateRange,
    otherFilters,
    setOtherFilters,
    TableToolbarComponent: (props: any) => (
        <TableToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            sortOption={sortOption}
            onSortOptionChange={setSortOption}
            {...props}
        />
    )
  };
}
