
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
import { inventoryService } from "@/lib/services";
import { VehiclePricingCard } from "../../vehiculos/components/VehiclePricingCard";
import type { EngineData } from "@/lib/data/vehicle-database-types";
import { EditEngineDataDialog } from "@/app/(app)/precios/components/EditEngineDataDialog";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { VEHICLE_COLLECTION } from "@/lib/vehicle-constants";


interface VehicleSelectionCardProps {
  vehicles: Vehicle[];
  serviceHistory: ServiceRecord[];
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
  const { toast } = useToast();

  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isEngineEditDialogOpen, setIsEngineEditDialogOpen] = useState(false);

  const selectedVehicleId = watch("vehicleId") as string | undefined;

  useEffect(() => {
    setIsLoadingPrices(true);
    const unsubscribe = inventoryService.onVehicleDataUpdate((data) => {
        setPriceLists(data as any[]);
        setIsLoadingPrices(false);
    });
    return () => unsubscribe();
  }, []);

  const safeVehicles = useMemo(() => Array.isArray(vehicles) ? vehicles : [], [vehicles]);

  const selectedVehicle = useMemo(
    () => safeVehicles.find((v) => v.id === selectedVehicleId),
    [safeVehicles, selectedVehicleId]
  );
  
  const vehicleEngineData = useMemo(() => {
    if (!selectedVehicle || !selectedVehicle.engine || priceLists.length === 0) return null;
    
    const makeData = priceLists.find(pl => pl.make === selectedVehicle.make);
    if (!makeData) return null;
    
    const modelData = makeData.models.find((m: any) => m.name === selectedVehicle.model);
    if (!modelData) return null;
    
    const generationData = modelData.generations.find((g: any) => selectedVehicle.year >= g.startYear && selectedVehicle.year <= g.endYear);
    if (!generationData) return null;
    
    return generationData.engines.find((e: any) => e.name === selectedVehicle.engine) || null;
  }, [selectedVehicle, priceLists]);

  useEffect(() => {
    if (!initialVehicleId) return;
    if (selectedVehicleId) return;

    const preset = safeVehicles.find((v) => v.id === initialVehicleId);
    if (preset) {
      setValue("vehicleId", preset.id, { shouldValidate: false, shouldDirty: true });
      setValue("customerName", preset.ownerName || "", { shouldValidate: false, shouldDirty: true });
      setValue("ownerPhone", preset.ownerPhone || "", { shouldValidate: false, shouldDirty: true });
      setValue("mileage", preset.currentMileage ?? null, { shouldValidate: false, shouldDirty: true });
    }
  }, [initialVehicleId, safeVehicles, selectedVehicleId, setValue]);

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = safeVehicles.find((v) => v.id === vehicleId);
    if (vehicle) {
      setValue("vehicleId", vehicle.id, { shouldValidate: false, shouldDirty: true });
      setValue("customerName", vehicle.ownerName || "", { shouldValidate: false, shouldDirty: true });
      setValue("ownerPhone", vehicle.ownerPhone || "", { shouldValidate: false, shouldDirty: true });
      setValue("mileage", vehicle.currentMileage ?? null, { shouldValidate: false, shouldDirty: true });
    }
    setIsSelectionDialogOpen(false);
  };

  const handleEditVehicle = () => {
    if (selectedVehicle) {
      onOpenNewVehicleDialog(selectedVehicle);
    }
  };
  
  const handleEngineDataSave = async (updatedEngineData: EngineData) => {
    if (!selectedVehicle || !db) return;
    const { make, model, year } = selectedVehicle;

    if (!make) {
        toast({
            title: "Error de Datos",
            description: "La marca del vehículo (make) no está definida. No se puede guardar.",
            variant: "destructive",
        });
        return;
    }

    try {
        const makeData = priceLists.find(pl => pl.make === make);
        if (!makeData) throw new Error("Make data not found in price list.");

        const modelIndex = makeData.models.findIndex((m: any) => m.name === model);
        if (modelIndex === -1) throw new Error("Model data not found.");

        const genIndex = makeData.models[modelIndex].generations.findIndex((g: any) => year >= g.startYear && year <= g.endYear);
        if (genIndex === -1) throw new Error("Generation data not found.");
        
        const engineIndex = makeData.models[modelIndex].generations[genIndex].engines.findIndex((e: any) => e.name === vehicleEngineData?.name);
        if (engineIndex === -1) throw new Error("Engine data not found.");

        const updatedModels = [...makeData.models];
        const updatedGenerations = [...updatedModels[modelIndex].generations];
        const updatedEngines = [...updatedGenerations[genIndex].engines];
        
        updatedEngines[engineIndex] = updatedEngineData;
        updatedGenerations[genIndex] = { ...updatedGenerations[genIndex], engines: updatedEngines };
        updatedModels[modelIndex] = { ...updatedModels[modelIndex], generations: updatedGenerations };
        
        await setDoc(doc(db, VEHICLE_COLLECTION, make), { models: updatedModels }, { merge: true });

        toast({ title: 'Guardado', description: `Se actualizaron los datos para ${updatedEngineData.name}.` });
        setIsEngineEditDialogOpen(false);
    } catch (error) {
        console.error("Error saving engine data:", error);
        toast({ title: "Error", description: "No se pudieron guardar los cambios en la base de datos de precios.", variant: "destructive" });
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
                    <Button type="button" variant="outline" size="sm" onClick={handleEditVehicle} className="bg-white">
                      <Edit className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      type="button"
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
              
              <VehiclePricingCard 
                engineData={vehicleEngineData}
                make={selectedVehicle.make}
                onEdit={() => setIsEngineEditDialogOpen(true)}
              />

            </div>
          ) : (
            <Button
              type="button"
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
          onOpenNewVehicleDialog({ licensePlate: plate });
        }}
      />
      
      {vehicleEngineData && (
          <EditEngineDataDialog
            open={isEngineEditDialogOpen}
            onOpenChange={setIsEngineEditDialogOpen}
            engineData={vehicleEngineData}
            onSave={handleEngineDataSave}
          />
      )}
    </>
  );
}
