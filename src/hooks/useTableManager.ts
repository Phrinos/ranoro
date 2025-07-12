
"use client";

import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { isWithinInterval, parseISO, isValid, startOfDay, endOfDay, compareAsc, compareDesc } from 'date-fns';

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

    if (dateRange && dateRange.from) { 
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
    
    // Generic sorter
    data.sort((a, b) => {
      const [sortKey, sortDirection] = sortOption.split('_');
      const isAsc = sortDirection === 'asc';

      const valA = a[sortKey];
      const valB = b[sortKey];

      // Date sorting
      if (sortKey.toLowerCase().includes('date')) {
        const dateA = valA ? parseISO(valA) : new Date(0);
        const dateB = valB ? parseISO(valB) : new Date(0);
        if (!isValid(dateA)) return 1;
        if (!isValid(dateB)) return -1;
        return isAsc ? compareAsc(dateA, dateB) : compareDesc(dateA, dateB);
      }
      
      // Numeric sorting
      if (typeof valA === 'number' && typeof valB === 'number') {
        return isAsc ? valA - valB : valB - valA;
      }

      // String sorting (case-insensitive)
      if (typeof valA === 'string' && typeof valB === 'string') {
        return isAsc
          ? valA.localeCompare(valB, undefined, { sensitivity: 'base' })
          : valB.localeCompare(valA, undefined, { sensitivity: 'base' });
      }

      // Fallback for mixed or null/undefined types
      if (valA == null) return 1;
      if (valB == null) return -1;
      
      return 0; // No change if types are weird
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
  };
}
