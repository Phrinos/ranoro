// src/app/(app)/vehiculos/components/vehicles-table.tsx
"use client";

import React, { useState } from 'react';
import type { Vehicle } from '@/types';
import { useTableManager } from '@/hooks/useTableManager';
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { TableToolbar } from '@/components/shared/table-toolbar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { VehicleDialog } from './vehicle-dialog';
import type { VehicleFormValues } from './vehicle-form';
import { format, isValid, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { useRouter } from 'next/navigation';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';

interface VehiclesTableProps {
  vehicles: Vehicle[];
  onSave: (data: VehicleFormValues, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function VehiclesTable({ vehicles, onSave }: VehiclesTableProps) {
  const router = useRouter();

  const { paginatedData, ...tableManager } = useTableManager<Vehicle>({
    initialData: vehicles,
    searchKeys: ["make", "model", "year", "licensePlate", "ownerName"],
    initialSortOption: 'lastServiceDate_desc',
    itemsPerPage: 10,
    dateFilterKey: 'lastServiceDate',
    initialDateRange: {
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    },
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const handleOpenDialog = (vehicle: Vehicle | null = null) => {
    setEditingVehicle(vehicle);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: VehicleFormValues) => {
    await onSave(data, editingVehicle?.id);
    setIsDialogOpen(false);
  };

  const handleSort = (key: string) => {
    const isAsc = tableManager.sortOption.startsWith(key) && tableManager.sortOption.endsWith('_asc');
    tableManager.onSortOptionChange(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  return (
    <div className="space-y-4">
      <TableToolbar
        searchTerm={tableManager.searchTerm}
        onSearchTermChange={tableManager.onSearchTermChange}
        searchPlaceholder="Buscar por placa, marca, modelo..."
        dateRange={tableManager.dateRange}
        onDateRangeChange={tableManager.onDateRangeChange}
        actions={
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Agregar Vehículo
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-black">
            <TableRow className="hover:bg-transparent">
              <SortableTableHeader sortKey="make" label="Marca" onSort={handleSort} currentSort={tableManager.sortOption} className="hidden sm:table-cell text-white" />
              <SortableTableHeader sortKey="model" label="Modelo" onSort={handleSort} currentSort={tableManager.sortOption} className="text-white" />
              <SortableTableHeader sortKey="year" label="Año" onSort={handleSort} currentSort={tableManager.sortOption} className="text-white" />
              <SortableTableHeader sortKey="licensePlate" label="Placa" onSort={handleSort} currentSort={tableManager.sortOption} className="text-white" />
              <SortableTableHeader sortKey="ownerName" label="Propietario" onSort={handleSort} currentSort={tableManager.sortOption} className="hidden sm:table-cell text-white" />
              <SortableTableHeader sortKey="lastServiceDate" label="Último Servicio" onSort={handleSort} currentSort={tableManager.sortOption} className="text-white" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((vehicle) => {
                const lastServiceDate = vehicle.lastServiceDate ? parseDate(vehicle.lastServiceDate) : null;
                return (
                  <TableRow
                    key={vehicle.id}
                    onClick={() => router.push(`/vehiculos/${vehicle.id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="hidden sm:table-cell">{vehicle.make}</TableCell>
                    <TableCell>{vehicle.model}</TableCell>
                    <TableCell>{vehicle.year}</TableCell>
                    <TableCell>{vehicle.licensePlate}</TableCell>
                    <TableCell className="hidden sm:table-cell">{vehicle.ownerName}</TableCell>
                    <TableCell>
                      {lastServiceDate && isValid(lastServiceDate)
                        ? format(lastServiceDate, "dd MMM, yyyy", { locale: es })
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No se encontraron vehículos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{tableManager.paginationSummary}</p>
        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={tableManager.goToPreviousPage} disabled={!tableManager.canGoPrevious} variant="outline">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button size="sm" onClick={tableManager.goToNextPage} disabled={!tableManager.canGoNext} variant="outline">
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <VehicleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
        vehicle={editingVehicle}
      />
    </div>
  );
}
