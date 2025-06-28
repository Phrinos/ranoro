
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Search, CalendarX, AlertTriangle, Archive, ListFilter, Filter, Car, Loader2 } from "lucide-react";
import { VehiclesTable } from "./components/vehicles-table";
import { VehicleDialog } from "./components/vehicle-dialog";
import { placeholderVehicles, placeholderServiceRecords, persistToFirestore, hydrateReady } from "@/lib/placeholder-data";
import type { Vehicle } from "@/types";
import type { VehicleFormValues } from "./components/vehicle-form";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { subMonths, parseISO, isBefore, compareAsc, compareDesc, isValid } from 'date-fns';

export default function VehiculosPage() {
  const { toast } = useToast();
  // Using a dummy state `version` to force re-renders when the underlying data source is mutated.
  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [sortOption, setSortOption] = useState<string>("date_asc");
  const [activityCounts, setActivityCounts] = useState({ inactive6MonthsCount: 0, inactive12MonthsCount: 0 });

  useEffect(() => {
    hydrateReady.then(() => setHydrated(true));

    const forceUpdate = () => setVersion(v => v + 1);
    window.addEventListener('databaseUpdated', forceUpdate);

    return () => {
      window.removeEventListener('databaseUpdated', forceUpdate);
    };
  }, []);

  // This useMemo now reads directly from the imported placeholder data.
  // It re-runs whenever `version` changes, ensuring the UI is always in sync.
  const vehiclesWithLastService = useMemo(() => {
    if (!hydrated) return [];
    return placeholderVehicles.map(v => {
      const history = placeholderServiceRecords.filter(s => s.vehicleId === v.id);
      let lastServiceDate: string | undefined = undefined;
      if (history.length > 0) {
        // Sort valid dates to the top, then sort by date descending to find the latest
        const sortedHistory = [...history].sort((a, b) => {
            const dateA = a.serviceDate ? parseISO(a.serviceDate) : null;
            const dateB = b.serviceDate ? parseISO(b.serviceDate) : null;

            const isAValid = dateA && isValid(dateA);
            const isBValid = dateB && isValid(dateB);

            if (isAValid && !isBValid) return -1; // Valid dates first
            if (!isAValid && isBValid) return 1;
            if (!isAValid && !isBValid) return 0; // Both invalid, keep order
            
            return compareDesc(dateA!, dateB!); // Both are valid, sort descending
        });
        
        if (sortedHistory[0]?.serviceDate && isValid(parseISO(sortedHistory[0].serviceDate))) {
          lastServiceDate = sortedHistory[0].serviceDate;
        }
      }
      return {
        ...v,
        serviceHistory: history,
        lastServiceDate: lastServiceDate,
      };
    });
  }, [version, hydrated]);

  const totalVehiclesCount = useMemo(() => vehiclesWithLastService.length, [vehiclesWithLastService]);

  useEffect(() => {
    if (!hydrated) return;
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);
    const twelveMonthsAgo = subMonths(now, 12);
    
    let count6 = 0;
    let count12 = 0;

    vehiclesWithLastService.forEach(v => {
      if (!v.lastServiceDate) {
        count6++;
        count12++;
      } else {
        const lastService = parseISO(v.lastServiceDate);
        if (!isValid(lastService)) return; // Skip invalid dates
        if (isBefore(lastService, sixMonthsAgo)) {
          count6++;
        }
        if (isBefore(lastService, twelveMonthsAgo)) {
          count12++;
        }
      }
    });
    setActivityCounts({ inactive6MonthsCount: count6, inactive12MonthsCount: count12 });
  }, [vehiclesWithLastService, hydrated]);


  const handleSaveVehicle = async (data: VehicleFormValues) => {
    const newVehicleData: Omit<Vehicle, 'id' | 'serviceHistory' | 'lastServiceDate'> = {
      ...data,
      year: Number(data.year),
    };

    const newVehicle: Vehicle = {
      id: `VEH_${Date.now().toString(36)}`,
      ...newVehicleData,
      serviceHistory: [],
    };

    placeholderVehicles.push(newVehicle); // Mutate the source
    await persistToFirestore(['vehicles']); // This will trigger the 'databaseUpdated' event
    
    toast({
      title: "Vehículo Creado",
      description: `El vehículo ${newVehicle.make} ${newVehicle.model} ha sido agregado.`,
    });
    setIsNewVehicleDialogOpen(false);
  };

  const filteredAndSortedVehicles = useMemo(() => {
    let itemsToDisplay = [...vehiclesWithLastService];

    if (searchTerm) {
      itemsToDisplay = itemsToDisplay.filter(vehicle =>
        vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (activityFilter !== "all") {
      const now = new Date();
      const monthsToCompare = activityFilter === 'inactive6' ? 6 : 12;
      const thresholdDate = subMonths(now, monthsToCompare);

      itemsToDisplay = itemsToDisplay.filter(v => {
        if (!v.lastServiceDate) return true;
        const lastServiceDate = parseISO(v.lastServiceDate);
        if(!isValid(lastServiceDate)) return false;
        return isBefore(lastServiceDate, thresholdDate);
      });
    }
    
    itemsToDisplay.sort((a, b) => {
      let comparison = 0;
      const dateA = a.lastServiceDate ? parseISO(a.lastServiceDate) : null;
      const dateB = b.lastServiceDate ? parseISO(b.lastServiceDate) : null;

      switch (sortOption) {
        case 'plate_asc':
          comparison = a.licensePlate.localeCompare(b.licensePlate);
          break;
        case 'plate_desc':
          comparison = b.licensePlate.localeCompare(a.licensePlate);
          break;
        case 'date_asc': 
          if (dateA === null && dateB !== null) comparison = -1;
          else if (dateA !== null && dateB === null) comparison = 1;
          else if (dateA === null && dateB === null) comparison = 0;
          else if (isValid(dateA) && isValid(dateB)) comparison = compareAsc(dateA, dateB);
          break;
        case 'date_desc': 
          if (dateA !== null && dateB === null) comparison = -1;
          else if (dateA === null && dateB !== null) comparison = 1;
          else if (dateA === null && dateB === null) comparison = 0;
          else if (isValid(dateA) && isValid(dateB)) comparison = compareDesc(dateA, dateB);
          break;
        default:
          if (dateA === null && dateB !== null) comparison = -1;
          else if (dateA !== null && dateB === null) comparison = 1;
          else if (dateA === null && dateB === null) comparison = 0;
          else if (isValid(dateA) && isValid(dateB)) comparison = compareAsc(dateA, dateB);
          break;
      }
      return comparison;
    });

    return itemsToDisplay;
  }, [vehiclesWithLastService, searchTerm, activityFilter, sortOption]);

  const handleShowArchived = () => {
    toast({
      title: "Función Próximamente",
      description: "La visualización de vehículos archivados estará disponible en una futura actualización.",
    });
  };

  if (!hydrated) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-lg ml-4">Cargando vehículos...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Vehículos Registrados
            </CardTitle>
            <Car className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{totalVehiclesCount}</div>
            <p className="text-xs text-muted-foreground">
              Total de vehículos en el sistema.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vehículos sin servicio (6+ meses)
            </CardTitle>
            <CalendarX className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{activityCounts.inactive6MonthsCount}</div>
            <p className="text-xs text-muted-foreground">
              Potencialmente necesitan seguimiento.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vehículos sin servicio (12+ meses)
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{activityCounts.inactive12MonthsCount}</div>
            <p className="text-xs text-muted-foreground">
              Considerar contactar para mantenimiento.
            </p>
          </CardContent>
        </Card>
      </div>

      <PageHeader
        title="Vehículos"
        description="Administra la información de los vehículos y su historial de servicios."
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={handleShowArchived} className="w-full sm:w-auto">
              <Archive className="mr-2 h-4 w-4" />
              Ver Archivados
            </Button>
            <Button onClick={() => setIsNewVehicleDialogOpen(true)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Vehículo
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
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
            <Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial bg-card">
              <ListFilter className="mr-2 h-4 w-4" />
              Ordenar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sortOption} onValueChange={setSortOption}>
              <DropdownMenuRadioItem value="date_asc">Últ. Servicio (Antiguo a Nuevo)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="date_desc">Últ. Servicio (Nuevo a Antiguo)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="plate_asc">Placa (A-Z)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="plate_desc">Placa (Z-A)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[180px] flex-1 sm:flex-initial bg-card">
              <Filter className="mr-2 h-4 w-4" /> 
              Filtrar Actividad
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filtrar por Actividad</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={activityFilter} onValueChange={setActivityFilter}>
              <DropdownMenuRadioItem value="all">Todos los vehículos</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="inactive6">Sin servicio (6+ meses)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="inactive12">Sin servicio (12+ meses)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="overflow-x-auto">
        <VehiclesTable vehicles={filteredAndSortedVehicles} />
      </div>

      <VehicleDialog
        open={isNewVehicleDialogOpen}
        onOpenChange={setIsNewVehicleDialogOpen}
        onSave={handleSaveVehicle}
        vehicle={null} 
      />
    </>
  );
}
