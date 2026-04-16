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
    <TableHead
      aria-sort={ariaSort}
      className={cn("select-none whitespace-nowrap", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 outline-none",
          "no-underline [text-decoration:none]",
          "rounded hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary/40",
          "transition-opacity"
        )}
        aria-label={`Ordenar por ${label}`}
        aria-pressed={isSorted ? "true" : "false"}
      >
        <span className={cn("no-underline [text-decoration:none]", textClassName)}>
          {label}
        </span>
        <ArrowUpDown
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 shrink-0 opacity-50 transition-transform",
            isSorted && "opacity-100",
            direction === "asc" && "rotate-180"
          )}
        />
      </button>
    </TableHead>
  );
};
