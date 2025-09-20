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
  const direction = isSorted ? (currentSort.endsWith("_asc") ? "asc" : "desc") : null;

  const ariaSort: "ascending" | "descending" | "none" =
    !isSorted ? "none" : direction === "asc" ? "ascending" : "descending";

  return (
    <TableHead
      aria-sort={ariaSort}
      className={cn(
        // nada de cambios de fondo en hover
        "group select-none cursor-pointer p-0", 
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      {/* Botón interno para foco/teclado, pero visualmente transparente */}
      <button
        type="button"
        className={cn(
          "w-full h-12 px-4 inline-flex items-center gap-2",
          "bg-transparent text-inherit outline-none",
          // solo zoom sutil
          "transition-transform duration-200 ease-out group-hover:scale-[1.04]",
          // foco visible sin cambiar fondo
          "focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
        )}
      >
        <span className={cn("truncate", textClassName)}>{label}</span>
        <ArrowUpDown
          aria-hidden
          className={cn(
            "h-4 w-4 transition-transform opacity-75",
            isSorted && "opacity-100",
            direction === "asc" && "rotate-180"
          )}
        />
      </button>
    </TableHead>
  );
};
