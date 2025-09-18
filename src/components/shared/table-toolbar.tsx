
"use client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReactNode } from "react";

interface TableToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  sortOption?: string;
  onSortOptionChange?: (value: string) => void;
  searchPlaceholder?: string;
  sortOptions?: { value: string; label: string }[];
  actions?: ReactNode;
}

export function TableToolbar({
  searchTerm,
  onSearchTermChange,
  sortOption,
  onSortOptionChange,
  searchPlaceholder = "Buscar...",
  sortOptions,
  actions,
}: TableToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
      <Input
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        className="h-10 w-full sm:w-[150px] lg:w-[250px]"
      />
      <div className="flex w-full sm:w-auto items-center gap-2">
        {sortOptions && onSortOptionChange && sortOption && (
          <Select value={sortOption} onValueChange={onSortOptionChange}>
            <SelectTrigger className="h-10 w-full sm:w-auto">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {actions}
      </div>
    </div>
  );
}
