// src/hooks/useTableManager.ts
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
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

const getNestedValue = (obj: any, path: string) =>
  path.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), obj);

const getSortDate = (item: any, sortKey: string) => {
  if (item.status === 'Cancelado' && sortKey.includes('deliveryDateTime')) {
    return parseDate(item.cancellationTimestamp || item.deliveryDateTime);
  }
  return parseDate(getNestedValue(item, sortKey));
};

export function useTableManager<T extends Record<string, any>>({
  initialData,
  initialSortOption = 'date_desc',
  initialDateRange,
  searchKeys,
  dateFilterKey,
  itemsPerPage = 20,
}: UseTableManagerOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<string>(initialSortOption);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [otherFilters, setOtherFilters] = useState<Record<string, string | 'all'>>({});
  const [currentPage, setCurrentPage] = useState(1);

  // ⬇️ Solo inicializa 1 vez; evita re-setear en cada render por identidad nueva
  const didInitRange = useRef(false);
  useEffect(() => {
    if (!didInitRange.current && initialDateRange) {
      setDateRange(initialDateRange);
      didInitRange.current = true;
    }
  }, [initialDateRange]);

  const fullFilteredData = useMemo(() => {
    let data = [...initialData];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter(item =>
        searchKeys.some(key => {
          const val = getNestedValue(item, key as string);
          if (Array.isArray(val)) {
            return val.some(sub =>
              typeof sub === 'object' && sub !== null
                ? Object.values(sub).some(v => String(v ?? '').toLowerCase().includes(q))
                : String(sub ?? '').toLowerCase().includes(q)
            );
          }
          return String(val ?? '').toLowerCase().includes(q);
        })
      );
    }

    if (dateFilterKey && dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
      data = data.filter(item => {
        const raw = getNestedValue(item, dateFilterKey as string);
        if (!raw) return false;
        const d = parseDate(raw);
        return d && isValid(d) && isWithinInterval(d, { start: from, end: to });
      });
    }

    Object.entries(otherFilters).forEach(([key, value]) => {
      if (value !== 'all' && value !== undefined) {
        data = data.filter(item => {
          const raw = getNestedValue(item, key);
          if (Array.isArray(raw)) {
            return raw.some(subItem => subItem && subItem.method === value);
          }
          if (typeof raw === 'string') return raw.includes(value as string);
          return raw === value;
        });
      }
    });

    if (sortOption !== 'default_order') {
      data.sort((a, b) => {
        const [sortKey, dir] = sortOption.split('_');
        const isAsc = dir === 'asc';
        const isDateKey =
          sortKey.toLowerCase().includes('date') || sortKey.toLowerCase().includes('datetime');

        if (isDateKey) {
          const da = getSortDate(a, sortKey);
          const db = getSortDate(b, sortKey);
          if (!da || !isValid(da)) return 1;
          if (!db || !isValid(db)) return -1;
          return isAsc ? compareAsc(da, db) : compareDesc(da, db);
        }

        const va = getNestedValue(a, sortKey);
        const vb = getNestedValue(b, sortKey);

        if (typeof va === 'number' && typeof vb === 'number') return isAsc ? va - vb : vb - va;
        if (typeof va === 'string' && typeof vb === 'string')
          return isAsc
            ? va.localeCompare(vb, 'es', { sensitivity: 'base' })
            : vb.localeCompare(va, 'es', { sensitivity: 'base' });

        return 0;
      });
    }

    return data;
  }, [initialData, searchTerm, sortOption, dateRange, otherFilters, searchKeys, dateFilterKey]);

  // Reset de página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOption, dateRange?.from?.getTime(), dateRange?.to?.getTime(), JSON.stringify(otherFilters)]);

  const totalItems = fullFilteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return fullFilteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [fullFilteredData, currentPage, itemsPerPage]);

  const goToNextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage(p => Math.max(1, p - 1));

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
    paginationSummary: `Mostrando ${paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a ${Math.min(currentPage * itemsPerPage, totalItems)} de ${totalItems} resultados`,
  };
}