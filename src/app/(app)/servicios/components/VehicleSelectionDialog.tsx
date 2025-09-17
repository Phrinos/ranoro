// src/app/(app)/servicios/components/VehicleSelectionDialog.tsx
"use client";

import React, { useState, useMemo } from 'react';
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
import { cn } from '@/lib/utils';

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

  const filteredVehicles = useMemo(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => {
      if (!v) return false;
      const plate = (v.licensePlate || '').toLowerCase();
      const make  = (v.make || '').toLowerCase();
      const model = (v.model || '').toLowerCase();
      const owner = (v.ownerName || '').toLowerCase();
      return (
        plate.includes(q) ||
        make.includes(q) ||
        model.includes(q) ||
        owner.includes(q)
      );
    });
  }, [vehicles, searchTerm]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) setSearchTerm('');
      }}
    >
      {/* padding consistente y contenido en columna */}
      <DialogContent className="sm:max-w-[560px] h-[70vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle>Seleccionar Vehículo</DialogTitle>
          <DialogDescription>Busca un vehículo existente o crea uno nuevo.</DialogDescription>
        </DialogHeader>

        {/* Command sin filtro interno: usamos nuestro filtro => no se deshabilitan items */}
        <Command
          shouldFilter={false}
          className="mx-6 mb-6 rounded-md border"
        >
          <CommandInput
            placeholder="Buscar por placa, marca, modelo, propietario..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />

          <CommandList className="max-h-[48vh] overflow-y-auto">
            <CommandEmpty>
              <div className="text-center p-4">
                <p>No se encontraron vehículos.</p>
                <Button
                  variant="link"
                  onClick={onOpenNewVehicleDialog}
                  className="mt-2"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Registrar Nuevo Vehículo{searchTerm ? ` “${searchTerm}”` : ''}
                </Button>
              </div>
            </CommandEmpty>

            <CommandGroup>
              {filteredVehicles.map((vehicle) => {
                const title = `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`;
                return (
                  <CommandItem
                    key={vehicle.id}
                    // Blindaje por si cmdk marca data-disabled por accidente
                    className={cn(
                      "flex items-center gap-3 cursor-pointer",
                      "data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                    )}
                    value={`${vehicle.licensePlate} ${vehicle.make} ${vehicle.model} ${vehicle.ownerName ?? ''}`}
                    onSelect={() => handleSelect(vehicle.id)}
                  >
                    <Car className="h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        Propietario: {vehicle.ownerName || '—'}
                      </p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
