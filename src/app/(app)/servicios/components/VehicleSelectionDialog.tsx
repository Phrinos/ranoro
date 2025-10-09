// src/app/(app)/servicios/components/VehicleSelectionDialog.tsx
"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
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

// Normaliza string (lowercase + quita acentos de forma amplia)
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

  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

  const filtered = useMemo(() => {
    const q = normalize(searchTerm.trim());
    if (!q) return safeVehicles;
    return safeVehicles.filter((v) => {
      if (!v) return false;
      const plate = normalize(v.licensePlate);
      const make = normalize(v.make);
      const model = normalize(v.model);
      const owner = normalize(v.ownerName);
      return plate.includes(q) || make.includes(q) || model.includes(q) || owner.includes(q);
    });
  }, [safeVehicles, searchTerm]);

  useEffect(() => {
    if (open) {
      const tid = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(tid);
    }
  }, [open]);

  const closeAndClear = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) setSearchTerm("");
  };

  const handleSelect = (id: string) => {
    if (!id) return;
    onSelectVehicle(String(id));
    closeAndClear(false);
  };

  return (
    <Dialog open={open} onOpenChange={closeAndClear}>
      <DialogContent className="sm:max-w-[640px] p-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle>Seleccionar Vehículo</DialogTitle>
          <DialogDescription>
            Busca un vehículo existente o crea uno nuevo.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Command
            shouldFilter={false} // filtramos manualmente con 'filtered'
            className={cn(
              "rounded-lg border bg-white",
              "[&_[cmdk-input-wrapper]]:px-3 [&_[cmdk-input-wrapper]]:h-12",
              "[&_[cmdk-input]]:text-sm [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-3"
            )}
          >
            {/* Input FUERA de la lista (estructura recomendada) */}
            <div className="border-b bg-white">
              <CommandInput
                ref={inputRef as any}
                placeholder="Buscar por placa, marca, modelo, propietario…"
                value={searchTerm}
                onValueChange={setSearchTerm}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter" && filtered.length > 0) {
                    e.preventDefault();
                    handleSelect(String(filtered[0].id));
                  }
                }}
              />
            </div>

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
                  const title = `${v.make ?? ""} ${v.model ?? ""} (${v.licensePlate ?? "SN/PLACA"})`.trim();
                  const valueForCmdk = [
                    v.id,
                    v.licensePlate,
                    v.make,
                    v.model,
                    v.ownerName,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <CommandItem
                      key={v.id}
                      value={valueForCmdk}                 // cadena amplia (id + texto)
                      onSelect={() => handleSelect(String(v.id))} // teclado/enter
                      onClick={() => handleSelect(String(v.id))}  // ratón/click
                      className="flex items-center gap-3 cursor-pointer"
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
