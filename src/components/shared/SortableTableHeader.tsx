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
      className={cn("cursor-pointer", className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        <span className={cn(textClassName)}>{label}</span>
        <ArrowUpDown 
          className={cn(
            "h-4 w-4 transition-transform",
            isSorted ? 'opacity-100' : 'opacity-30 group-hover:opacity-70',
            direction === 'asc' ? 'transform rotate-180' : ''
          )} 
        />
      </div>
    </TableHead>
  );
};
