
// src/app/(app)/servicios/components/VehicleSelectionCard.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { PlusCircle, Info, Car, Repeat } from 'lucide-react';
import { Vehicle, ServiceRecord } from '@/types';
import { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';
import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import { ServiceFormValues } from '@/schemas/service-form';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';

interface VehicleSelectionCardProps {
  vehicles: Vehicle[];
  serviceHistory: ServiceRecord[];
  onVehicleCreated?: (newVehicle: VehicleFormValues) => Promise<Vehicle>;
  onOpenNewVehicleDialog: () => void;
  initialVehicleId?: string;
}

export function VehicleSelectionCard({
  vehicles,
  onVehicleCreated,
  initialVehicleId,
}: VehicleSelectionCardProps) {
  const { control, watch, setValue, formState: { errors } } = useFormContext<ServiceFormValues>();
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const router = useRouter();

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
    setIsVehicleDialogOpen(false);
  };

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
            render={({ field }) => (
              <FormItem>
                <div className="p-3 border rounded-lg bg-muted/50">
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
                     <p className="text-sm text-muted-foreground text-center py-2">Ningún vehículo seleccionado.</p>
                  )}
                </div>
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
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsVehicleDialogOpen(true)}>
              <Repeat className="mr-2 h-4 w-4" />
              Cambiar Vehículo
            </Button>
            {selectedVehicleId && (
              <Button type="button" variant="outline" onClick={handleShowHistory}>
                <Info className="mr-2 h-4 w-4" />
                Ver Vehículo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <VehicleDialog
        open={isVehicleDialogOpen}
        onOpenChange={setIsVehicleDialogOpen}
        onSave={handleVehicleCreatedAndSelect}
      />
    </>
  );
}
