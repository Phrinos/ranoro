// src/app/(app)/flotilla/vehiculos/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { inventoryService } from '@/lib/services';
import type { Vehicle } from '@/types';
import { Loader2 } from 'lucide-react';
import { FlotillaVehiculosTab } from './components/FlotillaVehiculosTab';
import { VehicleSelectionDialog } from '@/app/(app)/servicios/components/VehicleSelectionDialog';
import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import { useToast } from '@/hooks/use-toast';

export default function VehiculosPage() {
  const { toast } = useToast();
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAddVehicleDialogOpen, setIsAddVehicleDialogOpen] = useState(false);
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = inventoryService.onVehiclesUpdate((data) => {
      setAllVehicles(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fleetVehicles = useMemo(() => allVehicles.filter(v => v.isFleetVehicle), [allVehicles]);

  const handleAddVehicleToFleet = async (vehicleId: string) => {
    try {
      const vehicle = allVehicles.find(v => v.id === vehicleId);
      if (!vehicle) throw new Error('Vehicle not found');
      await inventoryService.saveVehicle({ isFleetVehicle: true }, vehicle.id);
      toast({ title: 'Vehículo Añadido', description: `${vehicle.make} ${vehicle.model} ahora es parte de la flotilla.` });
      setIsAddVehicleDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo añadir el vehículo a la flotilla.', variant: 'destructive'});
    }
  };

  const handleCreateAndAddVehicle = () => {
      setIsAddVehicleDialogOpen(false);
      setIsNewVehicleDialogOpen(true);
  };
  
  const handleSaveNewVehicle = async (data: any) => {
      try {
          const newVehicleData = { ...data, isFleetVehicle: true };
          await inventoryService.saveVehicle(newVehicleData);
          toast({ title: 'Vehículo Creado y Añadido', description: 'El nuevo vehículo se ha añadido a la flotilla.' });
          setIsNewVehicleDialogOpen(false);
      } catch (error) {
          toast({ title: 'Error', description: 'No se pudo crear el vehículo.', variant: 'destructive'});
      }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
      <FlotillaVehiculosTab vehicles={fleetVehicles} onAddVehicle={() => setIsAddVehicleDialogOpen(true)} />
      <VehicleSelectionDialog
        open={isAddVehicleDialogOpen}
        onOpenChange={setIsAddVehicleDialogOpen}
        vehicles={allVehicles.filter(v => !v.isFleetVehicle)}
        onSelectVehicle={handleAddVehicleToFleet}
        onNewVehicle={handleCreateAndAddVehicle}
      />
      <VehicleDialog 
        open={isNewVehicleDialogOpen}
        onOpenChange={setIsNewVehicleDialogOpen}
        onSave={handleSaveNewVehicle}
      />
    </>
  );
}
