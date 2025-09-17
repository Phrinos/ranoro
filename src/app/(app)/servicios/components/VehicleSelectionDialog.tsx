
// src/app/(app)/servicios/components/VehicleSelectionDialog.tsx
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Vehicle } from "@/types";
import { Car, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VehicleSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  onVehicleSelect: (vehicleId: string) => void;
  onOpenNewVehicleDialog: () => void;
}

export function VehicleSelectionDialog({
  open,
  onOpenChange,
  vehicles,
  onVehicleSelect,
  onOpenNewVehicleDialog
}: VehicleSelectionDialogProps) {
  const handleSelect = (vehicleId: string) => {
    onVehicleSelect(vehicleId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Seleccionar Vehículo</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Buscar vehículo por placa, marca, modelo..." />
          <CommandList className="flex-grow">
            <CommandEmpty>
                <div className="text-center p-4">
                    <p>No se encontraron vehículos.</p>
                    <Button variant="link" onClick={onOpenNewVehicleDialog} className="mt-2">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Registrar Nuevo Vehículo
                    </Button>
                </div>
            </CommandEmpty>
            <CommandGroup>
              {vehicles.map((vehicle) => (
                <CommandItem
                  key={vehicle.id}
                  value={`${vehicle.make} ${vehicle.model} ${vehicle.licensePlate} ${vehicle.ownerName}`}
                  onSelect={() => handleSelect(vehicle.id)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Car className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{vehicle.make} {vehicle.model} ({vehicle.licensePlate})</p>
                    <p className="text-sm text-muted-foreground">Propietario: {vehicle.ownerName}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
