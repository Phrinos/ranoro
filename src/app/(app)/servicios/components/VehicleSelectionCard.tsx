

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Car as CarIcon, AlertCircle, User, Fingerprint, History } from 'lucide-react';
import type { Vehicle, ServiceRecord } from '@/types';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface VehicleSelectionCardProps {
  isReadOnly?: boolean;
  localVehicles: Vehicle[];
  serviceHistory: ServiceRecord[];
  onVehicleSelected: (vehicle: Vehicle | null) => void;
  onOpenNewVehicleDialog: () => void;
}

export function VehicleSelectionCard({
  isReadOnly,
  localVehicles,
  serviceHistory,
  onVehicleSelected,
  onOpenNewVehicleDialog,
}: VehicleSelectionCardProps) {
  const { control, setValue, getValues, watch } = useFormContext();
  const { toast } = useToast();

  const [vehicleLicensePlateSearch, setVehicleLicensePlateSearch] = useState(getValues('vehicleLicensePlateSearch') || "");
  const [vehicleSearchResults, setVehicleSearchResults] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [lastService, setLastService] = useState<ServiceRecord | null>(null);
  const [penultimateService, setPenultimateService] = useState<ServiceRecord | null>(null);
  const [vehicleNotFound, setVehicleNotFound] = useState(false);

  const vehicleId = watch('vehicleId');

  useEffect(() => {
    if (vehicleId) {
      const vehicle = localVehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
        setVehicleLicensePlateSearch(vehicle.licensePlate);
        const vehicleServices = serviceHistory.filter(s => s.vehicleId === vehicle.id).sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
        setLastService(vehicleServices[0] || null);
        setPenultimateService(vehicleServices[1] || null);
      }
    } else {
        setSelectedVehicle(null);
        setLastService(null);
        setPenultimateService(null);
    }
  }, [vehicleId, localVehicles, serviceHistory]);

  const handleSearchVehicle = () => {
    if (!vehicleLicensePlateSearch.trim()) {
      toast({ title: "Ingrese Placa", description: "Por favor ingrese una placa para buscar.", variant: "destructive" });
      return;
    }
    const found = localVehicles.find(v => v.licensePlate.toLowerCase() === vehicleLicensePlateSearch.trim().toLowerCase());
    if (found) {
      handleSelectVehicleFromSearch(found);
      toast({ title: "Vehículo Encontrado", description: `${found.make} ${found.model} ${found.year}` });
    } else {
      setSelectedVehicle(null);
      setValue('vehicleId', undefined);
      setVehicleNotFound(true);
      setLastService(null);
      setPenultimateService(null);
      toast({ title: "Vehículo No Encontrado", description: "Puede registrarlo si es nuevo.", variant: "default" });
    }
  };

  const handleSelectVehicleFromSearch = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleLicensePlateSearch(vehicle.licensePlate);
    setValue('vehicleId', String(vehicle.id), { shouldValidate: true });
    if (vehicle.isFleetVehicle && vehicle.currentMileage) {
      setValue('mileage', vehicle.currentMileage, { shouldDirty: true });
    }
    setVehicleNotFound(false);
    setVehicleSearchResults([]);
    const vehicleServices = serviceHistory.filter(s => s.vehicleId === vehicle.id).sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
    setLastService(vehicleServices[0] || null);
    setPenultimateService(vehicleServices[1] || null);
    onVehicleSelected(vehicle);
  };
  
   const handleVehiclePlateKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearchVehicle();
    }
  };

  useEffect(() => {
    if (!vehicleLicensePlateSearch || vehicleLicensePlateSearch.length < 2) {
      setVehicleSearchResults([]);
      return;
    }
    if (selectedVehicle && selectedVehicle.licensePlate === vehicleLicensePlateSearch) {
      setVehicleSearchResults([]);
      return;
    }

    const lowerSearch = vehicleLicensePlateSearch.toLowerCase();
    const results = localVehicles.filter(v =>
      v.licensePlate.toLowerCase().includes(lowerSearch) ||
      v.make.toLowerCase().includes(lowerSearch) ||
      v.model.toLowerCase().includes(lowerSearch) ||
      v.ownerName.toLowerCase().includes(lowerSearch)
    ).slice(0, 5);
    setVehicleSearchResults(results);
  }, [vehicleLicensePlateSearch, localVehicles, selectedVehicle]);
  
  const formatServiceInfo = (service: ServiceRecord | null): string => {
    if (!service) return 'No hay registro.';
    const date = new Date(service.serviceDate);
    const description = service.description || '';
    if (!isValid(date)) return 'Fecha inválida.';
    return `${service.mileage ? `${service.mileage.toLocaleString('es-ES')} km - ` : ''}${format(date, "dd MMM yyyy", { locale: es })} - ${description}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Información del Vehículo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4">
              <div className="relative">
                <FormField
                    control={control}
                    name="vehicleLicensePlateSearch"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Placa del Vehículo</FormLabel>
                        <FormControl>
                        <Input
                            placeholder="Buscar / Ingresar Placas"
                            {...field}
                            value={vehicleLicensePlateSearch}
                            onChange={(e) => {
                                setVehicleLicensePlateSearch(e.target.value.toUpperCase());
                                field.onChange(e.target.value.toUpperCase());
                            }}
                            disabled={isReadOnly}
                            className="uppercase"
                            onKeyDown={handleVehiclePlateKeyDown}
                        />
                        </FormControl>
                    </FormItem>
                    )}
                />
                {vehicleSearchResults.length > 0 && (
                  <div className="absolute top-full mt-1 w-full md:w-full z-10">
                    <ScrollArea className="h-auto max-h-[150px] rounded-md border bg-background shadow-lg">
                      <div className="p-2">
                        {vehicleSearchResults.map(v => (
                          <button
                            type="button"
                            key={v.id}
                            onClick={() => handleSelectVehicleFromSearch(v)}
                            className="w-full text-left p-2 rounded-md hover:bg-muted"
                          >
                            <p className="font-semibold">{v.licensePlate}</p>
                            <p className="text-sm text-muted-foreground">{v.make} {v.model} - {v.ownerName}</p>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
              <FormField
                  control={control}
                  name="mileage"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Kilometraje (Opcional)</FormLabel>
                          <FormControl>
                              <Input
                              type="number"
                              placeholder="Ej: 55000 km"
                              {...field}
                              value={field.value ?? ''}
                              disabled={isReadOnly}
                              />
                          </FormControl>
                      </FormItem>
                  )}
              />
            </div>
            
            <div>
                {selectedVehicle && (
                    <div className="p-3 border rounded-md bg-amber-50 dark:bg-amber-950/50 text-sm space-y-2 h-full flex flex-col justify-center">
                        <div>
                            <p className="font-bold text-lg">{selectedVehicle.licensePlate} - {selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.year}</p>
                        </div>
                        <div className="space-y-1 pt-1">
                            <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {selectedVehicle.ownerName} - {selectedVehicle.ownerPhone}</p>
                            <p className="flex items-center gap-2"><Fingerprint className="h-4 w-4 text-muted-foreground" /> {selectedVehicle.vin || 'VIN no registrado'}</p>
                        </div>
                        <div className="text-xs pt-2 mt-auto border-t space-y-1">
                            <p className="font-semibold flex items-center gap-1"><History className="h-3 w-3" /> Historial Reciente:</p>
                            <p className="text-muted-foreground truncate" title={formatServiceInfo(lastService)}><strong>Último:</strong> {formatServiceInfo(lastService)}</p>
                            <p className="text-muted-foreground truncate" title={formatServiceInfo(penultimateService)}><strong>Anterior:</strong> {formatServiceInfo(penultimateService)}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {vehicleNotFound && !selectedVehicle && !isReadOnly && (
          <div className="p-3 border border-orange-500 rounded-md bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 text-sm flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>Vehículo con placa "{vehicleLicensePlateSearch}" no encontrado.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenNewVehicleDialog}
              className="w-full sm:w-auto"
            >
              <CarIcon className="mr-2 h-4 w-4" /> Registrar Nuevo Vehículo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
