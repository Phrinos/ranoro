// src/app/(app)/flotilla/vehiculos/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronRight } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import type { Vehicle } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function FlotillaVehiculosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = inventoryService.onVehiclesUpdate((allVehicles) => {
      setVehicles(allVehicles.filter(v => v.isFleetVehicle === true));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
    <>
      <PageHeader
        title="Vehículos de Flotilla"
        description="Administra los vehículos que forman parte de tu flotilla de renta."
        actions={
          <Button onClick={handleAddVehicle}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Vehículo
          </Button>
        }
      />
      <div className="p-1">
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Marca y Modelo</TableHead>
                    <TableHead>Año</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Conductor Asignado</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : sortedVehicles.length > 0 ? (
                    sortedVehicles.map(vehicle => (
                      <TableRow 
                        key={vehicle.id} 
                        onClick={() => handleRowClick(vehicle.id)}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">{vehicle.licensePlate}</TableCell>
                        <TableCell>{vehicle.make} {vehicle.model}</TableCell>
                        <TableCell>{vehicle.year}</TableCell>
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
    </>
  );
}
