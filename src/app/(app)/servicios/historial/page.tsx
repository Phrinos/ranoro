
"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, Eye, Edit, CheckCircle, Printer, Copy } from "lucide-react";
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory, persistToFirestore, AUTH_USER_LOCALSTORAGE_KEY, logAudit } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay, isToday } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { useSearchParams } from "next/navigation";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ServiceDialog } from "../components/service-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusTracker } from "../components/StatusTracker";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { CompleteServiceDialog } from '../components/CompleteServiceDialog';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';


type ServiceSortOption = 
  | "serviceDate_desc" | "serviceDate_asc"
  | "deliveryDate_desc" | "deliveryDate_asc"
  | "plate_asc" | "plate_desc"
  | "price_desc" | "price_asc"
  | "status_asc" | "status_desc";


const ServiceList = React.memo(({ services, vehicles, technicians, onEdit, onView, onComplete }: {
  services: ServiceRecord[],
  vehicles: Vehicle[],
  technicians: Technician[],
  onEdit: (service: ServiceRecord) => void,
  onView: (service: ServiceRecord) => void,
  onComplete: (service: ServiceRecord) => void,
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
          const technician = technicians.find(t => t.id === service.technicianId);
          const isCompletable = service.status === 'En Taller';
          const isInProgress = service.status === 'En Taller' || service.status === 'Agendado';

          return (
            <Card key={service.id} className="shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row text-sm">
                  <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                      <p className="font-semibold text-xl text-foreground">{format(safeParseISO(service.serviceDate), "dd MMM yyyy", { locale: es })}</p>
                      <p className="font-semibold text-lg text-foreground">{format(safeParseISO(service.serviceDate), "HH:mm", { locale: es })}</p>
                      <p className="text-muted-foreground text-xs mt-1">Folio: {service.id}</p>
                      <StatusTracker status={service.status} />
                  </div>
                  <div className="p-4 flex flex-col justify-center flex-grow space-y-2 text-left border-y md:border-y-0 md:border-x">
                      <p className="text-sm text-muted-foreground">{vehicle?.ownerName} - {vehicle?.ownerPhone}</p>
                      <p className="font-bold text-2xl text-black">{vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model}` : 'N/A'}</p>
                      <p className="text-sm text-foreground"><span className="font-semibold">{service.serviceType}:</span> {getServiceDescriptionText(service)}</p>
                  </div>
                  <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                    <p className="text-xs text-muted-foreground">Costo Total</p>
                    <p className="font-bold text-2xl text-black">{formatCurrency(service.totalCost)}</p>
                  </div>
                  <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-56 flex-shrink-0 space-y-2">
                    {service.status === 'Entregado' && (
                        <Badge variant="success">Servicio Entregado</Badge>
                    )}
                     {service.status === 'En Taller' && (
                        <Badge variant="secondary">{service.subStatus ? `En Taller (${service.subStatus})` : 'En Taller'}</Badge>
                    )}
                     {service.status === 'Agendado' && (
                        <Badge variant="default">Agendado</Badge>
                    )}
                    {service.status === 'Cancelado' && (
                        <Badge variant="destructive">Servicio Cancelado</Badge>
                    )}
                    <p className="text-xs text-muted-foreground">Asesor: {service.serviceAdvisorName || 'N/A'}</p>
                    {technician && <p className="text-xs text-muted-foreground">Técnico: {technician.name}</p>}
                    <div className="flex justify-center items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onView(service)} title="Vista Previa"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(service)} title="Editar Servicio"><Edit className="h-4 w-4" /></Button>
                        {isCompletable && <Button variant="ghost" size="icon" onClick={() => onComplete(service)} title="Marcar como Entregado"><CheckCircle className="h-4 w-4 text-green-600" /></Button>}
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
  
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]); 
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOption, setSortOption] = useState<ServiceSortOption>("serviceDate_desc");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ service: ServiceRecord; } | null>(null);

  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ticketData, setTicketData] = useState<{service: ServiceRecord, vehicle?: Vehicle, technician?: Technician} | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // This now simply loads everything from the placeholder data.
    setAllServices(placeholderServiceRecords);
    setVehicles(placeholderVehicles);
    setTechnicians(placeholderTechnicians);
    setInventoryItems(placeholderInventory);
  }, []);
  
  const activeServices = useMemo(() => {
    return allServices.filter(s => {
      if (s.status === 'Cancelado' || s.status === 'Cotizacion') {
        return false;
      }
      const isScheduledForToday = s.status === 'Agendado' && s.serviceDate && isValid(parseISO(s.serviceDate)) && isToday(parseISO(s.serviceDate));
      const isInWorkshop = s.status === 'En Taller';
      const isDeliveredToday = s.status === 'Entregado' && s.deliveryDateTime && isValid(parseISO(s.deliveryDateTime)) && isToday(parseISO(s.deliveryDateTime));

      return isScheduledForToday || isInWorkshop || isDeliveredToday;
    }).sort((a,b) => compareAsc(parseISO(a.serviceDate), parseISO(b.serviceDate)));
  }, [allServices]);
  
  const historicalServices = useMemo(() => {
    // Start with all services that are not just quotes.
    let baseList = allServices.filter(s => s.status !== 'Cotizacion');

    // Apply search filter first.
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      baseList = baseList.filter(s =>
        s.id.toLowerCase().includes(lowerSearch) ||
        (s.vehicleIdentifier && s.vehicleIdentifier.toLowerCase().includes(lowerSearch)) ||
        (s.description && s.description.toLowerCase().includes(lowerSearch))
      );
    }
    
    // Then, apply date range filter if it exists.
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

      baseList = baseList.filter(service => {
        const dateToCompare = service.deliveryDateTime || service.serviceDate;
        if (!dateToCompare) return false;
        
        const serviceDate = parseISO(dateToCompare);
        return isValid(serviceDate) && isWithinInterval(serviceDate, { start: from, end: to });
      });
    }

    return baseList.sort((a,b) => compareDesc(parseISO(a.serviceDate), parseISO(b.serviceDate)));
  }, [allServices, dateRange, searchTerm]);


  
  const handleSaveService = useCallback(async (data: QuoteRecord | ServiceRecord) => {
    setIsEditDialogOpen(false);
  }, []);

  const handleCancelService = useCallback(async (serviceId: string, reason: string) => {
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (pIndex !== -1) {
        placeholderServiceRecords[pIndex].status = 'Cancelado';
        placeholderServiceRecords[pIndex].cancellationReason = reason;
        await logAudit('Cancelar', `Canceló el servicio #${serviceId} por: ${reason}`, { entityType: 'Servicio', entityId: serviceId });
        await persistToFirestore(['serviceRecords', 'auditLogs']);
        toast({ title: "Servicio Cancelado" });
    }
  }, [toast]);


  const handleVehicleCreated = useCallback(async (newVehicle: Vehicle) => {
     placeholderVehicles.push(newVehicle);
     await persistToFirestore(['vehicles']);
  }, []);
  
  const handleShowPreview = useCallback((service: ServiceRecord) => {
    let currentUser: User | null = null;
    try {
      const raw = typeof window !== "undefined"
        ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY)
        : null;
      if (raw) currentUser = JSON.parse(raw);
    } catch { /* ignore */ }
  
    const enrichedService: ServiceRecord = {
      ...service,
      serviceAdvisorName:
        service.serviceAdvisorName || currentUser?.name || "",
      serviceAdvisorSignatureDataUrl:
        service.serviceAdvisorSignatureDataUrl || currentUser?.signatureDataUrl || "",
    };
  
    setPreviewData({ service: enrichedService });
    setIsSheetOpen(true);
  }, []);

  const handleOpenCompleteDialog = useCallback((service: ServiceRecord) => {
    setServiceToComplete(service);
    setIsCompleteDialogOpen(true);
  }, []);
  
  const handleConfirmCompletion = useCallback(async (service: ServiceRecord, paymentDetails: { paymentMethod: any, cardFolio?: string, transferFolio?: string }) => {
    const serviceIndex = placeholderServiceRecords.findIndex(s => s.id === service.id);
    if (serviceIndex === -1) return;

    const updatedService = {
      ...service,
      status: 'Entregado' as const,
      deliveryDateTime: new Date().toISOString(),
      paymentMethod: paymentDetails.paymentMethod,
      cardFolio: paymentDetails.cardFolio,
      transferFolio: paymentDetails.transferFolio,
    };
    
    let inventoryWasUpdated = false;
    (updatedService.serviceItems || []).forEach(item => {
      (item.suppliesUsed || []).forEach(supply => {
        const inventoryItemIndex = placeholderInventory.findIndex(invItem => invItem.id === supply.supplyId);
        if (inventoryItemIndex !== -1 && !placeholderInventory[inventoryItemIndex].isService) {
          placeholderInventory[inventoryItemIndex].quantity -= supply.quantity;
          inventoryWasUpdated = true;
        }
      });
    });

    placeholderServiceRecords[serviceIndex] = updatedService;
    
    const persistKeys: ('serviceRecords' | 'inventory')[] = ['serviceRecords'];
    if (inventoryWasUpdated) {
        persistKeys.push('inventory');
    }
    
    await persistToFirestore(persistKeys);
    
    setAllServices([...placeholderServiceRecords]);
    
    toast({
      title: "Servicio Completado",
      description: `El servicio para ${service.vehicleIdentifier} ha sido marcado como entregado.`,
    });
    
    // Set data for the ticket and open the dialog
    setTicketData({
        service: updatedService,
        vehicle: vehicles.find(v => v.id === updatedService.vehicleId),
        technician: technicians.find(t => t.id === updatedService.technicianId),
    });
    setIsTicketDialogOpen(true);

  }, [toast, vehicles, technicians]);

  const handleCopyTicket = async () => {
    if (!ticketContentRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    try {
        const canvas = await html2canvas(ticketContentRef.current, { scale: 2 });
        canvas.toBlob((blob) => {
            if (blob) {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                toast({ title: "Copiado", description: "La imagen del ticket ha sido copiada." });
            }
        });
    } catch (e) {
        console.error("Error copying image:", e);
        toast({ title: "Error", description: "No se pudo copiar la imagen del ticket.", variant: "destructive" });
    }
  };

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
              <ServiceList services={activeServices} vehicles={vehicles} technicians={technicians} onEdit={(s) => {setEditingService(s); setIsEditDialogOpen(true);}} onView={handleShowPreview} onComplete={handleOpenCompleteDialog}/>
          </TabsContent>
          
          <TabsContent value="historial" className="mt-0 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
              <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar por folio o vehículo..." className="w-full rounded-lg bg-card pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
              <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("min-w-[240px] justify-start text-left font-normal flex-1 sm:flex-initial bg-card", !dateRange && "text-muted-foreground")}><CalendarDateIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`) : format(dateRange.from, "LLL dd, y")) : (<span>Seleccione rango</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} /></PopoverContent></Popover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="min-w-[150px] flex-1 sm:flex-initial bg-card"
                  >
                    <ListFilter className="mr-2 h-4 w-4" />
                    Ordenar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={sortOption}
                    onValueChange={(value) => setSortOption(value as ServiceSortOption)}
                  >
                    <DropdownMenuRadioItem value="serviceDate_desc">
                      Fecha (Más Reciente)
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ServiceList services={historicalServices} vehicles={vehicles} technicians={technicians} onEdit={(s) => {setEditingService(s); setIsEditDialogOpen(true);}} onView={handleShowPreview} onComplete={handleOpenCompleteDialog}/>
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

      {serviceToComplete && (
        <CompleteServiceDialog 
            open={isCompleteDialogOpen}
            onOpenChange={setIsCompleteDialogOpen}
            service={serviceToComplete}
            onConfirm={handleConfirmCompletion}
        />
      )}

      {isSheetOpen && previewData && (
        <UnifiedPreviewDialog
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          service={previewData.service}
        />
      )}
      
      {ticketData && (
         <PrintTicketDialog
          open={isTicketDialogOpen}
          onOpenChange={setIsTicketDialogOpen}
          title="Comprobante de Servicio"
          onDialogClose={() => setTicketData(null)}
          footerActions={
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopyTicket}><Copy className="mr-2 h-4 w-4"/> Copiar</Button>
                <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
            </div>
          }
        >
          <TicketContent ref={ticketContentRef} service={ticketData.service} vehicle={ticketData.vehicle} technician={ticketData.technician} />
        </PrintTicketDialog>
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
    

    
