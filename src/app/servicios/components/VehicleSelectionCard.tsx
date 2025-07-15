
"use client";

import { useState, useMemo, useCallback } from 'react';
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Car, PlusCircle, Search, User, X } from 'lucide-react';
import type { Vehicle } from '@/types';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import type { ServiceFormValues } from '@/schemas/service-form';

interface VehicleSelectionCardProps {
  isReadOnly?: boolean;
  localVehicles: Vehicle[];
  onVehicleSelected: (vehicle: Vehicle | null) => void;
  onOpenNewVehicleDialog: (plate?: string) => void;
}

export function VehicleSelectionCard({
  isReadOnly,
  localVehicles,
  onVehicleSelected,
  onOpenNewVehicleDialog
}: VehicleSelectionCardProps) {
  const { control, watch, setValue, formState: { errors } } = useFormContext<ServiceFormValues>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const vehicleId = watch('vehicleId');

  // Sync component state when the form's vehicleId changes from the outside
  useState(() => {
    if (vehicleId) {
      const vehicle = localVehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
        setSearchTerm(vehicle.licensePlate); // Pre-fill search
      }
    }
  });

  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    if (selectedVehicle && (selectedVehicle.licensePlate === searchTerm || selectedVehicle.make.toLowerCase() === searchTerm.toLowerCase())) return [];

    const lowerCaseSearch = searchTerm.toLowerCase();
    return localVehicles.filter(v =>
      v.licensePlate.toLowerCase().includes(lowerCaseSearch) ||
      v.make.toLowerCase().includes(lowerCaseSearch) ||
      v.model.toLowerCase().includes(lowerCaseSearch) ||
      v.ownerName.toLowerCase().includes(lowerCaseSearch)
    ).slice(0, 10);
  }, [searchTerm, localVehicles, selectedVehicle]);

  const handleSelectVehicle = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setValue('vehicleId', vehicle.id, { shouldValidate: true });
    onVehicleSelected(vehicle);
    setSearchTerm('');
  }, [setValue, onVehicleSelected]);

  const handleClearSelection = () => {
    setSelectedVehicle(null);
    setValue('vehicleId', '', { shouldValidate: true });
    onVehicleSelected(null);
    setSearchTerm('');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehículo</CardTitle>
        <CardDescription>
          Busque por placa, marca, modelo o propietario. Si no existe, créelo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedVehicle ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar vehículo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                disabled={isReadOnly}
              />
            </div>
            {errors.vehicleId && <p className="text-sm font-medium text-destructive">{errors.vehicleId.message}</p>}
            
            <ScrollArea className="h-[120px] rounded-md border">
              <div className="p-2 space-y-1">
                {searchResults.map(v => (
                  <Button
                    key={v.id}
                    type="button"
                    variant="ghost"
                    className="w-full justify-start text-left h-auto"
                    onClick={() => handleSelectVehicle(v)}
                  >
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{v.licensePlate} - {v.make} {v.model}</p>
                        <p className="text-xs text-muted-foreground">{v.ownerName}</p>
                      </div>
                    </div>
                  </Button>
                ))}
                {searchTerm && searchResults.length === 0 && (
                  <div className="text-center p-4">
                    <p className="text-sm text-muted-foreground">Vehículo no encontrado.</p>
                    <Button type="button" variant="link" size="sm" onClick={() => onOpenNewVehicleDialog(searchTerm)}>
                      <PlusCircle className="mr-2 h-4 w-4"/>Crear Vehículo
                    </Button>
                  </div>
                )}
                 {!searchTerm && (
                     <div className="text-center p-4">
                        <Button type="button" variant="outline" size="sm" onClick={() => onOpenNewVehicleDialog()}>
                          <PlusCircle className="mr-2 h-4 w-4"/>Crear Vehículo Nuevo
                        </Button>
                    </div>
                 )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <Card className="bg-muted/50">
            <CardHeader className="p-4 flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Car className="h-5 w-5"/> 
                        {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
                    </CardTitle>
                    <CardDescription>Placa: {selectedVehicle.licensePlate}</CardDescription>
                </div>
                {!isReadOnly && (
                    <Button type="button" variant="ghost" size="icon" onClick={handleClearSelection} className="h-7 w-7">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground"/> 
                    <span className="font-medium">{selectedVehicle.ownerName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{selectedVehicle.ownerPhone}</span>
                </div>
            </CardContent>
          </Card>
        )}
        {!isReadOnly && (
           <FormField
              control={control}
              name="mileage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={errors.mileage ? 'text-destructive' : ''}>Kilometraje</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ej: 85000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
           />
        )}
      </CardContent>
    </Card>
  );
}
