// src/app/(app)/servicios/components/VehicleSelectionDialog.tsx
"use client";

import React, { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Car, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@/types";

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
  onOpenNewVehicleDialog,
}: VehicleSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    const q = (searchTerm || "").trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => {
      if (!v) return false;
      const plate = (v.licensePlate || "").toLowerCase();
      const make = (v.make || "").toLowerCase();
      const model = (v.model || "").toLowerCase();
      const owner = (v.ownerName || "").toLowerCase();
      return (
        plate.includes(q) || make.includes(q) || model.includes(q) || owner.includes(q)
      );
    });
  }, [vehicles, searchTerm]);

  const handleSelect = (id: string) => {
    onVehicleSelect(id);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) setSearchTerm("");
      }}
    >
      {/* overflow-hidden para que respete los bordes redondeados, y sin padding exterior raro */}
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle>Seleccionar Vehículo</DialogTitle>
          <DialogDescription>
            Busca un vehículo existente o crea uno nuevo.
          </DialogDescription>
        </DialogHeader>

        {/* Contenedor visual del buscador + lista */}
        <div className="px-6 pb-6">
          {/* Command con estilos “card”: fondo blanco, borde y radios consistentes */}
          <Command
            shouldFilter={false}
            className={cn(
              "rounded-lg border bg-white",
              // afinamos paddings/alturas de cmdk internos
              "[&_[cmdk-input-wrapper]]:px-3 [&_[cmdk-input-wrapper]]:h-12",
              "[&_[cmdk-input]]:text-sm [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-3"
            )}
          >
            {/* Barra de búsqueda sticky para que quede fija al hacer scroll */}
            <div className="sticky top-0 z-10 border-b bg-white">
              <CommandInput
                placeholder="Buscar por placa, marca, modelo, propietario..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
            </div>

            {/* La lista SÍ scrollea; el popover/modal no */}
            <CommandList className="max-h-[52vh] overflow-y-auto">
              <CommandEmpty>
                <div className="text-center p-4">
                  <p>No se encontraron vehículos.</p>
                  <Button
                    variant="link"
                    onClick={onOpenNewVehicleDialog}
                    className="mt-2"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Registrar Nuevo Vehículo
                    {searchTerm ? ` “${searchTerm}”` : ""}
                  </Button>
                </div>
              </CommandEmpty>

              <CommandGroup>
                {filtered.map((v) => {
                  const title = `${v.make} ${v.model} (${v.licensePlate})`;
                  const searchValue = `${v.licensePlate} ${v.make} ${v.model} ${v.ownerName ?? ""}`;
                  return (
                    <CommandItem
                      key={v.id}
                      value={searchValue}
                      onSelect={() => handleSelect(v.id)}
                      // blindaje: aunque cmdk marque disabled por error, seguimos pudiendo clickear
                      className="flex items-center gap-3 data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                    >
                      <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          Propietario: {v.ownerName || "—"}
                        </p>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </DialogContent>
    </Dialog>
  );
}