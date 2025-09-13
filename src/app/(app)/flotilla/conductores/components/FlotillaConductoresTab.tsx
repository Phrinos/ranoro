// src/app/(app)/flotilla/conductores/components/FlotillaConductoresTab.tsx
"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronRight, Wrench } from 'lucide-react';
import type { Driver } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { rentalService } from '@/lib/services';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface FlotillaConductoresTabProps {
  drivers: Driver[];
}

export function FlotillaConductoresTab({ drivers }: FlotillaConductoresTabProps) {
  const { toast } = useToast();
  const router = useRouter();

  const sortedDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => {
      if (a.isArchived && !b.isArchived) return 1;
      if (!a.isArchived && b.isArchived) return -1;
      return a.name.localeCompare(b.name);
    });
  }, [drivers]);

  const handleAddDriver = () => {
    toast({ title: "Función en desarrollo", description: "Pronto podrás añadir nuevos conductores desde aquí." });
  };

  const handleRowClick = (driverId: string) => {
    router.push(`/flotilla/conductores/${driverId}`);
  };

  const handleRegenerate = async () => {
    try {
      const count = await rentalService.regenerateAllChargesForAllDrivers();
      toast({ title: "Proceso Completado", description: `Se han generado ${count} cargos de renta diaria.` });
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron regenerar los cargos.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-end gap-2">
        <Button onClick={handleAddDriver} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Conductor
        </Button>
        <ConfirmDialog
          triggerButton={
            <Button variant="outline" className="w-full sm:w-auto">
              <Wrench className="mr-2 h-4 w-4" />
              Regenerar Cargos
            </Button>
          }
          title="¿Regenerar todos los cargos de renta?"
          description="Esta acción es irreversible y generará todos los cargos de renta diarios para todos los conductores activos desde su fecha de contrato hasta hoy. Úsalo solo si has borrado los datos."
          onConfirm={handleRegenerate}
        />
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white font-bold">Estado</TableHead>
                  <TableHead className="text-white font-bold">Nombre</TableHead>
                  <TableHead className="text-white font-bold hidden sm:table-cell">Teléfono</TableHead>
                  <TableHead className="text-white font-bold">Vehículo Asignado</TableHead>
                  <TableHead className="w-10 text-white font-bold"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDrivers.length > 0 ? (
                  sortedDrivers.map(driver => (
                    <TableRow 
                      key={driver.id} 
                      onClick={() => handleRowClick(driver.id)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <Badge variant={driver.isArchived ? 'secondary' : 'success'}>
                          {driver.isArchived ? 'Inactivo' : 'Activo'}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn("font-semibold", driver.isArchived && "text-muted-foreground")}>{driver.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{driver.phone}</TableCell>
                      <TableCell className="font-semibold">{driver.assignedVehicleLicensePlate || 'N/A'}</TableCell>
                      <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No hay conductores registrados.
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
