// src/app/(app)/flotilla/components/AssignDriverCard.tsx
"use client";

import React, { useState, useMemo } from "react";
import type { Driver, Vehicle } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { personnelService } from "@/lib/services";

interface AssignDriverCardProps {
  vehicle: Vehicle;
  allDrivers: Driver[];
  onAssignmentChange: () => void;
}

export function AssignDriverCard({
  vehicle,
  allDrivers,
  onAssignmentChange,
}: AssignDriverCardProps) {
  const initialSelected =
    vehicle.assignedDriverId != null ? String(vehicle.assignedDriverId) : null;

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(
    initialSelected
  );
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const driverOptions = React.useMemo(() => {
    const collator = new Intl.Collator('es', {
      sensitivity: 'base',
      ignorePunctuation: true,
    });

    return allDrivers
      .filter(d => !d.isArchived)
      .map(d => ({
        id: String(d.id),
        label: d.name || 'Sin nombre',
        assignedVehicle: d.assignedVehicleLicensePlate
          ? `Asignado a ${d.assignedVehicleLicensePlate}`
          : 'Disponible',
      }))
      .sort((a, b) => {
        const aNoName = a.label === 'Sin nombre';
        const bNoName = b.label === 'Sin nombre';
        if (aNoName && bNoName) return 0;
        if (aNoName) return 1;
        if (bNoName) return -1;

        return collator.compare(a.label, b.label);
      });
  }, [allDrivers]);

  const handleAssignDriver = async () => {
    if (String(selectedDriverId ?? "") === String(vehicle.assignedDriverId ?? "")) return;

    setIsSubmitting(true);
    try {
      await personnelService.assignVehicleToDriver(
        vehicle,
        selectedDriverId,
        allDrivers
      );
      toast({
        title: "Asignación Actualizada",
        description: selectedDriverId
          ? `El conductor ha sido asignado.`
          : `El vehículo ahora está disponible.`,
      });
      onAssignmentChange();
    } catch (error) {
      console.error("Failed to assign driver:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la asignación.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setOpen(false);
    }
  };

  const currentDriverName = useMemo(() => {
    return (
      allDrivers.find(
        (d) => String(d.id) === String(vehicle.assignedDriverId)
      )?.name || "Sin Asignar"
    );
  }, [vehicle.assignedDriverId, allDrivers]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Conductor Asignado</CardTitle>
        <CardDescription>
          Asigna o cambia el conductor de este vehículo.
        </CardDescription>
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
                  ? driverOptions.find((d) => d.id === selectedDriverId)?.label ??
                    "Seleccionar conductor..."
                  : "Seleccionar conductor..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="z-50 w-[var(--radix-popover-trigger-width)] p-0 max-h-80 overflow-y-auto"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Command filter={(value, search) => 1}>
                <CommandInput placeholder="Buscar conductor..." />
                <CommandList>
                  <CommandEmpty>No se encontraron conductores activos.</CommandEmpty>

                  <CommandGroup heading="Opciones">
                    <CommandItem
                      value="Sin asignar"
                      className="data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                      onSelect={() => {
                        setSelectedDriverId(null);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedDriverId === null ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Sin asignar
                    </CommandItem>
                  </CommandGroup>

                  <CommandGroup heading="Conductores">
                    {driverOptions.map((opt) => (
                      <CommandItem
                        key={opt.id}
                        value={`${opt.label} ${opt.assignedVehicle}`}
                        className="data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                        onSelect={() => {
                          setSelectedDriverId(opt.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedDriverId === opt.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {opt.assignedVehicle}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <Button
          onClick={handleAssignDriver}
          disabled={
            isSubmitting ||
            String(selectedDriverId ?? "") ===
              String(vehicle.assignedDriverId ?? "")
          }
        >
          {isSubmitting ? "Guardando..." : "Guardar Asignación"}
        </Button>
      </CardContent>
    </Card>
  );
}
