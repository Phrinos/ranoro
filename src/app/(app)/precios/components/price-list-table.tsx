// src/app/(app)/precios/components/price-list-table.tsx
"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Tags } from "lucide-react";
import type { VehiclePriceList } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";


interface PriceListTableProps {
  records: VehiclePriceList[];
  onEdit: (record: VehiclePriceList) => void;
  onDelete: (recordId: string) => void;
  sortOption: string;
  onSortOptionChange: (value: string) => void;
}

const formatYears = (years: number[]): string => {
  if (!years || years.length === 0) return 'N/A';
  
  const sortedYears = [...years].sort((a, b) => a - b);
  if (sortedYears.length === 1) return String(sortedYears[0]);
  
  const ranges = sortedYears.reduce((acc, year) => {
    if (acc.length === 0 || year !== acc[acc.length - 1].end + 1) {
      acc.push({ start: year, end: year });
    } else {
      acc[acc.length - 1].end = year;
    }
    return acc;
  }, [] as { start: number; end: number }[]);

  return ranges.map(range => 
    range.start === range.end ? String(range.start) : `${range.start} - ${range.end}`
  ).join(', ');
};

export const PriceListTable = React.memo(({ records, onEdit, onDelete, sortOption, onSortOptionChange }: PriceListTableProps) => {

  const handleSort = (key: 'make' | 'model') => {
    if (!onSortOptionChange) return;
    const isAsc = sortOption === `${key}_asc`;
    onSortOptionChange(isAsc ? `${key}_desc` : `${key}_asc`);
  };

  if (!records.length) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <Tags className="h-12 w-12 mb-2" />
            <h3 className="text-lg font-semibold text-foreground">No hay listas de precios</h3>
            <p className="text-sm">Cuando se agregue una nueva lista de precios, aparecerá aquí.</p>
        </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-x-auto">
      <Table>
        <TableHeader className="bg-black">
          <TableRow className="hover:bg-transparent">
            <SortableTableHeader sortKey="make" label="Marca" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
            <SortableTableHeader sortKey="model" label="Modelo" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
            <TableHead className="text-white font-bold">Años</TableHead>
            <TableHead className="text-right text-white font-bold hidden sm:table-cell"># Servicios</TableHead>
            <TableHead className="text-right text-white font-bold">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-semibold">{record.make}</TableCell>
              <TableCell>{record.model}</TableCell>
              <TableCell>{formatYears(record.years)}</TableCell>
              <TableCell className="text-right hidden sm:table-cell">{record.services.length}</TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(record)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar esta lista de precios?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. ¿Seguro que quieres eliminar la lista para {record.make} {record.model}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(record.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Sí, Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

PriceListTable.displayName = 'PriceListTable';
