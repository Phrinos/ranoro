
"use client";
import React, { useState, useMemo } from 'react';
import type { Vehicle } from '@/types';
import { useTableManager } from '@/hooks/useTableManager';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableToolbar } from '@/components/shared/table-toolbar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, PlusCircle, ArrowUpDown } from 'lucide-react';
import { VehicleDialog } from './vehicle-dialog';
import type { VehicleFormValues } from './vehicle-form';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface VehiclesTableProps {
  vehicles: Vehicle[];
  onSave: (data: VehicleFormValues, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const sortOptions = [
  { value: 'make_asc', label: 'Marca (A-Z)' },
  { value: 'make_desc', label: 'Marca (Z-A)' },
  { value: 'model_asc', label: 'Modelo (A-Z)' },
  { value: 'model_desc', label: 'Modelo (Z-A)' },
  { value: 'year_desc', label: 'Año (Más Reciente)' },
  { value: 'year_asc', label: 'Año (Más Antiguo)' },
  { value: 'licensePlate_asc', label: 'Placa (A-Z)' },
  { value: 'licensePlate_desc', label: 'Placa (Z-A)' },
  { value: 'ownerName_asc', label: 'Propietario (A-Z)' },
  { value: 'ownerName_desc', label: 'Propietario (Z-A)' },
  { value: 'lastServiceDate_desc', label: 'Último Servicio (Más Reciente)' },
  { value: 'lastServiceDate_asc', label: 'Último Servicio (Más Antiguo)' },
];

export function VehiclesTable({ vehicles, onSave, onDelete }: VehiclesTableProps) {
  const router = useRouter();
  const { paginatedData, ...tableManager } = useTableManager<Vehicle>({
    initialData: vehicles,
    searchKeys: ["make", "model", "year", "licensePlate", "ownerName"],
    initialSortOption: 'lastServiceDate_desc',
    itemsPerPage: 10,
    dateFilterKey: 'lastServiceDate',
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

  const SortableHeader = ({ sortKey, label, className }: { sortKey: keyof Vehicle, label: string, className?: string }) => {
    const isSorted = tableManager.sortOption.startsWith(sortKey);
    const direction = tableManager.sortOption.endsWith('_asc') ? 'asc' : 'desc';

    const handleSort = () => {
      const newDirection = isSorted && direction === 'asc' ? 'desc' : 'asc';
      tableManager.onSortOptionChange(`${sortKey}_${newDirection}`);
    };

    return (
      <TableHead className={cn("text-white font-bold cursor-pointer hover:bg-gray-700", className)} onClick={handleSort}>
        <div className="flex items-center">
            {label}
            <ArrowUpDown className={`ml-2 h-4 w-4 ${isSorted ? 'text-white' : 'text-gray-400'}`} />
        </div>
      </TableHead>
    );
  };

  return (
    <div className="space-y-4">
      <TableToolbar
        searchTerm={tableManager.searchTerm}
        onSearchTermChange={tableManager.onSearchTermChange}
        searchPlaceholder="Buscar por placa, marca, modelo..."
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
            <TableRow>
              <SortableHeader sortKey="make" label="Marca" className="hidden sm:table-cell" />
              <SortableHeader sortKey="model" label="Modelo" />
              <SortableHeader sortKey="year" label="Año" />
              <SortableHeader sortKey="licensePlate" label="Placa" />
              <SortableHeader sortKey="ownerName" label="Propietario" className="hidden sm:table-cell" />
              <SortableHeader sortKey="lastServiceDate" label="Último Servicio" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? paginatedData.map((vehicle) => {
              const lastServiceDate = vehicle.lastServiceDate ? parseDate(vehicle.lastServiceDate) : null;
              return (
                <TableRow key={vehicle.id} onClick={() => router.push(`/vehiculos/${vehicle.id}`)} className="cursor-pointer">
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
              )
            }) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">No se encontraron vehículos.</TableCell>
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
