// src/app/(app)/flotilla/components/conductores-tab.tsx
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle, User, ChevronRight, AlertTriangle, UserCheck, UserX } from "lucide-react";
import type { Driver, Vehicle } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, calculateDriverDebt } from "@/lib/utils";
import { DriverDialog } from '../../conductores/components/driver-dialog';
import type { DriverFormValues } from '../../conductores/components/driver-form';
import { personnelService } from '@/lib/services';
import { useTableManager } from '@/hooks/useTableManager';
import { TableToolbar } from '@/components/shared/table-toolbar';

interface ConductoresTabProps {
  allDrivers: Driver[];
  allVehicles: Vehicle[];
}

const getDriverSortPriority = (driver: Driver): number => {
    if (driver.isArchived) return 3; // Lowest priority
    if (!driver.assignedVehicleId) return 2; // Medium priority
    return 1; // Highest priority
};


export function ConductoresTab({ allDrivers, allVehicles }: ConductoresTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  
  const sortedInitialDrivers = useMemo(() => {
    return [...allDrivers].sort((a,b) => {
        const priorityA = getDriverSortPriority(a);
        const priorityB = getDriverSortPriority(b);
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        return a.name.localeCompare(b.name);
    });
  }, [allDrivers]);


  const {
    filteredData,
    ...tableManager
  } = useTableManager<Driver>({
    initialData: sortedInitialDrivers,
    searchKeys: ['name', 'phone'],
    dateFilterKey: '', // No date filter here
    initialSortOption: 'default' // Using a default and handling sort logic in component
  });

  const handleOpenDriverDialog = useCallback((driver?: Driver) => {
    setEditingDriver(driver || null);
    setIsDriverDialogOpen(true);
  }, []);

  const handleSaveDriver = async (formData: DriverFormValues) => {
    try {
      await personnelService.saveDriver(formData, editingDriver?.id);
      toast({ title: `Conductor ${editingDriver ? 'actualizado' : 'creado'}` });
      setIsDriverDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDriverDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Conductor
        </Button>
      </div>

      <TableToolbar
        {...tableManager}
        searchPlaceholder="Buscar por nombre o teléfono..."
        sortOptions={[
          { value: 'name_asc', label: 'Nombre (A-Z)' },
          { value: 'name_desc', label: 'Nombre (Z-A)' },
        ]}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white">Estado</TableHead>
                  <TableHead className="text-white">Conductor</TableHead>
                  <TableHead className="text-white">Teléfono</TableHead>
                  <TableHead className="text-white">Vehículo Asignado</TableHead>
                  <TableHead className="w-10 text-white"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map(driver => {
                    const vehicle = allVehicles.find(v => v.id === driver.assignedVehicleId);
                    return (
                      <TableRow key={driver.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/conductores/${driver.id}`)}>
                        <TableCell>
                          {driver.isArchived 
                            ? <UserX className="h-5 w-5 text-muted-foreground" title="Archivado"/> 
                            : <UserCheck className="h-5 w-5 text-green-600" title="Activo"/>
                          }
                        </TableCell>
                        <TableCell className="font-semibold">{driver.name}</TableCell>
                        <TableCell>{driver.phone}</TableCell>
                        <TableCell>{vehicle ? `${vehicle.licensePlate} - ${vehicle.make}` : 'Sin vehículo'}</TableCell>
                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground"/></TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center">No se encontraron conductores.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <DriverDialog
        open={isDriverDialogOpen}
        onOpenChange={setIsDriverDialogOpen}
        driver={editingDriver}
        onSave={handleSaveDriver}
      />
    </div>
  );
}
