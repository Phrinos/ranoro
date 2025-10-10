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
      className={cn(
        // Importante: sin decoraciones/underline del th
        "p-0 select-none align-middle",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        // Solo esta celda cambia de fondo; sin subrayado
        className={cn(
          "w-full h-12 px-4 inline-flex items-center gap-2 rounded-[3px]",
          "bg-transparent text-inherit outline-none",
          "no-underline [text-decoration:none]",
          // hover/focus solo en el botón (no toda la fila)
          "hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary/40",
          // cuando está ordenado, la dejamos con un leve realce
          isSorted && "bg-white/10"
        )}
        aria-label={`Ordenar por ${label}`}
        aria-pressed={isSorted ? "true" : "false"}
      >
        <span
          className={cn(
            "truncate no-underline [text-decoration:none]",
            textClassName
          )}
        >
          {label}
        </span>
        <ArrowUpDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 opacity-70 transition-transform",
            isSorted && "opacity-100",
            direction === "asc" && "rotate-180"
          )}
        />
      </button>
    </TableHead>
  );
};
