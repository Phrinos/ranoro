// src/app/(app)/flotilla/conductores/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronRight, UserCheck, UserX } from 'lucide-react';
import { personnelService } from '@/lib/services';
import type { Driver } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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

  const handleAddDriver = () => {
    toast({ title: "Función en desarrollo", description: "Pronto podrás añadir nuevos conductores desde aquí." });
  };

  const handleRowClick = (driverId: string) => {
    router.push(`/flotilla/conductores/${driverId}`);
  };

  return (
    <>
      <PageHeader
        title="Conductores de Flotilla"
        description="Administra los perfiles de los conductores."
        actions={
          <Button onClick={handleAddDriver}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Conductor
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
                  ) : drivers.length > 0 ? (
                    drivers.map(driver => (
                      <TableRow 
                        key={driver.id} 
                        onClick={() => handleRowClick(driver.id)}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell>
                          {driver.isArchived 
                            ? <UserX className="h-5 w-5 text-muted-foreground" title="Archivado"/> 
                            : <UserCheck className="h-5 w-5 text-green-600" title="Activo"/>
                          }
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
