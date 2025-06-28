
"use client";

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, ArrowDownAZ, ShieldCheck } from "lucide-react";
import { VehiclesTable } from "../vehiculos/components/vehicles-table"; // Reusing the same table
import { AddVehicleToFleetDialog } from "./components/add-vehicle-to-fleet-dialog";
import { placeholderVehicles, persistToFirestore, hydrateReady } from "@/lib/placeholder-data";
import type { Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { subDays, isBefore, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const FINE_CHECK_INTERVAL_DAYS = 15;
const FINE_CHECK_STORAGE_KEY = 'fleetFineLastCheckDate';

export default function FlotillaPage() {
  const { toast } = useToast();
  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [isAddVehicleDialogOpen, setIsAddVehicleDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortAZ, setSortAZ] = useState(false);

  // New state for the fines check feature
  const [lastFineCheckDate, setLastFineCheckDate] = useState<Date | null>(null);
  const [checkedVehicles, setCheckedVehicles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    hydrateReady.then(() => setHydrated(true));
    // Load last check date from localStorage
    const savedDateStr = localStorage.getItem(FINE_CHECK_STORAGE_KEY);
    if (savedDateStr) {
      const savedDate = new Date(savedDateStr);
      if (!isNaN(savedDate.getTime())) {
        setLastFineCheckDate(savedDate);
      }
    }
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

  // --- Fines Check Logic ---
  const handleVehicleCheck = (vehicleId: string, isChecked: boolean) => {
    setCheckedVehicles(prev => ({
      ...prev,
      [vehicleId]: isChecked,
    }));
  };

  const isCheckDue = useMemo(() => {
    if (!lastFineCheckDate) return true;
    const dueDate = subDays(new Date(), FINE_CHECK_INTERVAL_DAYS);
    return isBefore(lastFineCheckDate, dueDate);
  }, [lastFineCheckDate]);

  const allVehiclesChecked = useMemo(() => {
    if (fleetVehicles.length === 0) return false;
    return fleetVehicles.every(v => checkedVehicles[v.id]);
  }, [checkedVehicles, fleetVehicles]);

  const handleConfirmFineCheck = () => {
    if (!allVehiclesChecked) {
      toast({ title: "Revisión Incompleta", description: "Debe marcar todos los vehículos como revisados.", variant: "destructive" });
      return;
    }
    const now = new Date();
    localStorage.setItem(FINE_CHECK_STORAGE_KEY, now.toISOString());
    setLastFineCheckDate(now);
    setCheckedVehicles({});
    toast({ title: "Revisión Confirmada", description: "Se ha guardado la fecha de la revisión de multas." });
  };
  
  const lastCheckDateFormatted = lastFineCheckDate ? `Última revisión ${formatDistanceToNow(lastFineCheckDate, { locale: es, addSuffix: true })}` : "Aún no se ha realizado la primera revisión.";


  return (
    <>
      <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/30">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-blue-800 dark:text-blue-300">
                <ShieldCheck className="h-5 w-5" />
                Revisión Quincenal de Multas
              </CardTitle>
              <CardDescription className="mt-2 text-blue-700/80 dark:text-blue-300/80">
                {isCheckDue
                  ? "Se requiere una nueva revisión de multas para la flotilla."
                  : `${lastCheckDateFormatted}.`}
              </CardDescription>
            </div>
            <Button onClick={handleConfirmFineCheck} disabled={!allVehiclesChecked}>
              Confirmar Revisión
            </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 pr-4">
              <div className="space-y-2">
                {fleetVehicles.length > 0 ? fleetVehicles.map(vehicle => (
                  <div key={vehicle.id} className="flex items-center space-x-3 rounded-md p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50">
                    <Checkbox
                      id={`check-${vehicle.id}`}
                      checked={!!checkedVehicles[vehicle.id]}
                      onCheckedChange={(checked) => handleVehicleCheck(vehicle.id, !!checked)}
                    />
                    <label
                      htmlFor={`check-${vehicle.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-grow"
                    >
                      {vehicle.licensePlate} - <span className="text-muted-foreground">{vehicle.make} {vehicle.model}</span>
                    </label>
                  </div>
                )) : (
                   <p className="text-center text-muted-foreground p-4">No hay vehículos en la flotilla para revisar.</p>
                )}
              </div>
          </ScrollArea>
        </CardContent>
      </Card>

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
