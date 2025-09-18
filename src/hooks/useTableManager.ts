
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { isWithinInterval, isValid, startOfDay, endOfDay, compareAsc, compareDesc } from 'date-fns';
import { parseDate } from '@/lib/forms';

interface UseTableManagerOptions<T> {
  initialData: T[];
  initialSortOption?: string;
  initialDateRange?: DateRange;
  searchKeys: (keyof T | string)[];
  dateFilterKey: keyof T | string;
  itemsPerPage?: number;
}

const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const getSortDate = (item: any, sortKey: string) => {
    // For historical services, choose date based on status
    if (item.status === 'Cancelado' && sortKey.includes('deliveryDateTime')) {
        return parseDate(item.cancellationTimestamp || item.deliveryDateTime);
    }
    // Default case for all other items or statuses
    return parseDate(getNestedValue(item, sortKey));
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
  }, [initialDateRange]);

  const fullFilteredData = useMemo(() => {
    let data = [...initialData];

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      data = data.filter(item => 
        searchKeys.some(key => {
          const itemValue = getNestedValue(item, key as string);
          if (Array.isArray(itemValue)) {
             return itemValue.some(subItem => {
                if (typeof subItem === 'object' && subItem !== null) {
                    return Object.values(subItem).some(val => 
                        String(val ?? '').toLowerCase().includes(lowercasedTerm)
                    );
                }
                return String(subItem ?? '').toLowerCase().includes(lowercasedTerm);
            });
          }
          return String(itemValue ?? '').toLowerCase().includes(lowercasedTerm);
        })
      );
    }

    if (dateFilterKey && dateRange?.from) { 
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
      data = data.filter(item => {
        const dateValue = getNestedValue(item, dateFilterKey as string);
        if (!dateValue) return false;
        const parsedDate = parseDate(dateValue);
        return parsedDate && isValid(parsedDate) && isWithinInterval(parsedDate, { start: from, end: to });
      });
    }

    Object.entries(otherFilters).forEach(([key, value]) => {
      if (value !== 'all' && value !== undefined) {
        data = data.filter(item => {
            const itemValue = getNestedValue(item, key);
            if (Array.isArray(itemValue)) {
              return itemValue.some(subItem => subItem && subItem.method === value);
            }
            if (typeof itemValue === 'string') {
              return itemValue.includes(value as string);
            }
            return itemValue === value;
        });
      }
    });
    
    if (sortOption !== 'default_order') {
        data.sort((a, b) => {
            const [sortKey, sortDirection] = sortOption.split('_');
            const isAsc = sortDirection === 'asc';
            
            const isDateKey = sortKey.toLowerCase().includes('date') || sortKey.toLowerCase().includes('datetime');

            if (isDateKey) {
                const dateA = getSortDate(a, sortKey);
                const dateB = getSortDate(b, sortKey);

                if (!dateA || !isValid(dateA)) return 1;
                if (!dateB || !isValid(dateB)) return -1;
                return isAsc ? compareAsc(dateA, dateB) : compareDesc(dateA, dateB);
            }
            
            const valA = getNestedValue(a, sortKey);
            const valB = getNestedValue(b, sortKey);
            
            if (typeof valA === 'number' && typeof valB === 'number') {
                return isAsc ? valA - valB : valB - valA;
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                return isAsc
                ? valA.localeCompare(valB, 'es', { sensitivity: 'base' })
                : valB.localeCompare(valA, 'es', { sensitivity: 'base' });
            }
            
            return 0;
        });
    }
    
    return data;
  }, [initialData, searchTerm, sortOption, dateRange, otherFilters, searchKeys, dateFilterKey]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOption, dateRange, otherFilters]);
  
  const totalItems = fullFilteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return fullFilteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [fullFilteredData, currentPage, itemsPerPage]);

  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));

  return {
    searchTerm,
    onSearchTermChange: setSearchTerm,
    sortOption,
    onSortOptionChange: setSortOption,
    dateRange,
    onDateRangeChange: setDateRange,
    otherFilters,
    setOtherFilters,
    paginatedData,
    filteredData: paginatedData,
    fullFilteredData,
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
