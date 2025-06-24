
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, DollarSign, TrendingUp, Car as CarIcon, Wrench as WrenchIcon, PlusCircle, Printer, MessageSquare } from "lucide-react";
import { ServicesTable } from "../components/services-table"; 
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory, persistToFirestore, enrichServiceForPrinting } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, WorkshopInfo } from "@/types";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ServiceSheetContent } from '../components/service-sheet-content';

type ServiceSortOption = 
  | "serviceDate_desc" | "serviceDate_asc"
  | "deliveryDate_desc" | "deliveryDate_asc"
  | "plate_asc" | "plate_desc"
  | "price_desc" | "price_asc"
  | "status_asc" | "status_desc";

export default function HistorialServiciosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const ticketContentRef = useRef<HTMLDivElement>(null);
  
  const [allServices, setAllServices] = useState<ServiceRecord[]>(placeholderServiceRecords);
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles); 
  const [technicians, setTechniciansState] = useState<Technician[]>(placeholderTechnicians);
  const [inventoryItems, setInventoryItemsState] = useState<InventoryItem[]>(placeholderInventory);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOption, setSortOption] = useState<ServiceSortOption>("serviceDate_desc");

  const [showPrintTicketDialog, setShowPrintTicketDialog] = useState(false);
  const [currentServiceForTicket, setCurrentServiceForTicket] = useState<ServiceRecord | null>(null);
  const [currentVehicleForTicket, setCurrentVehicleForTicket] = useState<Vehicle | null>(null);
  const [currentTechnicianForTicket, setCurrentTechnicianForTicket] = useState<Technician | null>(null);
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [serviceForSheet, setServiceForSheet] = useState<ServiceRecord | null>(null);


  useEffect(() => {
    setAllServices(placeholderServiceRecords);
    setVehicles(placeholderVehicles);
    setTechniciansState(placeholderTechnicians);
    setInventoryItemsState(placeholderInventory);
  }, []);

  const filteredAndSortedServices = useMemo(() => {
    let filtered = [...allServices];

    if (dateRange?.from) {
      filtered = filtered.filter(service => {
        const serviceDate = parseISO(service.serviceDate);
        if (!isValid(serviceDate)) return false;
        const from = startOfDay(dateRange.from!);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
        return isWithinInterval(serviceDate, { start: from, end: to });
      });
    }

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

    filtered.sort((a, b) => {
      const vehicleA = vehicles.find(v => v.id === a.vehicleId);
      const vehicleB = vehicles.find(v => v.id === b.vehicleId);

      switch (sortOption) {
        case "serviceDate_asc": 
          return compareAsc(parseISO(a.serviceDate), parseISO(b.serviceDate));
        case "serviceDate_desc": {
          const statusOrder = { "Agendado": 1, "Reparando": 2, "Completado": 3, "Cancelado": 3 };
          const statusAVal = statusOrder[a.status as keyof typeof statusOrder] || 4;
          const statusBVal = statusOrder[b.status as keyof typeof statusOrder] || 4;

          if (statusAVal !== statusBVal) {
            return statusAVal - statusBVal;
          }
          const dateComparison = compareDesc(parseISO(a.serviceDate), parseISO(b.serviceDate));
          if (dateComparison !== 0) return dateComparison;
          return a.id.localeCompare(b.id); 
        }
        case "deliveryDate_asc":
          if (!a.deliveryDateTime) return 1; if (!b.deliveryDateTime) return -1;
          return compareAsc(parseISO(a.deliveryDateTime), parseISO(b.deliveryDateTime));
        case "deliveryDate_desc":
          if (!a.deliveryDateTime) return 1; if (!b.deliveryDateTime) return -1;
          return compareDesc(parseISO(a.deliveryDateTime), parseISO(b.deliveryDateTime));
        case "plate_asc": return (vehicleA?.licensePlate || '').localeCompare(vehicleB?.licensePlate || '');
        case "plate_desc": return (vehicleB?.licensePlate || '').localeCompare(a.licensePlate || '');
        case "price_asc": return a.totalCost - b.totalCost;
        case "price_desc": return b.totalCost - a.totalCost;
        case "status_asc": return a.status.localeCompare(b.status);
        case "status_desc": return b.status.localeCompare(a.status);
        default: {
          const defaultStatusOrderSort = { "Agendado": 1, "Reparando": 2, "Completado": 3, "Cancelado": 3 };
          const defaultStatusASortVal = defaultStatusOrderSort[a.status as keyof typeof defaultStatusOrderSort] || 4;
          const defaultStatusBSortVal = defaultStatusOrderSort[b.status as keyof typeof defaultStatusOrderSort] || 4;

          if (defaultStatusASortVal !== defaultStatusBSortVal) {
            return defaultStatusASortVal - defaultStatusBSortVal;
          }
          const dateComparisonDefault = compareDesc(parseISO(a.serviceDate), parseISO(b.serviceDate));
          if (dateComparisonDefault !== 0) return dateComparisonDefault;
          return a.id.localeCompare(b.id); 
        }
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

  const handleUpdateService = useCallback(async (data: ServiceRecord) => {
    // The form now handles public doc saving. We just update local state.
    setAllServices(prevServices => 
        prevServices.map(s => s.id === data.id ? data : s)
    );
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === data.id);
    if (pIndex !== -1) {
        placeholderServiceRecords[pIndex] = data;
    }
    await persistToFirestore(['serviceRecords']);
    
    toast({
      title: "Servicio Actualizado",
      description: `El servicio ${data.id} ha sido actualizado.`,
    });

    if (data.status === 'Completado') {
      const serviceForTicket = enrichServiceForPrinting(data, inventoryItems);
      setCurrentServiceForTicket(serviceForTicket);
      setCurrentVehicleForTicket(vehicles.find(v => v.id === data.vehicleId) || null);
      setCurrentTechnicianForTicket(technicians.find(t => t.id === data.technicianId) || null);
      setShowPrintTicketDialog(true);
    }
  }, [inventoryItems, technicians, vehicles, toast]);

  const handleDeleteService = useCallback(async (serviceId: string) => {
    const serviceToDelete = allServices.find(s => s.id === serviceId);
    setAllServices(prevServices => prevServices.filter(s => s.id !== serviceId));
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (pIndex !== -1) {
        placeholderServiceRecords.splice(pIndex, 1);
    }
    await persistToFirestore(['serviceRecords']);

    toast({
      title: "Servicio Eliminado",
      description: `El servicio con ID ${serviceId} (${serviceToDelete?.description}) ha sido eliminado.`,
    });
  }, [allServices, toast]);
  
  const handleVehicleCreated = useCallback((newVehicle: Vehicle) => {
    setVehicles(prev => {
      if(prev.find(v=> v.id === newVehicle.id)) return prev;
      const updatedVehicles = [...prev, newVehicle];
       if (!placeholderVehicles.find(v => v.id === newVehicle.id)) {
         placeholderVehicles.push(newVehicle);
       }
      return updatedVehicles;
    });
  }, []);
  
  const handlePrintTicket = () => {
    window.print();
  };
  
  const handleShowSheet = useCallback((service: ServiceRecord) => {
    setServiceForSheet(service);
    setIsSheetOpen(true);
  }, []);

  const handleShareService = useCallback(async (service: ServiceRecord | null) => {
    if (!service) return;

    if (!service.publicId) {
        toast({ title: "Enlace no disponible", description: "Guarde el servicio primero para generar un enlace.", variant: "default" });
        return;
    }

    const vehicleForAction = vehicles.find(v => v.id === service.vehicleId);
    if (!vehicleForAction) {
        toast({ title: "Faltan Datos", description: "No se encontró el vehículo asociado.", variant: "destructive" });
        return;
    }
    
    const shareUrl = `${window.location.origin}/s/${service.publicId}`;
    const workshopName = (service.workshopInfo?.name) || 'RANORO';
    const message = `Hola ${vehicleForAction.ownerName || 'Cliente'}, aquí está la hoja de servicio ${service.id} de nuestro taller para su vehículo ${vehicleForAction.make} ${vehicleForAction.model} ${vehicleForAction.year}. Puede consultarla aquí: ${shareUrl}`;

    navigator.clipboard.writeText(message).then(() => {
        toast({
            title: "Mensaje Copiado",
            description: "El mensaje para WhatsApp ha sido copiado a tu portapapeles.",
        });
    }).catch(err => {
        console.error("Could not copy text: ", err);
        toast({ title: "Error al Copiar", variant: "destructive" });
    });
  }, [vehicles, toast]);


  return (
    <>
      <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Servicios</CardTitle>
            <WrenchIcon className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{summaryData.totalServices}</div>
            <p className="text-xs text-muted-foreground">En el período seleccionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos y Ganancia</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">${summaryData.totalRevenue.toLocaleString('es-ES')}</div>
            <p className="text-xs text-muted-foreground">
                Ganancia total: ${summaryData.totalProfit.toLocaleString('es-ES')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vehículo Más Común</CardTitle>
            <CarIcon className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-headline truncate" title={summaryData.mostCommonVehicle}>{summaryData.mostCommonVehicle}</div>
            <p className="text-xs text-muted-foreground">En el período seleccionado</p>
          </CardContent>
        </Card>
      </div>

      <PageHeader
        title="Servicios"
        description="Consulta, filtra y ordena todas las órdenes de servicio registradas."
        actions={
          <Button asChild>
            <Link href="/servicios/nuevo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Servicio
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar servicios..."
            className="w-full rounded-lg bg-card pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "min-w-[240px] justify-start text-left font-normal flex-1 sm:flex-initial bg-card",
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
            <Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial bg-card">
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
        onShowSheet={handleShowSheet}
        isHistoryView={true}
      />
      
      {currentServiceForTicket && (
        <PrintTicketDialog
          open={showPrintTicketDialog}
          onOpenChange={setShowPrintTicketDialog}
          title="Comprobante de Servicio"
          onDialogClose={() => setCurrentServiceForTicket(null)}
          dialogContentClassName="printable-content"
          footerActions={
             <Button onClick={handlePrintTicket}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir Comprobante
            </Button>
          }
        >
          <TicketContent 
            ref={ticketContentRef}
            service={currentServiceForTicket} 
            vehicle={currentVehicleForTicket || undefined}
            technician={currentTechnicianForTicket || undefined}
          />
        </PrintTicketDialog>
      )}

      <PrintTicketDialog
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          title="Hoja de Servicio"
          onDialogClose={() => setServiceForSheet(null)}
          dialogContentClassName="printable-quote-dialog"
          footerActions={
            <>
              <Button variant="outline" onClick={() => handleShareService(serviceForSheet)}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Copiar para WhatsApp
              </Button>
              <Button onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimir Hoja
              </Button>
            </>
          }
      >
          {serviceForSheet && <ServiceSheetContent service={serviceForSheet} vehicle={vehicles.find(v => v.id === serviceForSheet.vehicleId)} />}
      </PrintTicketDialog>
    </>
  );
}
