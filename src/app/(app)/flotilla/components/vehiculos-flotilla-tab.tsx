// src/app/(app)/flotilla/components/vehiculos-flotilla-tab.tsx
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle, ShieldCheck, Car, AlertTriangle, User } from "lucide-react";
import type { Vehicle, Driver } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTableManager } from '@/hooks/useTableManager';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { inventoryService, personnelService } from '@/lib/services';
import { AddVehicleToFleetDialog } from './add-vehicle-to-fleet-dialog';
import { FineCheckDialog } from './fine-check-dialog';

interface VehiculosFlotillaTabProps {
  allVehicles: Vehicle[];
  allDrivers: Driver[];
}

export function VehiculosFlotillaTab({ allVehicles, allDrivers }: VehiculosFlotillaTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isAddVehicleDialogOpen, setIsAddVehicleDialogOpen] = useState(false);
  const [isFineCheckDialogOpen, setIsFineCheckDialogOpen] = useState(false);

  const fleetVehicles = useMemo(() => allVehicles.filter(v => v.isFleetVehicle), [allVehicles]);
  const unassignedVehicles = useMemo(() => allVehicles.filter(v => !v.isFleetVehicle), [allVehicles]);

  const {
    filteredData,
    ...tableManager
  } = useTableManager<Vehicle>({
    initialData: fleetVehicles,
    searchKeys: ['licensePlate', 'make', 'model'],
    dateFilterKey: '', // No date filter
    initialSortOption: 'licensePlate_asc'
  });

  const handleAddVehicleToFleet = async (vehicleId: string, costs: { dailyRentalCost: number; gpsMonthlyCost: number; adminMonthlyCost: number; insuranceMonthlyCost: number; }) => {
    try {
      await inventoryService.updateVehicle(vehicleId, { isFleetVehicle: true, ...costs });
      toast({ title: 'Vehículo Añadido', description: 'El vehículo ahora forma parte de la flotilla.' });
      setIsAddVehicleDialogOpen(false);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo añadir el vehículo a la flotilla.", variant: "destructive" });
    }
  };

  const handleConfirmFineCheck = async (checkedVehicleIds: string[]) => {
    const userString = typeof window !== 'undefined' ? localStorage.getItem('authUser') : null;
    const user = userString ? JSON.parse(userString) : { name: 'Sistema', id: 'system' };
    
    try {
        for (const vehicleId of checkedVehicleIds) {
            const vehicle = allVehicles.find(v => v.id === vehicleId);
            if (vehicle) {
                const newHistoryEntry = {
                    date: new Date().toISOString(),
                    checkedBy: user.name,
                    checkedById: user.id
                };
                const updatedHistory = [...(vehicle.fineCheckHistory || []), newHistoryEntry];
                await inventoryService.updateVehicle(vehicleId, { fineCheckHistory: updatedHistory });
            }
        }
        localStorage.setItem('lastFineCheckDate', new Date().toISOString());
        toast({ title: "Revisión Completada", description: "Se ha registrado la revisión de multas." });
        setIsFineCheckDialogOpen(false);
    } catch (e) {
        toast({ title: "Error", description: "No se pudo registrar la revisión.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setIsFineCheckDialogOpen(true)}>
          <ShieldCheck className="mr-2 h-4 w-4" /> Revisión de Multas
        </Button>
        <Button onClick={() => setIsAddVehicleDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Vehículo
        </Button>
      </div>

      <TableToolbar
        {...tableManager}
        searchPlaceholder="Buscar por placa, marca o modelo..."
        sortOptions={[
          { value: 'licensePlate_asc', label: 'Placa (A-Z)' },
          { value: 'make_asc', label: 'Marca (A-Z)' },
          { value: 'model_asc', label: 'Modelo (A-Z)' },
        ]}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white">Placa</TableHead>
                  <TableHead className="text-white">Vehículo</TableHead>
                  <TableHead className="text-white">Conductor Asignado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map(vehicle => {
                    const driver = allDrivers.find(d => d.id === vehicle.assignedVehicleId);
                    return (
                      <TableRow key={vehicle.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/flotilla/${vehicle.id}`)}>
                        <TableCell className="font-semibold">{vehicle.licensePlate}</TableCell>
                        <TableCell>{vehicle.make} {vehicle.model}</TableCell>
                        <TableCell>
                          {driver ? (
                            <span className="flex items-center gap-2">
                                <User className="h-4 w-4 text-green-600"/> {driver.name}
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 text-muted-foreground">
                                <AlertTriangle className="h-4 w-4 text-orange-500"/> Sin asignar
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay vehículos en la flotilla.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <AddVehicleToFleetDialog
        open={isAddVehicleDialogOpen}
        onOpenChange={setIsAddVehicleDialogOpen}
        vehicles={unassignedVehicles}
        onAddVehicle={handleAddVehicleToFleet}
      />

      <FineCheckDialog
        open={isFineCheckDialogOpen}
        onOpenChange={setIsFineCheckDialogOpen}
        fleetVehicles={fleetVehicles}
        onConfirm={handleConfirmFineCheck}
      />
    </div>
  );
}
