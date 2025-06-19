
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Search, CalendarX, AlertTriangle, Archive, ListFilter } from "lucide-react";
import { VehiclesTable } from "./components/vehicles-table";
import { VehicleDialog } from "./components/vehicle-dialog";
import { placeholderVehicles as allVehicles, placeholderServiceRecords } from "@/lib/placeholder-data";
import type { Vehicle } from "@/types";
import type { VehicleFormValues } from "./components/vehicle-form";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { subMonths, parseISO, isBefore, compareAsc, compareDesc } from 'date-fns';

export default function VehiculosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const { toast } = useToast();
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activityFilter, setActivityFilter] = useState("all"); // 'all', 'inactive6', 'inactive12'
  const [sortOption, setSortOption] = useState<string>("date_asc"); // e.g., "date_asc", "date_desc", "plate_asc", "plate_desc"


  useEffect(() => {
    const vehiclesWithLastService = allVehicles.map(v => {
      const history = placeholderServiceRecords.filter(s => s.vehicleId === v.id);
      let lastServiceDate: string | undefined = undefined;
      if (history.length > 0) {
        const sortedHistory = [...history].sort((a, b) => 
          new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
        );
        lastServiceDate = sortedHistory[0].serviceDate; // Format 'yyyy-MM-dd'
      }
      return {
        ...v,
        serviceHistory: history, 
        lastServiceDate: lastServiceDate,
      };
    });
    setVehicles(vehiclesWithLastService);
  }, []);


  const handleSaveVehicle = async (data: VehicleFormValues) => {
    const newVehicleData: Omit<Vehicle, 'id' | 'serviceHistory' | 'lastServiceDate'> = {
      ...data,
      year: Number(data.year),
    };

    const newVehicle: Vehicle = {
      id: vehicles.length > 0 ? Math.max(...vehicles.map(v => v.id)) + 1 : 1,
      ...newVehicleData,
      serviceHistory: [], 
    };

    const updatedVehicles = [...vehicles, newVehicle];
    setVehicles(updatedVehicles);
    allVehicles.push(newVehicle); // Also update the global placeholder for demo consistency

    toast({
      title: "Vehículo Creado",
      description: `El vehículo ${newVehicle.make} ${newVehicle.model} ha sido agregado.`,
    });
    setIsNewVehicleDialogOpen(false);
  };

  const { inactive6MonthsCount, inactive12MonthsCount } = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);
    const twelveMonthsAgo = subMonths(now, 12);
    
    let count6 = 0;
    let count12 = 0;

    vehicles.forEach(v => {
      if (!v.lastServiceDate) { // No service history implies inactivity
        count6++;
        count12++;
      } else {
        const lastService = parseISO(v.lastServiceDate);
        if (isBefore(lastService, sixMonthsAgo)) {
          count6++;
        }
        if (isBefore(lastService, twelveMonthsAgo)) {
          count12++;
        }
      }
    });
    return { inactive6MonthsCount: count6, inactive12MonthsCount: count12 };
  }, [vehicles]);

  const filteredAndSortedVehicles = useMemo(() => {
    let itemsToDisplay = [...vehicles];

    // Filter by search term
    if (searchTerm) {
      itemsToDisplay = itemsToDisplay.filter(vehicle =>
        vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by activity
    if (activityFilter !== "all") {
      const now = new Date();
      const monthsToCompare = activityFilter === 'inactive6' ? 6 : 12;
      const thresholdDate = subMonths(now, monthsToCompare);

      itemsToDisplay = itemsToDisplay.filter(v => {
        if (!v.lastServiceDate) return true; // No service history counts as inactive
        return isBefore(parseISO(v.lastServiceDate), thresholdDate);
      });
    }
    
    // Sorting logic
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
        case 'date_asc': // Más Antiguo (incl. nunca) a Nuevo
          if (dateA === null && dateB !== null) comparison = -1;
          else if (dateA !== null && dateB === null) comparison = 1;
          else if (dateA === null && dateB === null) comparison = 0;
          else comparison = compareAsc(dateA!, dateB!);
          break;
        case 'date_desc': // Más Nuevo a Antiguo (incl. nunca al final)
          if (dateA !== null && dateB === null) comparison = -1;
          else if (dateA === null && dateB !== null) comparison = 1;
          else if (dateA === null && dateB === null) comparison = 0;
          else comparison = compareDesc(dateA!, dateB!);
          break;
        default:
          // Default to date_asc if sortOption is unrecognized
          if (dateA === null && dateB !== null) comparison = -1;
          else if (dateA !== null && dateB === null) comparison = 1;
          else if (dateA === null && dateB === null) comparison = 0;
          else comparison = compareAsc(dateA!, dateB!);
          break;
      }
      return comparison;
    });

    return itemsToDisplay;
  }, [vehicles, searchTerm, activityFilter, sortOption]);

  const handleShowArchived = () => {
    toast({
      title: "Función Próximamente",
      description: "La visualización de vehículos archivados estará disponible en una futura actualización.",
    });
  };


  return (
    <>
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vehículos sin servicio (6+ meses)
            </CardTitle>
            <CalendarX className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{inactive6MonthsCount}</div>
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
            <div className="text-2xl font-bold font-headline">{inactive12MonthsCount}</div>
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleShowArchived}>
              <Archive className="mr-2 h-4 w-4" />
              Ver Archivados
            </Button>
            <Button onClick={() => setIsNewVehicleDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Vehículo
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por placa, marca, modelo o propietario..."
            className="w-full rounded-lg bg-background pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial sm:ml-2">
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
        <Select value={activityFilter} onValueChange={setActivityFilter}>
          <SelectTrigger className="w-full sm:w-auto min-w-[200px] flex-1 sm:flex-initial">
            <SelectValue placeholder="Filtrar por actividad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los vehículos</SelectItem>
            <SelectItem value="inactive6">Sin servicio (6+ meses)</SelectItem>
            <SelectItem value="inactive12">Sin servicio (12+ meses)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <VehiclesTable vehicles={filteredAndSortedVehicles} />

      <VehicleDialog
        open={isNewVehicleDialogOpen}
        onOpenChange={setIsNewVehicleDialogOpen}
        onSave={handleSaveVehicle}
        vehicle={null} 
      />
    </>
  );
}

