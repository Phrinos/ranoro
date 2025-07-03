
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, ListFilter, ShieldCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from 'next/navigation';
import { AddVehicleToFleetDialog } from "./components/add-vehicle-to-fleet-dialog";
import { FineCheckDialog } from "./components/fine-check-dialog";
import { placeholderVehicles, persistToFirestore, hydrateReady, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import type { User, Vehicle } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { subDays, isBefore, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const FINE_CHECK_INTERVAL_DAYS = 15;
const FINE_CHECK_STORAGE_KEY = 'fleetFineLastCheckDate';

type FlotillaSortOption = 
  | "plate_asc" | "plate_desc"
  | "owner_asc" | "owner_desc"
  | "rent_asc" | "rent_desc";

export default function FlotillaPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [isAddVehicleDialogOpen, setIsAddVehicleDialogOpen] = useState(false);
  const [isFineCheckDialogOpen, setIsFineCheckDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<FlotillaSortOption>("plate_asc");

  const [lastFineCheckDate, setLastFineCheckDate] = useState<Date | null>(null);

  useEffect(() => {
    hydrateReady.then(() => setHydrated(true));
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
    return [...placeholderVehicles];
  }, [hydrated]);

  const fleetVehicles = useMemo(() => allVehicles.filter(v => v.isFleetVehicle), [allVehicles]);
  const nonFleetVehicles = useMemo(() => allVehicles.filter(v => !v.isFleetVehicle), [allVehicles]);

  const filteredFleetVehicles = useMemo(() => {
    let vehicles = [...fleetVehicles];
    if (searchTerm) {
      vehicles = vehicles.filter(vehicle =>
        vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    vehicles.sort((a, b) => {
      switch(sortOption) {
        case 'plate_desc':
          return b.licensePlate.localeCompare(a.licensePlate);
        case 'owner_asc':
          return a.ownerName.localeCompare(b.ownerName);
        case 'owner_desc':
          return b.ownerName.localeCompare(a.ownerName);
        case 'rent_asc':
          return (a.dailyRentalCost || 0) - (b.dailyRentalCost || 0);
        case 'rent_desc':
          return (b.dailyRentalCost || 0) - (a.dailyRentalCost || 0);
        case 'plate_asc':
        default:
          return a.licensePlate.localeCompare(b.licensePlate);
      }
    });

    return vehicles;
  }, [fleetVehicles, searchTerm, sortOption]);

  const handleAddVehicleToFleet = async (vehicleId: string, costs: { 
      dailyRentalCost: number;
      gpsMonthlyCost: number;
      adminMonthlyCost: number;
      insuranceMonthlyCost: number;
  }) => {
    const vehicleIndex = placeholderVehicles.findIndex(v => v.id === vehicleId);
    if (vehicleIndex === -1) {
      toast({ title: "Error", description: "Vehículo no encontrado.", variant: "destructive" });
      return;
    }
    
    placeholderVehicles[vehicleIndex].isFleetVehicle = true;
    placeholderVehicles[vehicleIndex].dailyRentalCost = costs.dailyRentalCost;
    placeholderVehicles[vehicleIndex].gpsMonthlyCost = costs.gpsMonthlyCost;
    placeholderVehicles[vehicleIndex].adminMonthlyCost = costs.adminMonthlyCost;
    placeholderVehicles[vehicleIndex].insuranceMonthlyCost = costs.insuranceMonthlyCost;

    await persistToFirestore(['vehicles']);
    setVersion(v => v + 1);
    toast({ title: "Vehículo Añadido", description: `${placeholderVehicles[vehicleIndex].licensePlate} ha sido añadido a la flotilla.` });
    setIsAddVehicleDialogOpen(false);
  };

  const handleConfirmFineCheck = useCallback(async (checkedVehicleIds: string[]) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (!authUserString) {
      toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
      return;
    }
    const currentUser: User = JSON.parse(authUserString);
    const now = new Date();
    
    checkedVehicleIds.forEach(id => {
      const vehicleIndex = placeholderVehicles.findIndex(v => v.id === id);
      if (vehicleIndex > -1) {
        const vehicle = placeholderVehicles[vehicleIndex];
        if (!vehicle.fineCheckHistory) {
          vehicle.fineCheckHistory = [];
        }
        vehicle.fineCheckHistory.push({
          date: now.toISOString(),
          checkedBy: currentUser.name,
          checkedById: currentUser.id,
        });
      }
    });

    localStorage.setItem(FINE_CHECK_STORAGE_KEY, now.toISOString());
    setLastFineCheckDate(now);
    
    await persistToFirestore(['vehicles']);
    setVersion(v => v + 1);
    setIsFineCheckDialogOpen(false);
    toast({ title: "Revisión Confirmada", description: "Se ha guardado el historial de revisión de multas." });

  }, [toast]);


  const isCheckDue = useMemo(() => {
    if (!lastFineCheckDate) return true;
    const dueDate = subDays(new Date(), FINE_CHECK_INTERVAL_DAYS);
    return isBefore(lastFineCheckDate, dueDate);
  }, [lastFineCheckDate]);
  
  return (
    <>
      <PageHeader
        title="Flotilla"
        description="Gestiona los vehículos que forman parte de tu flotilla."
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant={isCheckDue ? "destructive" : "secondary"} onClick={() => setIsFineCheckDialogOpen(true)}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Revisar Multas
            </Button>
            <Button onClick={() => setIsAddVehicleDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Vehículo
            </Button>
          </div>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="sm:w-auto bg-white">
              <ListFilter className="mr-2 h-4 w-4" />
              Organizar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as FlotillaSortOption)}>
              <DropdownMenuRadioItem value="plate_asc">Placa (A-Z)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="plate_desc">Placa (Z-A)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="owner_asc">Propietario (A-Z)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="owner_desc">Propietario (Z-A)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="rent_desc">Renta (Mayor a Menor)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="rent_asc">Renta (Menor a Mayor)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader className="bg-black">
            <TableRow>
              <TableHead className="text-white">Placa</TableHead>
              <TableHead className="text-white">Vehículo</TableHead>
              <TableHead className="text-white">Color</TableHead>
              <TableHead className="text-white">Propietario</TableHead>
              <TableHead className="text-right text-white">Renta Diaria</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFleetVehicles.length > 0 ? filteredFleetVehicles.map(vehicle => (
              <TableRow key={vehicle.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/flotilla/${vehicle.id}`)}>
                <TableCell className="font-medium">{vehicle.licensePlate}</TableCell>
                <TableCell>{vehicle.make} {vehicle.model} {vehicle.year}</TableCell>
                <TableCell>{vehicle.color || 'N/A'}</TableCell>
                <TableCell>{vehicle.ownerName}</TableCell>
                <TableCell className="text-right font-semibold">${(vehicle.dailyRentalCost || 0).toFixed(2)}</TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay vehículos en la flotilla.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AddVehicleToFleetDialog
        open={isAddVehicleDialogOpen}
        onOpenChange={setIsAddVehicleDialogOpen}
        vehicles={nonFleetVehicles}
        onAddVehicle={handleAddVehicleToFleet}
      />
      
      <FineCheckDialog
        open={isFineCheckDialogOpen}
        onOpenChange={setIsFineCheckDialogOpen}
        fleetVehicles={fleetVehicles}
        onConfirm={handleConfirmFineCheck}
      />
    </>
  );
}
