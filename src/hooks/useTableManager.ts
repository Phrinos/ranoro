

"use client";

import { useState, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { isWithinInterval, isValid, startOfDay, endOfDay, compareAsc, compareDesc } from 'date-fns';
import { parseDate } from '@/lib/forms'; // Import the robust date parser

interface UseTableManagerOptions<T> {
  initialData: T[];
  initialSortOption?: string;
  initialDateRange?: DateRange;
  searchKeys: (keyof T | string)[]; // Allow string for nested keys
  dateFilterKey: keyof T | string; // Allow string for nested keys
  itemsPerPage?: number;
}

// Helper to get nested property value
const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export function useTableManager<T extends { [key: string]: any }>({
  initialData,
  initialSortOption = 'date_desc',
  initialDateRange,
  searchKeys,
  dateFilterKey,
  itemsPerPage = 20,
}: UseTableManagerOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<string>(initialSortOption);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const [otherFilters, setOtherFilters] = useState<Record<string, string | 'all'>>({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (initialDateRange) {
        setDateRange(initialDateRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  const processedAndSortedData = useMemo(() => {
    let data = [...initialData];

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      data = data.filter(item => 
        searchKeys.some(key => 
          String(getNestedValue(item, key as string) ?? '').toLowerCase().includes(lowercasedTerm)
        )
      );
    }

    if (dateRange?.from) { 
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
      data = data.filter(item => {
        const dateValue = getNestedValue(item, dateFilterKey as string);
        if (!dateValue) return false;
        const parsedDate = parseDate(dateValue); // Use robust parser
        return parsedDate && isValid(parsedDate) && isWithinInterval(parsedDate, { start: from, end: to });
      });
    }

    Object.entries(otherFilters).forEach(([key, value]) => {
      if (value !== 'all' && value !== undefined) {
        data = data.filter(item => getNestedValue(item, key) === value);
      }
    });
    
    // Generic sorter
    data.sort((a, b) => {
      const [sortKey, sortDirection] = sortOption.split('_');
      const isAsc = sortDirection === 'asc';

      const valA = getNestedValue(a, sortKey);
      const valB = getNestedValue(b, sortKey);

      // Date sorting
      if (sortKey.toLowerCase().includes('date')) {
        const dateA = parseDate(valA); // Use robust parser
        const dateB = parseDate(valB); // Use robust parser
        if (!dateA || !isValid(dateA)) return 1;
        if (!dateB || !isValid(dateB)) return -1;
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
  
  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOption, dateRange, otherFilters]);
  
  const totalItems = processedAndSortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [processedAndSortedData, currentPage, itemsPerPage]);

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };
  
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  return {
    // Original state and setters
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    dateRange,
    setDateRange,
    otherFilters,
    setOtherFilters,
    // Derived/Paginated data
    filteredData: paginatedData,
    // Pagination state and handlers
    currentPage,
    totalPages,
    totalItems,
    goToNextPage,
    goToPreviousPage,
    canGoNext: currentPage < totalPages,
    canGoPrevious: currentPage > 1,
    paginationSummary: `Mostrando ${paginatedData.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} a ${Math.min(currentPage * itemsPerPage, totalItems)} de ${totalItems} resultados`,
  };
}
