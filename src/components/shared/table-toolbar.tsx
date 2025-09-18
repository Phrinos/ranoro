
"use client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TableToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  sortOption: string;
  onSortOptionChange: (value: string) => void;
  searchPlaceholder?: string;
  sortOptions: { value: string; label: string }[];
}

export function TableToolbar({
  searchTerm,
  onSearchTermChange,
  sortOption,
  onSortOptionChange,
  searchPlaceholder = "Buscar...",
  sortOptions,
}: TableToolbarProps) {
  return (
    <div className="flex items-center space-x-2">
      <Input
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        className="h-10 w-[150px] lg:w-[250px]"
      />
      <Select value={sortOption} onValueChange={onSortOptionChange}>
        <SelectTrigger className="h-10 w-auto">
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
    </div>
  );
}
