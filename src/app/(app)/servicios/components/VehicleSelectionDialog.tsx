// src/app/(app)/servicios/components/VehicleSelectionDialog.tsx
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  const [searchTerm, setSearchTerm] = useState('');

  const handleSelect = (vehicleId: string) => {
    onVehicleSelect(vehicleId);
    onOpenChange(false);
  };
  
  const filteredVehicles = vehicles.filter(vehicle => {
    if (!vehicle) return false;
    const lowerSearch = searchTerm.toLowerCase();
    
    const licensePlateMatch = vehicle.licensePlate && vehicle.licensePlate.toLowerCase().includes(lowerSearch);
    const makeMatch = vehicle.make && vehicle.make.toLowerCase().includes(lowerSearch);
    const modelMatch = vehicle.model && vehicle.model.toLowerCase().includes(lowerSearch);
    const ownerNameMatch = vehicle.ownerName && vehicle.ownerName.toLowerCase().includes(lowerSearch);

    return licensePlateMatch || makeMatch || modelMatch || ownerNameMatch;
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if(!isOpen) setSearchTerm(''); }}>
      <DialogContent className="sm:max-w-[525px] h-[70vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Seleccionar Vehículo</DialogTitle>
          <DialogDescription>Busca un vehículo existente o crea uno nuevo.</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput 
            placeholder="Buscar por placa, marca, modelo, propietario..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList className="flex-grow">
            <CommandEmpty>
                <div className="text-center p-4">
                    <p>No se encontraron vehículos.</p>
                    <Button variant="link" onClick={onOpenNewVehicleDialog} className="mt-2">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Registrar Nuevo Vehículo "{searchTerm}"
                    </Button>
                </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredVehicles.map((vehicle) => (
                <CommandItem
                  key={vehicle.id}
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
