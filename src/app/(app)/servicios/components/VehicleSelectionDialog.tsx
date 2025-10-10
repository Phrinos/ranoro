// src/app/(app)/servicios/components/VehicleSelectionDialog.tsx
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

interface VehicleSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  onSelectVehicle: (vehicleId: string) => void;
  onNewVehicle: (plate?: string) => void;
}

// Normaliza (lowercase + quita acentos, compatible en todos los navegadores)
const normalize = (s?: string) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function VehicleSelectionDialog({
  open,
  onOpenChange,
  vehicles,
  onSelectVehicle,
  onNewVehicle,
}: VehicleSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const safeVehicles = useMemo(() => (Array.isArray(vehicles) ? vehicles : []), [vehicles]);

  const filtered = useMemo(() => {
    const q = normalize(searchTerm.trim());
    if (!q) return safeVehicles;
    return safeVehicles.filter((v) => {
      if (!v) return false;
      const plate = normalize(v.licensePlate);
      const make = normalize(v.make);
      const model = normalize(v.model);
      const owner = normalize(v.ownerName);
      return (
        plate.includes(q) || make.includes(q) || model.includes(q) || owner.includes(q)
      );
    });
  }, [safeVehicles, searchTerm]);

  const handleSelect = (id: string) => {
    onSelectVehicle(id);
    onOpenChange(false);
  };

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[640px] p-0 overflow-hidden"
        // 👇 Forzamos foco al input cuando abre el diálogo
        onOpenAutoFocus={(e) => {
          e.preventDefault(); // evita que Radix mueva el foco a otro lado
          // pequeño delay por si el portal todavía está montando
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <DialogHeader className="p-6 pb-3">
          <DialogTitle>Seleccionar Vehículo</DialogTitle>
          <DialogDescription>
            Busca un vehículo existente o crea uno nuevo.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Command
            shouldFilter={false}
            className={cn(
              "rounded-lg border bg-white",
              "[&_[cmdk-input-wrapper]]:px-3 [&_[cmdk-input-wrapper]]:h-12",
              "[&_[cmdk-input]]:text-sm [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-3"
            )}
          >
            {/* Barra de búsqueda */}
            <div className="sticky top-0 z-10 border-b bg-white">
              <CommandInput
                ref={inputRef as any}
                placeholder="Buscar por placa, marca, modelo, propietario…"
                value={searchTerm}
                onValueChange={setSearchTerm}
                // Enter: selecciona el primer resultado, o crea nuevo si no hay
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filtered.length > 0) {
                      handleSelect(filtered[0].id);
                    } else {
                      onNewVehicle(searchTerm || undefined);
                    }
                  }
                }}
              />
            </div>

            {/* Lista scrolleable */}
            <CommandList className="max-h-[52vh] overflow-y-auto">
              <CommandEmpty>
                <div className="text-center p-4">
                  <p>No se encontraron vehículos.</p>
                  <Button
                    variant="link"
                    onClick={() => onNewVehicle(searchTerm || undefined)}
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
                      onSelect={() => handleSelect(v.id)} // teclado/enter de cmdk
                      onClick={() => handleSelect(v.id)}   // ratón/click directo
                      className="flex items-center gap-3 data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto cursor-pointer"
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

          {/* Acción rápida: crear nuevo desde el buscador con Enter si no hay resultados */}
          {filtered.length === 0 && (
            <div className="sr-only" aria-live="polite">
              No hay resultados
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
