// src/app/(app)/flotilla/conductores/components/FlotillaConductoresTab.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronRight, Eye, EyeOff } from 'lucide-react';
import type { Driver } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const [showArchived, setShowArchived] = useState(false);

  const sortedDrivers = useMemo(() => {
    return [...drivers]
      .filter(driver => showArchived ? true : !driver.isArchived)
      .sort((a, b) => {
        // Primary sort: always put active drivers first
        if (a.isArchived !== b.isArchived) {
          return a.isArchived ? 1 : -1;
        }

        // Secondary sort: based on user's choice
        const [key, direction] = sortOption.split('_');
        const valA = a[key as keyof Driver] || '';
        const valB = b[key as keyof Driver] || '';

        const comparison = String(valA).localeCompare(String(valB), 'es', { numeric: true });
        return direction === 'asc' ? comparison : -comparison;
      });
  }, [drivers, sortOption, showArchived]);

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
        <Button variant="outline" onClick={() => setShowArchived(!showArchived)} className="w-full sm:w-auto bg-card">
          {showArchived ? <EyeOff className="mr-2 h-4 w-4"/> : <Eye className="mr-2 h-4 w-4"/>}
          {showArchived ? 'Ocultar Inactivos' : 'Ver Inactivos'}
        </Button>
        <Button onClick={onAddDriver} className="w-full sm:w-auto font-bold">
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Conductor
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-black text-white">
                <TableRow className="hover:bg-transparent">
                  <SortableTableHeader sortKey="name" label="Nombre" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="phone" label="Teléfono" onSort={handleSort} currentSort={sortOption} className="hidden sm:table-cell text-white" />
                  <SortableTableHeader sortKey="assignedVehicleLicensePlate" label="Vehículo Asignado" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDrivers.length > 0 ? (
                  sortedDrivers.map(driver => (
                    <TableRow 
                      key={driver.id} 
                      onClick={() => handleRowClick(driver.id)}
                      className={cn("cursor-pointer hover:bg-muted/50", driver.isArchived && "bg-gray-100/80 dark:bg-gray-800/20 text-muted-foreground")}
                    >
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          {driver.name}
                          {driver.isArchived && <Badge variant="secondary">Archivado</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{driver.phone}</TableCell>
                      <TableCell className="font-semibold">{driver.assignedVehicleLicensePlate || 'N/A'}</TableCell>
                      <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No hay conductores para mostrar.
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
