
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search } from "lucide-react";
import { VehiclesTable } from "./components/vehicles-table";
import { VehicleDialog } from "./components/vehicle-dialog";
import { placeholderVehicles as allVehicles, placeholderServiceRecords } from "@/lib/placeholder-data";
import type { Vehicle } from "@/types";
import type { VehicleFormValues } from "./components/vehicle-form";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";


export default function VehiculosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => 
    allVehicles.map(v => ({
      ...v,
      serviceHistory: placeholderServiceRecords.filter(s => s.vehicleId === v.id)
    }))
  );
  const { toast } = useToast();
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSaveVehicle = async (data: VehicleFormValues) => {
    const newVehicle: Vehicle = {
      id: vehicles.length > 0 ? Math.max(...vehicles.map(v => v.id)) + 1 : 1, // More robust ID generation
      ...data,
      year: Number(data.year),
      serviceHistory: [],
    };
    const updatedVehicles = [...vehicles, newVehicle];
    setVehicles(updatedVehicles);
    // Also update the main placeholder array if desired (for demo persistence across navigations)
    allVehicles.push({ ...newVehicle, serviceHistory: [] }); // Keep serviceHistory consistent if added to allVehicles

    toast({
      title: "Vehículo Creado",
      description: `El vehículo ${newVehicle.make} ${newVehicle.model} ha sido agregado.`,
    });
    setIsNewVehicleDialogOpen(false);
  };

  const filteredVehicles = useMemo(() => {
    if (!searchTerm) {
      return vehicles;
    }
    return vehicles.filter(vehicle =>
      vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);


  return (
    <>
      <PageHeader
        title="Vehículos"
        description="Administra la información de los vehículos y su historial de servicios."
        actions={
          <VehicleDialog
            open={isNewVehicleDialogOpen}
            onOpenChange={setIsNewVehicleDialogOpen}
            trigger={
              <Button onClick={() => setIsNewVehicleDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Vehículo
              </Button>
            }
            onSave={handleSaveVehicle}
          />
        }
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por placa, marca, modelo o propietario..."
            className="w-full rounded-lg bg-background pl-8 sm:w-[300px] md:w-[400px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <VehiclesTable vehicles={filteredVehicles} />
    </>
  );
}

