
// src/app/(app)/servicios/components/VehicleSelectionCard.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { PlusCircle, Info, Car, Repeat } from 'lucide-react';
import { Vehicle } from '@/types';
import { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';
import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import { ServiceFormValues } from '@/schemas/service-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { VehicleSelectionDialog } from './VehicleSelectionDialog';

interface VehicleSelectionCardProps {
  vehicles: Vehicle[];
  onVehicleCreated?: (newVehicle: VehicleFormValues) => Promise<Vehicle>;
  serviceHistory: ServiceRecord[];
  onOpenNewVehicleDialog: () => void;
  initialVehicleId?: string;
}

export function VehicleSelectionCard({
  vehicles,
  onVehicleCreated,
  serviceHistory,
  onOpenNewVehicleDialog,
  initialVehicleId,
}: VehicleSelectionCardProps) {
  const { control, watch, setValue, formState: { errors } } = useFormContext<ServiceFormValues>();
  const [isVehicleCreateDialogOpen, setIsVehicleCreateDialogOpen] = useState(false);
  const [isVehicleSelectionDialogOpen, setIsVehicleSelectionDialogOpen] = useState(false);

  const selectedVehicleId = watch('vehicleId');
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  useEffect(() => {
    if (selectedVehicleId && selectedVehicle) {
      setValue('vehicleIdentifier', `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.licensePlate})`);
      setValue('customerName', selectedVehicle.ownerName || 'N/A');
    }
  }, [selectedVehicleId, selectedVehicle, setValue]);

  const handleVehicleCreatedAndSelect = async (data: VehicleFormValues) => {
    if (!onVehicleCreated) return;
    const newVehicle = await onVehicleCreated(data);
    setValue('vehicleId', newVehicle.id, { shouldValidate: true, shouldDirty: true });
    setIsVehicleCreateDialogOpen(false);
  };
  
  const handleVehicleSelect = (vehicleId: string) => {
    setValue('vehicleId', vehicleId, { shouldValidate: true, shouldDirty: true });
    setIsVehicleSelectionDialogOpen(false);
  }

  const handleShowHistory = () => {
    if (selectedVehicleId) {
      window.open(`/vehiculos/${selectedVehicleId}`, '_blank');
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Vehículo</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="vehicleId"
            render={() => (
              <FormItem>
                <button
                  type="button"
                  onClick={() => setIsVehicleSelectionDialogOpen(true)}
                  className="w-full p-3 border rounded-lg bg-muted/50 text-left hover:bg-muted transition-colors"
                >
                  {selectedVehicle ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Car className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">{selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.licensePlate})</p>
                          <p className="text-sm text-muted-foreground">Propietario: {selectedVehicle.ownerName}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground text-center py-2">
                      <Car className="h-5 w-5" />
                      <span>Seleccionar Vehículo</span>
                    </div>
                  )}
                </button>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="mileage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={cn(errors.mileage && "text-destructive")}>KM Actual</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ej. 75000"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(parseInt(e.target.value, 10) || null)}
                    className={cn("bg-white", errors.mileage && "border-destructive focus-visible:ring-destructive")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            {selectedVehicle && (
                <>
                    <Button type="button" variant="secondary" onClick={() => setIsVehicleSelectionDialogOpen(true)}>
                        <Repeat className="mr-2 h-4 w-4" />
                        Cambiar Vehículo
                    </Button>
                    <Button type="button" variant="outline" onClick={handleShowHistory}>
                        <Info className="mr-2 h-4 w-4" />
                        Ver Vehículo
                    </Button>
                </>
            )}
          </div>
        </CardContent>
      </Card>

      <VehicleDialog
        open={isVehicleCreateDialogOpen}
        onOpenChange={setIsVehicleCreateDialogOpen}
        onSave={handleVehicleCreatedAndSelect}
      />

      <VehicleSelectionDialog
        open={isVehicleSelectionDialogOpen}
        onOpenChange={setIsVehicleSelectionDialogOpen}
        vehicles={vehicles}
        onVehicleSelect={handleVehicleSelect}
        onOpenNewVehicleDialog={() => {
          setIsVehicleSelectionDialogOpen(false);
          setIsVehicleCreateDialogOpen(true);
        }}
      />
    </>
  );
}
