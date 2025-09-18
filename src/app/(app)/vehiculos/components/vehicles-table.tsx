
"use client";
import React, { useState } from 'react';
import type { Vehicle } from '@/types';
import { useTableManager } from '@/hooks/useTableManager';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableToolbar } from '@/components/shared/table-toolbar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { VehicleDialog } from './vehicle-dialog';
import { VehicleFormValues } from './vehicle-form';

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
];

export function VehiclesTable({ vehicles, onSave, onDelete }: VehiclesTableProps) {
  const { paginatedData, ...tableManager } = useTableManager<Vehicle>({
    initialData: vehicles,
    searchKeys: ["make", "model", "year", "licensePlate", "ownerName"],
    initialSortOption: "make_asc",
    itemsPerPage: 10,
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

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marca</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Año</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Propietario</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((vehicle) => (
              <TableRow key={vehicle.id} onClick={() => handleOpenDialog(vehicle)} className="cursor-pointer">
                <TableCell>{vehicle.make}</TableCell>
                <TableCell>{vehicle.model}</TableCell>
                <TableCell>{vehicle.year}</TableCell>
                <TableCell>{vehicle.licensePlate}</TableCell>
                <TableCell>{vehicle.ownerName}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenDialog(vehicle); }}>
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
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
