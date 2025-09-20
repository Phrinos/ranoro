// src/components/shared/SortableTableHeader.tsx
"use client";

import React from 'react';
import { TableHead } from "@/components/ui/table";
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableTableHeaderProps {
  sortKey: string;
  label: string;
  onSort: (key: string) => void;
  currentSort: string;
  className?: string;
  textClassName?: string;
}

export const SortableTableHeader: React.FC<SortableTableHeaderProps> = ({
  sortKey,
  label,
  onSort,
  currentSort,
  className,
  textClassName,
}) => {
  const isSorted = currentSort?.startsWith(sortKey);
  const direction = isSorted ? (currentSort.endsWith('_asc') ? 'asc' : 'desc') : null;

  return (
    <TableHead
      className={cn("cursor-pointer group", className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-2 transition-transform duration-200 ease-in-out group-hover:scale-105">
        <span className={cn("text-white/80 group-hover:text-white", textClassName)}>{label}</span>
        <ArrowUpDown 
          className={cn(
            "h-4 w-4 transition-all",
            isSorted ? 'opacity-100 text-white' : 'opacity-50 text-white/80 group-hover:opacity-100',
            direction === 'asc' ? 'transform rotate-180' : ''
          )} 
        />
      </div>
    </TableHead>
  );
};
