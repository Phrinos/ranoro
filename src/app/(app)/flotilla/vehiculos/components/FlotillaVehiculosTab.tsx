// src/app/(app)/flotilla/vehiculos/components/FlotillaVehiculosTab.tsx
"use client";

import React, { useMemo } from 'react';
import { useTableManager } from '@/hooks/useTableManager';
import type { Vehicle } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';

interface FlotillaVehiculosTabProps {
  vehicles: Vehicle[];
  onAddVehicle: () => void;
}

export function FlotillaVehiculosTab({ vehicles, onAddVehicle }: FlotillaVehiculosTabProps) {
  const router = useRouter();
  const permissions = usePermissions();
  const canManageFleetVehicles = permissions.has('fleet:manage_vehicles') || permissions.has('fleet:manage');
  
  const fleetVehicles = useMemo(() => vehicles.filter(v => v.isFleetVehicle), [vehicles]);

  const {
    paginatedData: paginatedVehicles,
    ...tableManager
  } = useTableManager<Vehicle>({
    initialData: fleetVehicles,
    searchKeys: ['licensePlate', 'make', 'model', 'year', 'assignedDriverName'],
    initialSortOption: 'licensePlate_asc',
    itemsPerPage: 15,
    dateFilterKey: 'lastServiceDate',
  });

  const handleSort = (key: string) => {
    const isAsc = tableManager.sortOption === `${key}_asc`;
    tableManager.onSortOptionChange(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  return (
    <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-end gap-2">
            {canManageFleetVehicles && (
              <Button onClick={onAddVehicle} className="w-full sm:w-auto font-bold">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Vehículo a Flotilla
              </Button>
            )}
        </div>
      <Card>
        <CardHeader>
             <CardTitle>Vehículos de la Flotilla</CardTitle>
             <CardDescription>Lista de todos los vehículos registrados como parte de la flotilla.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por placa, marca, modelo, conductor..."
                    value={tableManager.searchTerm}
                    onChange={(e) => tableManager.onSearchTermChange(e.target.value)}
                    className="w-full rounded-lg bg-card pl-8"
                />
            </div>
            <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-black text-white">
                <TableRow className="hover:bg-transparent">
                    <SortableTableHeader sortKey="licensePlate" label="Placa" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                    <SortableTableHeader sortKey="make" label="Marca" onSort={handleSort} currentSort={tableManager.sortOption} className="hidden md:table-cell" textClassName="text-white" />
                    <SortableTableHeader sortKey="model" label="Modelo" onSort={handleSort} currentSort={tableManager.sortOption} className="hidden md:table-cell" textClassName="text-white" />
                    <SortableTableHeader sortKey="year" label="Año" onSort={handleSort} currentSort={tableManager.sortOption} className="hidden lg:table-cell" textClassName="text-white" />
                    <SortableTableHeader sortKey="assignedDriverName" label="Conductor Asignado" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                </TableRow>
                </TableHeader>
                <TableBody>
                {paginatedVehicles.length > 0 ? (
                    paginatedVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id} onClick={() => router.push(`/flotilla/vehiculos/${vehicle.id}`)} className="cursor-pointer">
                        <TableCell className="font-semibold">{vehicle.licensePlate}</TableCell>
                        <TableCell className="hidden md:table-cell">{vehicle.make}</TableCell>
                        <TableCell className="hidden md:table-cell">{vehicle.model}</TableCell>
                        <TableCell className="hidden lg:table-cell">{vehicle.year}</TableCell>
                        <TableCell>
                            {vehicle.assignedDriverName ? vehicle.assignedDriverName : <Badge variant="secondary">Disponible</Badge>}
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        No se encontraron vehículos en la flotilla.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
