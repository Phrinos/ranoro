// src/app/(app)/servicios/components/dialogs/vehicle-selector-dialog.tsx
"use client";

import React, { useMemo, useState, useRef } from "react";
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

const normalize = (s?: string) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

interface VehicleSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  onSelectVehicle: (vehicleId: string) => void;
  onNewVehicle: (plate?: string) => void;
}

export function VehicleSelectorDialog({
  open,
  onOpenChange,
  vehicles,
  onSelectVehicle,
  onNewVehicle,
}: VehicleSelectorDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const safeVehicles = useMemo(() => (Array.isArray(vehicles) ? vehicles : []), [vehicles]);

  const filtered = useMemo(() => {
    const q = normalize(searchTerm.trim());
    if (!q) return safeVehicles;
    return safeVehicles.filter((v) => {
      if (!v) return false;
      return (
        normalize(v.licensePlate).includes(q) ||
        normalize(v.make).includes(q) ||
        normalize(v.model).includes(q) ||
        normalize(v.ownerName).includes(q)
      );
    });
  }, [safeVehicles, searchTerm]);

  const handleSelect = (id: string) => {
    onSelectVehicle(id);
    onOpenChange(false);
    setSearchTerm("");
  };

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[640px] p-0 overflow-hidden"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <DialogHeader className="p-6 pb-3">
          <DialogTitle>Seleccionar Vehículo</DialogTitle>
          <DialogDescription>Busca un vehículo existente o crea uno nuevo.</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Command
            shouldFilter={false}
            className={cn(
              "rounded-lg border bg-card",
              "[&_[cmdk-input-wrapper]]:px-3 [&_[cmdk-input-wrapper]]:h-12",
              "[&_[cmdk-input]]:text-sm [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-3"
            )}
          >
            <div className="sticky top-0 z-10 border-b bg-card">
              <CommandInput
                ref={inputRef as any}
                placeholder="Buscar por placa, marca, modelo, propietario…"
                value={searchTerm}
                onValueChange={setSearchTerm}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filtered.length > 0) handleSelect(filtered[0].id);
                    else onNewVehicle(searchTerm || undefined);
                  }
                }}
              />
            </div>

            <CommandList className="max-h-[52vh] overflow-y-auto">
              <CommandEmpty>
                <div className="text-center p-4">
                  <p className="text-muted-foreground">No se encontraron vehículos.</p>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => onNewVehicle(searchTerm || undefined)}
                    className="mt-2"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Registrar "{searchTerm || "Nuevo Vehículo"}"
                  </Button>
                </div>
              </CommandEmpty>

              <CommandGroup>
                {filtered.map((v) => (
                  <CommandItem
                    key={v.id}
                    value={`${v.licensePlate} ${v.make} ${v.model} ${v.ownerName ?? ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(v.id);
                    }}
                    onSelect={() => handleSelect(v.id)}
                    className={cn(
                      "flex items-center gap-3 cursor-pointer select-none",
                      "[&[data-disabled=true]]:pointer-events-auto [&[data-disabled=true]]:opacity-100"
                    )}
                  >
                    <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {v.make} {v.model} ({v.licensePlate})
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {v.ownerName || "Sin propietario"} · {v.year}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </DialogContent>
    </Dialog>
  );
}
