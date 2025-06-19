
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, DollarSign, TrendingUp, Car as CarIcon, Wrench as WrenchIcon } from "lucide-react"; // Renamed CalendarIcon to avoid conflict
import { ServicesTable } from "../components/services-table"; 
import { ServiceDialog } from "../components/service-dialog"; 
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, InventoryItem } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";

type ServiceSortOption = 
  | "serviceDate_desc" | "serviceDate_asc"
  | "deliveryDate_desc" | "deliveryDate_asc"
  | "plate_asc" | "plate_desc"
  | "price_desc" | "price_asc"
  | "status_asc" | "status_desc";

export default function HistorialServiciosPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [allServices, setAllServices] = useState<ServiceRecord[]>(placeholderServiceRecords);
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles); 
  const [technicians, setTechniciansState] = useState<Technician[]>(placeholderTechnicians);
  const [inventoryItems, setInventoryItemsState] = useState<InventoryItem[]>(placeholderInventory);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOption, setSortOption] = useState<ServiceSortOption>("serviceDate_desc");

  useEffect(() => {
    setAllServices(placeholderServiceRecords);
    setVehicles(placeholderVehicles);
    setTechniciansState(placeholderTechnicians);
    setInventoryItemsState(placeholderInventory);
  }, []);

  const filteredAndSortedServices = useMemo(() => {
    let filtered = [...allServices];

    // Filter by Date Range
    if (dateRange?.from) {
      filtered = filtered.filter(service => {
        const serviceDate = parseISO(service.serviceDate);
        if (!isValid(serviceDate)) return false;
        const from = startOfDay(dateRange.from!);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
        return isWithinInterval(serviceDate, { start: from, end: to });
      });
    }

    // Filter by Search Term
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(service => {
        const vehicle = vehicles.find(v => v.id === service.vehicleId);
        const technician = technicians.find(t => t.id === service.technicianId);
        return (
          service.id.toLowerCase().includes(lowerSearchTerm) ||
          (vehicle && (
            vehicle.licensePlate.toLowerCase().includes(lowerSearchTerm) ||
            vehicle.make.toLowerCase().includes(lowerSearchTerm) ||
            vehicle.model.toLowerCase().includes(lowerSearchTerm) ||
            vehicle.ownerName.toLowerCase().includes(lowerSearchTerm)
          )) ||
          (technician && technician.name.toLowerCase().includes(lowerSearchTerm)) ||
          service.description.toLowerCase().includes(lowerSearchTerm)
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      const vehicleA = vehicles.find(v => v.id === a.vehicleId);
      const vehicleB = vehicles.find(v => v.id === b.vehicleId);

      switch (sortOption) {
        case "serviceDate_asc": return compareAsc(parseISO(a.serviceDate), parseISO(b.serviceDate));
        case "serviceDate_desc": return compareDesc(parseISO(a.serviceDate), parseISO(b.serviceDate));
        case "deliveryDate_asc":
          if (!a.deliveryDateTime) return 1; if (!b.deliveryDateTime) return -1;
          return compareAsc(parseISO(a.deliveryDateTime), parseISO(b.deliveryDateTime));
        case "deliveryDate_desc":
          if (!a.deliveryDateTime) return 1; if (!b.deliveryDateTime) return -1;
          return compareDesc(parseISO(a.deliveryDateTime), parseISO(b.deliveryDateTime));
        case "plate_asc": return (vehicleA?.licensePlate || '').localeCompare(vehicleB?.licensePlate || '');
        case "plate_desc": return (vehicleB?.licensePlate || '').localeCompare(vehicleA?.licensePlate || '');
        case "price_asc": return a.totalCost - b.totalCost;
        case "price_desc": return b.totalCost - a.totalCost;
        case "status_asc": return a.status.localeCompare(b.status);
        case "status_desc": return b.status.localeCompare(a.status);
        default: return compareDesc(parseISO(a.serviceDate), parseISO(b.serviceDate));
      }
    });
    return filtered;
  }, [allServices, vehicles, technicians, searchTerm, dateRange, sortOption]);

  const summaryData = useMemo(() => {
    const totalServices = filteredAndSortedServices.length;
    const totalRevenue = filteredAndSortedServices.reduce((sum, s) => sum + s.totalCost, 0);
    const totalProfit = filteredAndSortedServices.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);

    let mostCommonVehicle = "N/A";
    if (totalServices > 0) {
      const vehicleCounts: Record<string, number> = {};
      filteredAndSortedServices.forEach(service => {
        const vehicle = vehicles.find(v => v.id === service.vehicleId);
        if (vehicle) {
          const key = `${vehicle.make} ${vehicle.model}`;
          vehicleCounts[key] = (vehicleCounts[key] || 0) + 1;
        }
      });
      let maxCount = 0;
      for (const vehicleKey in vehicleCounts) {
        if (vehicleCounts[vehicleKey] > maxCount) {
          maxCount = vehicleCounts[vehicleKey];
          mostCommonVehicle = vehicleKey;
        }
      }
    }
    return { totalServices, totalRevenue, totalProfit, mostCommonVehicle };
  }, [filteredAndSortedServices, vehicles]);

  const handleUpdateService = (updatedService: ServiceRecord) => {
    setAllServices(prevServices => 
        prevServices.map(s => s.id === updatedService.id ? updatedService : s)
    );
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === updatedService.id);
    if (pIndex !== -1) {
        placeholderServiceRecords[pIndex] = updatedService;
    }
    toast({
      title: "Servicio Actualizado",
      description: `El servicio ${updatedService.id} ha sido actualizado.`,
    });
  };

  const handleDeleteService = (serviceId: string) => {
    const serviceToDelete = allServices.find(s => s.id === serviceId);
    setAllServices(prevServices => prevServices.filter(s => s.id !== serviceId));
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (pIndex !== -1) {
        placeholderServiceRecords.splice(pIndex, 1);
    }
    toast({
      title: "Servicio Eliminado",
      description: `El servicio con ID ${serviceId} (${serviceToDelete?.description}) ha sido eliminado.`,
    });
  };
  
  const handleVehicleCreated = (newVehicle: Vehicle) => {
    setVehicles(prev => {
      if(prev.find(v=> v.id === newVehicle.id)) return prev;
      const updatedVehicles = [...prev, newVehicle];
      placeholderVehicles.push(newVehicle);
      return updatedVehicles;
    });
  };


  return (
    <>
      <PageHeader
        title="Historial de Servicios"
        description="Consulta, filtra y ordena todas las órdenes de servicio registradas."
      />

      <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Servicios</CardTitle>
            <WrenchIcon className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{summaryData.totalServices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">${summaryData.totalRevenue.toLocaleString('es-ES')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ganancia Total</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">${summaryData.totalProfit.toLocaleString('es-ES')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vehículo Más Común</CardTitle>
            <CarIcon className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-headline truncate" title={summaryData.mostCommonVehicle}>{summaryData.mostCommonVehicle}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar servicios..."
            className="w-full rounded-lg bg-background pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "min-w-[240px] justify-start text-left font-normal flex-1 sm:flex-initial",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarDateIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                    {format(dateRange.to, "LLL dd, y", { locale: es })}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y", { locale: es })
                )
              ) : (
                <span>Seleccione rango de fechas</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={es}
            />
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial">
              <ListFilter className="mr-2 h-4 w-4" />
              Ordenar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as ServiceSortOption)}>
              <DropdownMenuRadioItem value="serviceDate_desc">Fecha Servicio (Más Reciente)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="serviceDate_asc">Fecha Servicio (Más Antiguo)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="deliveryDate_desc">Fecha Entrega (Más Reciente)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="deliveryDate_asc">Fecha Entrega (Más Antiguo)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="plate_asc">Placas (A-Z)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="plate_desc">Placas (Z-A)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price_desc">Precio Total (Mayor a Menor)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price_asc">Precio Total (Menor a Mayor)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="status_asc">Estado (A-Z)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="status_desc">Estado (Z-A)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ServicesTable 
        services={filteredAndSortedServices} 
        vehicles={vehicles}
        technicians={technicians}
        inventoryItems={inventoryItems}
        onServiceUpdated={handleUpdateService}
        onServiceDeleted={handleDeleteService}
        onVehicleCreated={handleVehicleCreated}
        isHistoryView={true}
      />
    </>
  );
}
