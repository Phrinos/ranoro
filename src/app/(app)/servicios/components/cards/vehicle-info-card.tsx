// src/app/(app)/servicios/components/cards/vehicle-info-card.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Car, User as UserIcon, MessageSquare, Edit, ChevronDown } from "lucide-react";
import type { Vehicle, ServiceRecord } from "@/types";
import { VehicleSelectorDialog } from "../dialogs/vehicle-selector-dialog";

interface VehicleInfoCardProps {
  vehicles: Vehicle[];
  serviceHistory?: ServiceRecord[];
  onEditVehicle?: (vehicle: Vehicle) => void;
  initialVehicleId?: string;
}

export function VehicleInfoCard({
  vehicles,
  serviceHistory = [],
  onEditVehicle,
  initialVehicleId,
}: VehicleInfoCardProps) {
  const { watch, setValue, getValues } = useFormContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedVehicleId = watch("vehicleId") as string | undefined;

  // Pre-fill from initialVehicleId when no vehicle is selected yet
  useEffect(() => {
    if (!initialVehicleId || selectedVehicleId) return;
    const preset = vehicles.find((v) => v.id === initialVehicleId);
    if (preset) {
      setValue("vehicleId", preset.id, { shouldValidate: false, shouldDirty: true });
      setValue("customerName", preset.ownerName ?? "", { shouldValidate: false, shouldDirty: true });
      if (!getValues("mileage")) {
        setValue("mileage", preset.currentMileage ?? null, { shouldValidate: false });
      }
    }
  }, [initialVehicleId, vehicles, selectedVehicleId, setValue, getValues]);

  const safeVehicles = useMemo(() => (Array.isArray(vehicles) ? vehicles : []), [vehicles]);
  const selectedVehicle = useMemo(
    () => safeVehicles.find((v) => v.id === selectedVehicleId),
    [safeVehicles, selectedVehicleId]
  );

  const handleSelect = (vehicleId: string) => {
    const v = safeVehicles.find((veh) => veh.id === vehicleId);
    if (!v) return;
    setValue("vehicleId", v.id, { shouldValidate: true, shouldDirty: true });
    setValue("customerName", v.ownerName ?? "", { shouldValidate: true, shouldDirty: true });
    if (!getValues("mileage")) {
      setValue("mileage", v.currentMileage ?? null, { shouldValidate: false });
    }
    setDialogOpen(false);
  };

  const waUrl = selectedVehicle
    ? selectedVehicle.chatMetaLink ||
      `https://wa.me/52${(selectedVehicle.ownerPhone ?? "").replace(/\D/g, "")}`
    : "#";

  return (
    <>
      {selectedVehicle ? (
        <div className="flex flex-col gap-1 h-full justify-center">
          {/* Top row: label + quick actions */}
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Datos del Vehículo
            </span>
            <div className="flex gap-0.5">
              {onEditVehicle && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onEditVehicle(selectedVehicle)}
                  title="Editar vehículo"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setDialogOpen(true)}
                title="Cambiar vehículo"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Plate — Make Model Year */}
          <p className="font-mono text-2xl font-extrabold uppercase tracking-widest text-primary leading-tight mt-1">
            {selectedVehicle.licensePlate}
            <span className="ml-3 font-sans text-lg font-semibold text-foreground/80 tracking-normal normal-case">
              — {selectedVehicle.make} {selectedVehicle.model}{" "}
              {selectedVehicle.year}
            </span>
          </p>

          {/* Owner + Phone + WA */}
          <div className="flex items-center gap-2 mt-2">
            <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-base font-semibold text-foreground/90 truncate">
              {selectedVehicle.ownerName || "Sin propietario"}
            </span>
            {selectedVehicle.ownerPhone && (
              <>
                <span className="text-sm text-muted-foreground shrink-0">
                  {selectedVehicle.ownerPhone}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 text-green-600 border-green-600/30 hover:bg-green-50"
                  asChild
                  title="Enviar por WhatsApp"
                >
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Enviar WA
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2 border-2 border-dashed rounded-xl p-4 cursor-pointer hover:border-primary/60 transition-colors"
          onClick={() => setDialogOpen(true)}
        >
          <Car className="h-8 w-8 text-muted-foreground/40" />
          <Button type="button" variant="default" size="sm" className="shadow-xs">
            <Car className="mr-2 h-4 w-4" /> Seleccionar Vehículo
          </Button>
          <p className="text-xs text-muted-foreground">Haz clic para buscar un vehículo</p>
        </div>
      )}

      <VehicleSelectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicles={safeVehicles}
        onSelectVehicle={handleSelect}
        onNewVehicle={(plate) => {
          // Caller handles new vehicle dialog since we need full vehicle creation flow
          setDialogOpen(false);
          if (onEditVehicle) onEditVehicle({ licensePlate: plate } as any);
        }}
      />
    </>
  );
}
