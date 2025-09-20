
// src/app/(app)/flotilla/vehiculos/components/FlotillaVehiculosTab.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronRight } from 'lucide-react';
import type { Vehicle } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';

interface FlotillaVehiculosTabProps {
  vehicles: Vehicle[];
}

export function FlotillaVehiculosTab({ vehicles }: FlotillaVehiculosTabProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [sortOption, setSortOption] = useState('licensePlate_asc');

  const sortedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      const [key, direction] = sortOption.split('_');
      
      if (key === 'make') {
          const valA = `${a.make} ${a.model}`;
          const valB = `${b.make} ${b.model}`;
          const comparison = valA.localeCompare(valB, 'es', { numeric: true });
          return direction === 'asc' ? comparison : -comparison;
      }

      const valA = a[key as keyof Vehicle] || '';
      const valB = b[key as keyof Vehicle] || '';

      const comparison = String(valA).localeCompare(String(valB), 'es', { numeric: true });
      return direction === 'asc' ? comparison : -comparison;
    });
  }, [vehicles, sortOption]);

  const handleAddVehicle = () => {
    toast({ title: "Función en desarrollo", description: "Pronto podrás añadir vehículos a tu flotilla desde aquí." });
  };

  const handleRowClick = (vehicleId: string) => {
    router.push(`/flotilla/vehiculos/${vehicleId}`);
  };

  const handleSort = (key: string) => {
    const isAsc = sortOption === `${key}_asc`;
    setSortOption(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  return (
    <div className="space-y-4">
       <div className="flex justify-end">
          <Button onClick={handleAddVehicle} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Vehículo
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-black">
                  <TableRow>
                    <SortableTableHeader sortKey="licensePlate" label="Placa" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                    <SortableTableHeader sortKey="make" label="Marca y Modelo" onSort={handleSort} currentSort={sortOption} className="hidden sm:table-cell" textClassName="text-white" />
                    <SortableTableHeader sortKey="year" label="Año" onSort={handleSort} currentSort={sortOption} className="hidden lg:table-cell" textClassName="text-white" />
                    <SortableTableHeader sortKey="assignedDriverId" label="Estado" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                    <SortableTableHeader sortKey="assignedDriverName" label="Conductor" onSort={handleSort} currentSort={sortOption} className="hidden md:table-cell" textClassName="text-white" />
                    <div className="w-10"></div>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedVehicles.length > 0 ? (
                    sortedVehicles.map(vehicle => (
                      <TableRow 
                        key={vehicle.id} 
                        onClick={() => handleRowClick(vehicle.id)}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">{vehicle.licensePlate}</TableCell>
                        <TableCell className="hidden sm:table-cell">{vehicle.make} {vehicle.model}</TableCell>
                        <TableCell className="hidden lg:table-cell">{vehicle.year}</TableCell>
                        <TableCell>
                          <Badge variant={vehicle.assignedDriverId ? 'success' : 'outline'}>
                            {vehicle.assignedDriverId ? 'Asignado' : 'Disponible'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{vehicle.assignedDriverName || 'N/A'}</TableCell>
                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No hay vehículos en la flotilla.
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
