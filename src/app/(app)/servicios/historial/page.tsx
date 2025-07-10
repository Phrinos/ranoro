

"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, DollarSign, TrendingUp, Car as CarIcon, Wrench, PlusCircle, Printer, MessageSquare, Copy, Eye, FileCheck, Edit } from "lucide-react";
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory, persistToFirestore, AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, WorkshopInfo, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay, isToday } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebasePublic.js';
import { Badge } from "@/components/ui/badge";
import { ServiceDialog } from "../components/service-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusTracker } from "../components/StatusTracker";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';


type ServiceSortOption = 
  | "serviceDate_desc" | "serviceDate_asc"
  | "deliveryDate_desc" | "deliveryDate_asc"
  | "plate_asc" | "plate_desc"
  | "price_desc" | "price_asc"
  | "status_asc" | "status_desc";


const ServiceList = React.memo(({ services, vehicles, onEdit, onView }: {
  services: ServiceRecord[],
  vehicles: Vehicle[],
  onEdit: (service: ServiceRecord) => void,
  onView: (service: ServiceRecord) => void
}) => {
  const getServiceDescriptionText = (service: ServiceRecord) => {
    if (service.serviceItems && service.serviceItems.length > 0) return service.serviceItems.map(item => item.name).join(', ');
    return service.description;
  };

  const safeParseISO = (date: string | Date | undefined) => {
    if (!date) return new Date(0);
    if (date instanceof Date) return date;
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : new Date(0);
  };
  
  return (
    <div className="space-y-4">
      {services.length > 0 ? (
        services.map(service => {
          const vehicle = vehicles.find(v => v.id === service.vehicleId);
          return (
            <Card key={service.id} className="shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row text-sm">
                  <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                      <p className="font-semibold text-xl text-foreground">{format(safeParseISO(service.serviceDate), "dd MMM yyyy", { locale: es })}</p>
                      <p className="text-muted-foreground text-xs mt-1">Folio: {service.id}</p>
                      <StatusTracker status={service.status} />
                  </div>
                  <div className="p-4 flex flex-col justify-center flex-grow space-y-2 text-left border-y md:border-y-0 md:border-x">
                      <p className="font-bold text-2xl text-black">{vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model}` : 'N/A'}</p>
                      <p className="text-sm text-foreground"><span className="font-semibold">{service.serviceType}:</span> {getServiceDescriptionText(service)}</p>
                  </div>
                  <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                    <p className="text-xs text-muted-foreground">Costo Total</p>
                    <p className="font-bold text-2xl text-black">{formatCurrency(service.totalCost)}</p>
                  </div>
                  <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-56 flex-shrink-0 space-y-2">
                    <p className="text-xs text-muted-foreground">Asesor: {service.serviceAdvisorName || 'N/A'}</p>
                    <div className="flex justify-center items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onView(service)} title="Vista Previa"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(service)} title="Editar Servicio"><Edit className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          <Search className="h-12 w-12 mb-2" /><h3 className="text-lg font-semibold text-foreground">No se encontraron servicios</h3>
          <p className="text-sm">Intente cambiar su búsqueda o el rango de fechas.</p>
        </div>
      )}
    </div>
  );
});
ServiceList.displayName = 'ServiceList';


function HistorialServiciosPageComponent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'activos');
  
  const [allServices, setAllServices] = useState<ServiceRecord[]>(placeholderServiceRecords);
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles); 
  const [technicians, setTechnicians] = useState<Technician[]>(placeholderTechnicians);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(placeholderInventory);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOption, setSortOption] = useState<ServiceSortOption>("serviceDate_desc");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ service: ServiceRecord, quote?: QuoteRecord, vehicle?: Vehicle }> | null>(null);
  
  useEffect(() => {
    // Sync with global state
    setAllServices(placeholderServiceRecords);
    setVehicles(placeholderVehicles);
    setTechnicians(placeholderTechnicians);
    setInventoryItems(placeholderInventory);
  }, []);
  
  const historicalServices = useMemo(() => {
    let filtered = allServices.filter(s => s.status !== 'Agendado' && s.status !== 'Cotizacion');
    if (dateRange?.from) {
      filtered = filtered.filter(service => {
        const serviceDate = parseISO(service.serviceDate);
        return isValid(serviceDate) && isWithinInterval(serviceDate, { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to || dateRange.from!) });
      });
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(s => s.id.toLowerCase().includes(lowerSearch) || s.vehicleIdentifier?.toLowerCase().includes(lowerSearch));
    }
    return filtered;
  }, [allServices, dateRange, searchTerm]);

  const activeServices = useMemo(() => {
    return allServices.filter(s => s.status === 'Reparando' || s.status === 'En Espera de Refacciones' || (s.status === 'Completado' && s.deliveryDateTime && isToday(parseISO(s.deliveryDateTime))));
  }, [allServices]);
  
  const handleSaveService = useCallback(async (data: QuoteRecord | ServiceRecord) => {
      setIsEditDialogOpen(false);
  }, []);

  const handleCancelService = useCallback(async (serviceId: string, reason: string) => { /* ... */ }, []);
  const handleVehicleCreated = useCallback((newVehicle: Vehicle) => { /* ... */ }, []);
  
  const handleShowPreview = useCallback((service: ServiceRecord) => {
    setPreviewData({ service });
    setIsSheetOpen(true);
  }, []);

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Servicios</h1>
          <p className="text-primary-foreground/80 mt-1">Consulta, filtra y gestiona todas las órdenes de servicio del taller.</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="activos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Servicios Activos</TabsTrigger>
              <TabsTrigger value="historial" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Historial</TabsTrigger>
          </TabsList>
          
          <TabsContent value="activos" className="mt-0 space-y-4">
              <ServiceList services={activeServices} vehicles={vehicles} onEdit={(s) => {setEditingService(s); setIsEditDialogOpen(true);}} onView={handleShowPreview}/>
          </TabsContent>
          
          <TabsContent value="historial" className="mt-0 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
              <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar por folio o vehículo..." className="w-full rounded-lg bg-card pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
              <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("min-w-[240px] justify-start text-left font-normal flex-1 sm:flex-initial bg-card", !dateRange && "text-muted-foreground")}><CalendarDateIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`) : format(dateRange.from, "LLL dd, y")) : (<span>Seleccione rango</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} /></PopoverContent></Popover>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial bg-card"><ListFilter className="mr-2 h-4 w-4" />Ordenar</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Ordenar por</DropdownMenuLabel><DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as ServiceSortOption)}><DropdownMenuRadioItem value="serviceDate_desc">Fecha (Más Reciente)</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
            </div>
            <ServiceList services={historicalServices} vehicles={vehicles} onEdit={(s) => {setEditingService(s); setIsEditDialogOpen(true);}} onView={handleShowPreview}/>
          </TabsContent>
      </Tabs>
      
      {isEditDialogOpen && (
        <ServiceDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          service={editingService}
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onVehicleCreated={handleVehicleCreated}
          onCancelService={handleCancelService}
          mode="service"
          onSave={handleSaveService}
        />
      )}

      {isSheetOpen && previewData && (
        <UnifiedPreviewDialog
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          service={previewData.service}
        />
      )}
    </>
  );
}

export default function HistorialServiciosPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <HistorialServiciosPageComponent />
        </Suspense>
    )
}
