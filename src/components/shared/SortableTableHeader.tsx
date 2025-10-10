// src/components/shared/SortableTableHeader.tsx
"use client";

import React from "react";
import { TableHead } from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const direction = isSorted
    ? currentSort.endsWith("_asc")
      ? "asc"
      : "desc"
    : null;

  const ariaSort: "ascending" | "descending" | "none" =
    !isSorted ? "none" : direction === "asc" ? "ascending" : "descending";

  return (
    <TableHead aria-sort={ariaSort} className={cn("p-0 select-none", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Ordenar por ${label}`}
        className={cn(
          "group relative w-full h-12 px-4 inline-flex items-center gap-2",
          "bg-transparent text-inherit outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
          // Subrayado suave SOLO del texto de este header
          "hover:[&_span.header-text]:underline hover:[&_span.header-text]:underline-offset-4"
        )}
        data-sorted={isSorted ? "true" : "false"}
      >
        <span
          className={cn(
            "header-text truncate transition-colors",
            textClassName,
            // Color base tenue + más intenso en hover o cuando está ordenado
            "text-white/90 group-hover:text-white group-data-[sorted=true]:text-white"
          )}
        >
          {label}
        </span>

        <ArrowUpDown
          aria-hidden
          className={cn(
            "h-4 w-4 transition-all",
            "opacity-0 group-hover:opacity-100",
            "text-white/80 group-hover:text-white group-data-[sorted=true]:text-white",
            isSorted && "opacity-100",
            direction === "asc" && "rotate-180"
          )}
        />

        {/* Línea inferior sutil SOLO en este header (hover o sorted) */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-3 right-3 bottom-1 h-0.5 rounded",
            "bg-white/70",
            "opacity-0 group-hover:opacity-60",
            isSorted && "opacity-100"
          )}
        />
      </button>
    </TableHead>
  );
};
