// src/app/(app)/flotilla/components/AssignDriverCard.tsx
"use client";

import React, { useState, useMemo } from 'react';
import type { Driver, Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { personnelService } from '@/lib/services';

interface AssignDriverCardProps {
  vehicle: Vehicle;
  allDrivers: Driver[];
  onAssignmentChange: () => void;
}

export function AssignDriverCard({ vehicle, allDrivers, onAssignmentChange }: AssignDriverCardProps) {
  const [open, setOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(vehicle.assignedDriverId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const driverOptions = useMemo(() => {
    return allDrivers.map(driver => ({
      value: driver.id,
      label: driver.name,
      assignedVehicle: driver.assignedVehicleLicensePlate ? `Asignado a ${driver.assignedVehicleLicensePlate}` : 'Disponible',
    }));
  }, [allDrivers]);

  const handleAssignDriver = async () => {
    if (selectedDriverId === vehicle.assignedDriverId) return;
    
    setIsSubmitting(true);
    try {
      await personnelService.assignVehicleToDriver(vehicle, selectedDriverId, allDrivers);
      toast({
        title: "Asignación Actualizada",
        description: selectedDriverId ? `El conductor ha sido asignado.` : `El vehículo ahora está disponible.`
      });
      onAssignmentChange(); // Refresh parent data
    } catch (error) {
      console.error("Failed to assign driver:", error);
      toast({ title: "Error", description: "No se pudo actualizar la asignación.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setOpen(false);
    }
  };

  const currentDriverName = useMemo(() => {
    return allDrivers.find(d => d.id === vehicle.assignedDriverId)?.name || 'Sin Asignar';
  }, [vehicle.assignedDriverId, allDrivers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conductor Asignado</CardTitle>
        <CardDescription>Asigna o cambia el conductor de este vehículo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Conductor Actual</p>
          <p className="text-lg font-semibold">{currentDriverName}</p>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Cambiar Asignación</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedDriverId
                  ? driverOptions.find(d => d.value === selectedDriverId)?.label
                  : "Seleccionar conductor..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Buscar conductor..." />
                <CommandList>
                  <CommandEmpty>No se encontraron conductores.</CommandEmpty>
                  <CommandGroup>
                    {driverOptions.map((driver) => (
                      <CommandItem
                        key={driver.value}
                        value={driver.label}
                        onSelect={() => {
                          setSelectedDriverId(driver.value === selectedDriverId ? null : driver.value);
                          setOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedDriverId === driver.value ? "opacity-100" : "opacity-0")} />
                        <div>
                          <p>{driver.label}</p>
                          <p className="text-xs text-muted-foreground">{driver.assignedVehicle}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <Button onClick={handleAssignDriver} disabled={isSubmitting || selectedDriverId === vehicle.assignedDriverId}>
          {isSubmitting ? 'Guardando...' : 'Guardar Asignación'}
        </Button>
      </CardContent>
    </Card>
  );
}
