// src/app/(app)/flotilla/conductores/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronRight, Wrench } from 'lucide-react';
import { personnelService, rentalService } from '@/lib/services';
import type { Driver } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function FlotillaConductoresPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = personnelService.onDriversUpdate((allDrivers) => {
      setDrivers(allDrivers);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
    <>
      <PageHeader
        title="Conductores de Flotilla"
        description="Administra los perfiles de los conductores."
        actions={
          <div className="flex gap-2">
            <Button onClick={handleAddDriver}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Conductor
            </Button>
            <ConfirmDialog
              triggerButton={
                <Button variant="outline">
                  <Wrench className="mr-2 h-4 w-4" />
                  Regenerar Cargos
                </Button>
              }
              title="¿Regenerar todos los cargos de renta?"
              description="Esta acción es irreversible y generará todos los cargos de renta diarios para todos los conductores activos desde su fecha de contrato hasta hoy. Úsalo solo si has borrado los datos."
              onConfirm={handleRegenerate}
            />
          </div>
        }
      />
      <div className="p-1">
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Vehículo Asignado</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : sortedDrivers.length > 0 ? (
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
                        <TableCell>{driver.phone}</TableCell>
                        <TableCell>{driver.assignedVehicleLicensePlate || 'N/A'}</TableCell>
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
    </>
  );
}
