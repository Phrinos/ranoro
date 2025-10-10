// src/app/(app)/servicios/components/VehicleSelectionCard.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Car,
  User as UserIcon,
  MessageSquare,
  Edit,
} from "lucide-react";
import { VehicleSelectionDialog } from "./VehicleSelectionDialog";
import type { Vehicle, ServiceRecord } from "@/types";
import type { VehicleFormValues } from "@/app/(app)/vehiculos/components/vehicle-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface VehicleSelectionCardProps {
  vehicles: Vehicle[]; // puede llegar vacío; internamente hacemos fallback
  serviceHistory: ServiceRecord[]; // (no usado aquí, pero se conserva por compatibilidad)
  onOpenNewVehicleDialog: (vehicle?: Partial<Vehicle> | null) => void;
  initialVehicleId?: string;
}

export function VehicleSelectionCard({
  vehicles,
  serviceHistory,
  onOpenNewVehicleDialog,
  initialVehicleId,
}: VehicleSelectionCardProps) {
  const { control, watch, setValue } = useFormContext();

  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);

  const selectedVehicleId = watch("vehicleId") as string | undefined;

  const safeVehicles = useMemo(() => Array.isArray(vehicles) ? vehicles : [], [vehicles]);

  const selectedVehicle = useMemo(
    () => safeVehicles.find((v) => v.id === selectedVehicleId),
    [safeVehicles, selectedVehicleId]
  );

  // Autoselección si viene initialVehicleId
  useEffect(() => {
    if (!initialVehicleId) return;
    if (selectedVehicleId) return;

    const preset = safeVehicles.find((v) => v.id === initialVehicleId);
    if (preset) {
      setValue("vehicleId", preset.id, { shouldValidate: true });
      setValue("customerName", preset.ownerName || "");
      setValue("ownerPhone", preset.ownerPhone || "");
      // Usamos el campo del formulario "mileage"
      setValue("mileage", preset.currentMileage ?? null);
    }
  }, [initialVehicleId, safeVehicles, selectedVehicleId, setValue]);

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = safeVehicles.find((v) => v.id === vehicleId);
    if (vehicle) {
      setValue("vehicleId", vehicle.id, { shouldValidate: false });
      setValue("customerName", vehicle.ownerName || "");
      setValue("ownerPhone", vehicle.ownerPhone || "");
      // Mantener consistencia con el formulario: "mileage"
      setValue("mileage", vehicle.currentMileage ?? null);
    }
    setIsSelectionDialogOpen(false);
  };

  const handleEditVehicle = () => {
    if (selectedVehicle) {
      onOpenNewVehicleDialog(selectedVehicle);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente y Vehículo</CardTitle>
          <CardDescription>
            Selecciona un vehículo existente o registra uno nuevo para el servicio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedVehicle ? (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-lg">
                      {selectedVehicle.make} {selectedVehicle.model}{" "}
                      {selectedVehicle.year}
                    </p>
                    <p className="font-mono text-sm text-muted-foreground">
                      {selectedVehicle.licensePlate}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={handleEditVehicle} className="bg-white">
                      <Edit className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSelectionDialogOpen(true)}
                      className="bg-white"
                    >
                      Cambiar
                    </Button>
                  </div>
                </div>

                <div className="mt-3 text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span>Propietario: {selectedVehicle.ownerName}</span>
                  </div>

                  {(selectedVehicle.ownerPhone || selectedVehicle.chatMetaLink) && (
                    <div className="flex items-center gap-2">
                      {selectedVehicle.ownerPhone && (
                        <>
                          <span className="text-muted-foreground">Teléfono:</span>
                          <span>{selectedVehicle.ownerPhone}</span>
                        </>
                      )}
                      {selectedVehicle.chatMetaLink && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          asChild
                          title="Abrir chat"
                        >
                          <a
                            href={selectedVehicle.chatMetaLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <FormField
                control={control}
                name="mileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilometraje Actual</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ej. 85000"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Guardamos null si está vacío; entero si hay valor
                          field.onChange(val === "" ? null : parseInt(val, 10));
                        }}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="bg-card"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full bg-card"
              onClick={() => setIsSelectionDialogOpen(true)}
            >
              <Car className="mr-2 h-4 w-4" /> Seleccionar Vehículo
            </Button>
          )}
        </CardContent>
      </Card>

      <VehicleSelectionDialog
        open={isSelectionDialogOpen}
        onOpenChange={setIsSelectionDialogOpen}
        vehicles={safeVehicles}
        onSelectVehicle={handleVehicleSelect}
        onNewVehicle={(plate) => {
          setIsSelectionDialogOpen(false);
          onOpenNewVehicleDialog({ licensePlate: plate });
        }}
      />
    </>
  );
}
