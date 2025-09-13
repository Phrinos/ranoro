// src/app/(app)/flotilla/vehiculos/components/FlotillaVehiculosTab.tsx
"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronRight } from 'lucide-react';
import type { Vehicle } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface FlotillaVehiculosTabProps {
  vehicles: Vehicle[];
}

export function FlotillaVehiculosTab({ vehicles }: FlotillaVehiculosTabProps) {
  const { toast } = useToast();
  const router = useRouter();

  const sortedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      const plateComparison = a.licensePlate.localeCompare(b.licensePlate);
      if (plateComparison !== 0) return plateComparison;
      return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
    });
  }, [vehicles]);

  const handleAddVehicle = () => {
    toast({ title: "Función en desarrollo", description: "Pronto podrás añadir vehículos a tu flotilla desde aquí." });
  };

  const handleRowClick = (vehicleId: string) => {
    router.push(`/flotilla/vehiculos/${vehicleId}`);
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
                    <TableHead className="text-white font-bold">Placa</TableHead>
                    <TableHead className="text-white font-bold hidden sm:table-cell">Marca y Modelo</TableHead>
                    <TableHead className="text-white font-bold hidden lg:table-cell">Año</TableHead>
                    <TableHead className="text-white font-bold">Estado</TableHead>
                    <TableHead className="text-white font-bold">Conductor Asignado</TableHead>
                    <TableHead className="w-10 text-white font-bold"></TableHead>
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
                        <TableCell>{vehicle.assignedDriverName || 'N/A'}</TableCell>
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
