
// src/app/(app)/flotilla/conductores/components/FlotillaConductoresTab.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronRight, Wrench } from 'lucide-react';
import type { Driver } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { rentalService } from '@/lib/services';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';

interface FlotillaConductoresTabProps {
  drivers: Driver[];
  onAddDriver: () => void;
}

export function FlotillaConductoresTab({ drivers, onAddDriver }: FlotillaConductoresTabProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [sortOption, setSortOption] = useState('name_asc');

  const sortedDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => {
        const [key, direction] = sortOption.split('_');
        
        if (key === 'isArchived') {
            const valA = a.isArchived;
            const valB = b.isArchived;
            if (valA === valB) return a.name.localeCompare(b.name);
            const comparison = valA > valB ? 1 : -1;
            return direction === 'asc' ? comparison : -comparison;
        }

        const valA = a[key as keyof Driver] || '';
        const valB = b[key as keyof Driver] || '';

        const comparison = String(valA).localeCompare(String(valB), 'es', { numeric: true });
        return direction === 'asc' ? comparison : -comparison;
    });
  }, [drivers, sortOption]);

  const handleRowClick = (driverId: string) => {
    router.push(`/flotilla/conductores/${driverId}`);
  };
  
  const handleSort = (key: string) => {
      const isAsc = sortOption === `${key}_asc`;
      setSortOption(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-end gap-2">
        <Button onClick={onAddDriver} className="w-full sm:w-auto font-bold">
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Conductor
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <SortableTableHeader sortKey="isArchived" label="Estado" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="name" label="Nombre" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="phone" label="Teléfono" onSort={handleSort} currentSort={sortOption} className="hidden sm:table-cell" textClassName="text-white" />
                  <SortableTableHeader sortKey="assignedVehicleLicensePlate" label="Vehículo Asignado" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                  <div className="w-10"></div>
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
