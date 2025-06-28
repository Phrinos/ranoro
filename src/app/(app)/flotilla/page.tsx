"use client";

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, ArrowDownAZ } from "lucide-react";
import { VehiclesTable } from "../vehiculos/components/vehicles-table"; // Reusing the same table
import { AddVehicleToFleetDialog } from "./components/add-vehicle-to-fleet-dialog";
import { placeholderVehicles, persistToFirestore, hydrateReady } from "@/lib/placeholder-data";
import type { Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function FlotillaPage() {
  const { toast } = useToast();
  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [isAddVehicleDialogOpen, setIsAddVehicleDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortAZ, setSortAZ] = useState(false);

  useEffect(() => {
    hydrateReady.then(() => setHydrated(true));
  }, []);

  const allVehicles = useMemo(() => {
    if (!hydrated) return [];
    // Create a shallow copy to ensure React detects the change on re-render
    return [...placeholderVehicles];
  }, [version, hydrated]);

  const fleetVehicles = useMemo(() => allVehicles.filter(v => v.isFleetVehicle), [allVehicles]);
  const nonFleetVehicles = useMemo(() => allVehicles.filter(v => !v.isFleetVehicle), [allVehicles]);

  const filteredFleetVehicles = useMemo(() => {
    let vehicles = fleetVehicles;
    if (searchTerm) {
      vehicles = vehicles.filter(vehicle =>
        vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (sortAZ) {
      vehicles = [...vehicles].sort((a, b) => a.licensePlate.localeCompare(b.licensePlate));
    }
    return vehicles;
  }, [fleetVehicles, searchTerm, sortAZ]);

  const handleAddVehicleToFleet = async (vehicleId: string, dailyRentalCost: number) => {
    const vehicleIndex = placeholderVehicles.findIndex(v => v.id === vehicleId);
    if (vehicleIndex === -1) {
      toast({ title: "Error", description: "Vehículo no encontrado.", variant: "destructive" });
      return;
    }
    
    placeholderVehicles[vehicleIndex].isFleetVehicle = true;
    placeholderVehicles[vehicleIndex].dailyRentalCost = dailyRentalCost;

    await persistToFirestore(['vehicles']);
    setVersion(v => v + 1);
    toast({ title: "Vehículo Añadido", description: `${placeholderVehicles[vehicleIndex].licensePlate} ha sido añadido a la flotilla.` });
    setIsAddVehicleDialogOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Flotilla"
        description="Gestiona los vehículos que forman parte de tu flotilla."
        actions={
          <Button onClick={() => setIsAddVehicleDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Vehículo a Flotilla
          </Button>
        }
      />
      
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por placa, marca, modelo o propietario..."
            className="w-full rounded-lg bg-card pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setSortAZ(s => !s)} variant="outline" className="sm:w-auto">
          <ArrowDownAZ className="mr-2 h-4 w-4" />
          Ordenar A-Z {sortAZ && '(Activado)'}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <VehiclesTable vehicles={filteredFleetVehicles} />
      </div>

      <AddVehicleToFleetDialog
        open={isAddVehicleDialogOpen}
        onOpenChange={setIsAddVehicleDialogOpen}
        vehicles={nonFleetVehicles}
        onAddVehicle={handleAddVehicleToFleet}
      />
    </>
  );
}
