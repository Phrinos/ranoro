
// src/app/(app)/servicios/components/VehicleSelectionCard.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, User as UserIcon, MessageSquare, ExternalLink } from 'lucide-react';
import { VehicleSelectionDialog } from './VehicleSelectionDialog';
import type { Vehicle, ServiceRecord } from '@/types';
import type { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';
import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import { useRouter } from 'next/navigation';

interface VehicleSelectionCardProps {
  vehicles: Vehicle[];
  serviceHistory: ServiceRecord[];
  onVehicleCreated?: (newVehicle: VehicleFormValues) => Promise<Vehicle>;
  onOpenNewVehicleDialog: (plate?: string) => void;
  initialVehicleId?: string;
}

export function VehicleSelectionCard({
  vehicles,
  serviceHistory,
  onVehicleCreated,
  onOpenNewVehicleDialog,
  initialVehicleId,
}: VehicleSelectionCardProps) {
  const { control, watch, setValue } = useFormContext();
  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
  
  const router = useRouter();

  const selectedVehicleId = watch('vehicleId');
  const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setValue('vehicleId', vehicle.id, { shouldValidate: true });
      setValue('ownerName', vehicle.ownerName || '');
      setValue('ownerPhone', vehicle.ownerPhone || '');
      setValue('currentMileage', vehicle.currentMileage || '');
    }
    setIsSelectionDialogOpen(false);
  };
  
  const handleViewVehicle = () => {
      if(selectedVehicleId) {
          router.push(`/vehiculos/${selectedVehicleId}`);
      }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente y Vehículo</CardTitle>
          <CardDescription>Selecciona un vehículo existente o registra uno nuevo para el servicio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedVehicle ? (
            <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="font-bold text-lg">{selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.year}</p>
                        <p className="font-mono text-sm text-muted-foreground">{selectedVehicle.licensePlate}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsSelectionDialogOpen(true)}>Cambiar Vehículo</Button>
                </div>
                <div className="mt-3 text-sm space-y-2">
                    <div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" /> <span>Propietario: {selectedVehicle.ownerName}</span></div>
                    {selectedVehicle.ownerPhone && (
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Teléfono:</span>
                            <span>{selectedVehicle.ownerPhone}</span>
                            {selectedVehicle.chatMetaLink && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                    <a href={selectedVehicle.chatMetaLink} target="_blank" rel="noopener noreferrer">
                                        <MessageSquare className="h-4 w-4 text-green-600" />
                                    </a>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
          ) : (
             <Button variant="outline" className="w-full" onClick={() => setIsSelectionDialogOpen(true)}>
                <Car className="mr-2 h-4 w-4" /> Seleccionar Vehículo
             </Button>
          )}
        </CardContent>
      </Card>

      <VehicleSelectionDialog
        open={isSelectionDialogOpen}
        onOpenChange={setIsSelectionDialogOpen}
        vehicles={vehicles}
        onSelectVehicle={handleVehicleSelect}
        onNewVehicle={(plate) => {
            setIsSelectionDialogOpen(false);
            onOpenNewVehicleDialog(plate);
        }}
      />
    </>
  );
}
