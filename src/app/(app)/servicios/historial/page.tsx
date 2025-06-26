
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, DollarSign, TrendingUp, Car as CarIcon, Wrench, PlusCircle, Printer, MessageSquare, Copy, FileText, FileCheck, Edit, Ban } from "lucide-react";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory, persistToFirestore, AUTH_USER_LOCALSTORAGE_KEY, placeholderQuotes } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, WorkshopInfo, User } from "@/types";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ServiceSheetContent } from '@/components/service-sheet-content';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebasePublic.js';
import { QuoteContent } from '@/components/quote-content';
import { Badge } from "@/components/ui/badge";
import { ServiceDialog } from "../components/service-dialog";


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
  
  const [isQuoteViewOpen, setIsQuoteViewOpen] = useState(false);
  const [quoteForView, setQuoteForView] = useState<QuoteRecord | null>(null);
  
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    setAllServices(placeholderServiceRecords);
    setVehicles(placeholderVehicles);
    setTechniciansState(placeholderTechnicians);
    setInventoryItemsState(placeholderInventory);
  }, []);

  const filteredAndSortedServices = useMemo(() => {
    let filtered = [...allServices].filter(s => s.status === 'Reparando' || s.status === 'Completado' || s.status === 'Cancelado');

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
        case "serviceDate_desc":
        default: {
          const statusOrder = { "Reparando": 1, "Completado": 2, "Cancelado": 3 };
          const statusAVal = statusOrder[a.status as keyof typeof statusOrder] || 4;
          const statusBVal = statusOrder[b.status as keyof typeof statusOrder] || 4;

          if (statusAVal !== statusBVal) {
            return statusAVal - statusBVal;
          }
          const dateComparison = compareDesc(parseISO(a.serviceDate), parseISO(b.serviceDate));
          if (dateComparison !== 0) return dateComparison;
          return a.id.localeCompare(b.id); 
        }
      }
    });
    return filtered;
  }, [allServices, vehicles, technicians, searchTerm, dateRange, sortOption]);
  
  const getServiceDescriptionText = (service: ServiceRecord) => {
    if (service.serviceItems && service.serviceItems.length > 0) {
      return service.serviceItems.map(item => item.name).join(', ');
    }
    return service.description || '';
  };

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
      setCurrentServiceForTicket(data);
      setCurrentVehicleForTicket(vehicles.find(v => v.id === data.vehicleId) || null);
      setCurrentTechnicianForTicket(technicians.find(t => t.id === data.technicianId) || null);
      setShowPrintTicketDialog(true);
    }
  }, [inventoryItems, technicians, vehicles, toast]);

  const handleCancelService = useCallback(async (serviceId: string, reason: string) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
    
    let serviceToCancel: ServiceRecord | undefined;
    const updatedServices = allServices.map(s => {
      if (s.id === serviceId) {
        if (s.status === 'Cancelado') return s; // Already cancelled
        serviceToCancel = {
          ...s,
          status: 'Cancelado',
          cancellationReason: reason,
          cancelledBy: currentUser?.name || 'Usuario desconocido',
        };
        return serviceToCancel;
      }
      return s;
    });

    if (!serviceToCancel) {
      toast({ title: "Error", description: "Servicio no encontrado.", variant: "destructive" });
      return;
    }
    if (serviceToCancel.status !== 'Cancelado'){
       toast({ title: "Acción no válida", description: "Este servicio ya ha sido cancelado.", variant: "default" });
       return; // Already handled in the initial check, but as a safeguard.
    }
    
    // Restore inventory
    if (serviceToCancel.serviceItems && serviceToCancel.serviceItems.length > 0) {
      serviceToCancel.serviceItems.forEach(item => {
        item.suppliesUsed.forEach(supply => {
          const invIndex = placeholderInventory.findIndex(i => i.id === supply.supplyId);
          if (invIndex > -1 && !placeholderInventory[invIndex].isService) {
            placeholderInventory[invIndex].quantity += supply.quantity;
          }
        });
      });
    }
    
    setAllServices(updatedServices); // Update local state
    
    // Update global source of truth
    placeholderServiceRecords.splice(0, placeholderServiceRecords.length, ...updatedServices);
    await persistToFirestore(['serviceRecords', 'inventory']);

    toast({
      title: "Servicio Cancelado",
      description: `El servicio ${serviceId} ha sido cancelado.`,
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
  
  const handlePrintTicket = useCallback(() => {
    window.print();
  }, []);
  
  const handleReprintService = useCallback((service: ServiceRecord) => {
    setCurrentServiceForTicket(service);
    setCurrentVehicleForTicket(vehicles.find(v => v.id === service.vehicleId) || null);
    setCurrentTechnicianForTicket(technicians.find(t => t.id === service.technicianId) || null);
    setShowPrintTicketDialog(true);
  }, [technicians, vehicles]);

  const handleCopyAsImage = async () => {
    if (!ticketContentRef.current) {
        toast({ title: "Error", description: "No se encontró el contenido del ticket.", variant: "destructive" });
        return;
    }
    try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(ticketContentRef.current, {
            useCORS: true,
            backgroundColor: '#ffffff',
            scale: 2.5,
        });
        canvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    toast({ title: "Copiado", description: "La imagen del ticket ha sido copiada." });
                } catch (clipboardErr) {
                    console.error('Clipboard API error:', clipboardErr);
                    toast({ title: "Error de Copiado", description: "Tu navegador no pudo copiar la imagen. Intenta imprimir.", variant: "destructive" });
                }
            } else {
                 toast({ title: "Error de Conversión", description: "No se pudo convertir el ticket a imagen.", variant: "destructive" });
            }
        }, 'image/png');
    } catch (e) {
        console.error("html2canvas error:", e);
        toast({ title: "Error de Captura", description: "No se pudo generar la imagen del ticket.", variant: "destructive" });
    }
  };
  
  const handleShowSheet = useCallback(async (service: ServiceRecord) => {
    const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;

    let serviceToDisplay = { ...service };

    // Fetch latest signatures from public doc before displaying
    if (service.publicId && db) {
        try {
            const publicDocRef = doc(db, 'publicServices', service.publicId);
            const docSnap = await getDoc(publicDocRef);
            if (docSnap.exists()) {
                const publicData = docSnap.data() as ServiceRecord;
                let changed = false;
                if (publicData.customerSignatureReception && serviceToDisplay.customerSignatureReception !== publicData.customerSignatureReception) {
                    serviceToDisplay.customerSignatureReception = publicData.customerSignatureReception;
                    changed = true;
                }
                if (publicData.customerSignatureDelivery && serviceToDisplay.customerSignatureDelivery !== publicData.customerSignatureDelivery) {
                    serviceToDisplay.customerSignatureDelivery = publicData.customerSignatureDelivery;
                    changed = true;
                }

                if (changed) {
                    const pIndex = placeholderServiceRecords.findIndex(s => s.id === service.id);
                    if (pIndex > -1) {
                        placeholderServiceRecords[pIndex] = { ...placeholderServiceRecords[pIndex], ...serviceToDisplay };
                        await persistToFirestore(['serviceRecords']);
                    }
                }
            }
        } catch(e) {
            console.error("Error syncing sheet for view", e);
        }
    }

    // Enrich with advisor info
    if (currentUser && currentUser.id === service.serviceAdvisorId) {
      serviceToDisplay = {
        ...serviceToDisplay,
        serviceAdvisorName: currentUser.name,
        serviceAdvisorSignatureDataUrl: currentUser.signatureDataUrl,
      };
    }
    setServiceForSheet(serviceToDisplay);
    setIsSheetOpen(true);
  }, [toast]);

  const handleShowQuote = useCallback((quote: QuoteRecord) => {
    setQuoteForView(quote);
    setIsQuoteViewOpen(true);
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

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return `$${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const getStatusVariant = (status: ServiceRecord['status']): "default" | "secondary" | "outline" | "destructive" | "success" => {
    switch (status) {
      case "Completado": return "success"; 
      case "Reparando": return "secondary"; 
      case "Cancelado": return "destructive"; 
      case "Agendado": return "default";
      case "Cotizacion": return "outline";
      default: return "default";
    }
  };


  return (
    <>
      <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Servicios</CardTitle>
            <Wrench className="h-5 w-5 text-blue-500" />
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

       <div className="space-y-4">
        {filteredAndSortedServices.length > 0 ? (
          filteredAndSortedServices.map(service => {
            const vehicle = vehicles.find(v => v.id === service.vehicleId);
            const originalQuote = placeholderQuotes.find(q => q.serviceId === service.id);

            return (
              <Card key={service.id} className="shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row text-sm">
                    <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                        <p className="text-xs text-gray-500">Folio: {service.id}</p>
                        <p className="text-lg font-semibold text-foreground">{format(parseISO(service.serviceDate), "dd MMM yyyy", { locale: es })}</p>
                        <p className="text-xs text-muted-foreground">Entrega: {service.deliveryDateTime ? format(parseISO(service.deliveryDateTime), "dd MMM, HH:mm") : 'N/A'}</p>
                    </div>

                    <Separator orientation="vertical" className="hidden md:block h-auto"/>

                    <div className="p-4 flex flex-col justify-center flex-grow space-y-2">
                        <p className="text-sm text-gray-500">{vehicle?.ownerName} - {vehicle?.ownerPhone}</p>
                        <p className="font-bold text-2xl text-black">{vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'N/A'}</p>
                        <p className="text-sm text-foreground">
                            <span className="font-semibold">{service.serviceType}:</span> {getServiceDescriptionText(service)}
                        </p>
                    </div>

                    <Separator orientation="vertical" className="hidden md:block h-auto"/>

                    <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                      <p className="text-xs text-muted-foreground">Costo Total</p>
                      <p className="font-bold text-2xl text-black">{formatCurrency(service.totalCost)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Ganancia</p>
                      <p className="font-semibold text-green-600">{formatCurrency(service.serviceProfit)}</p>
                    </div>

                    <Separator orientation="vertical" className="hidden md:block h-auto"/>

                    <div className="p-4 flex flex-col justify-center items-center text-center border-b md:border-b-0 md:border-l w-full md:w-56 flex-shrink-0">
                       <Badge variant={getStatusVariant(service.status)} className="w-full justify-center text-center text-sm">
                          {service.status}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-4">Técnico: {service.technicianName || 'N/A'}</p>
                      <div className="flex justify-center items-center gap-1 mt-2">
                          {originalQuote && (
                            <Button variant="ghost" size="icon" onClick={() => handleShowQuote(originalQuote)} title="Ver Cotización Original">
                                <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleShowSheet(service)} title="Ver Hoja de Servicio">
                            <FileCheck className="h-4 w-4" />
                          </Button>
                           {service.status === 'Completado' && (
                            <Button variant="ghost" size="icon" onClick={() => handleReprintService(service)} title="Reimprimir Comprobante">
                                <Printer className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => { setEditingService(service); setIsEditDialogOpen(true); }} title="Editar Servicio">
                            <Edit className="h-4 w-4" />
                          </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <p className="text-muted-foreground text-center py-8">No hay servicios que coincidan con los filtros.</p>
        )}
      </div>

      {editingService && (
        <ServiceDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          service={editingService}
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={handleUpdateService}
          onVehicleCreated={handleVehicleCreated}
          onCancelService={handleCancelService}
          mode="service"
        />
      )}
      
      {currentServiceForTicket && (
        <PrintTicketDialog
          open={showPrintTicketDialog}
          onOpenChange={setShowPrintTicketDialog}
          title="Comprobante de Servicio"
          onDialogClose={() => setCurrentServiceForTicket(null)}
          dialogContentClassName="printable-content"
          footerActions={
             <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopyAsImage}>
                    <Copy className="mr-2 h-4 w-4"/> Copiar Imagen
                </Button>
                <Button onClick={handlePrintTicket}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir Comprobante
                </Button>
             </div>
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

       {isQuoteViewOpen && quoteForView && (
        <PrintTicketDialog
          open={isQuoteViewOpen}
          onOpenChange={setIsQuoteViewOpen}
          title={`Cotización Original: ${quoteForView.id}`}
          dialogContentClassName="printable-quote-dialog"
          onDialogClose={() => setQuoteForView(null)}
          footerActions={
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir Cotización
            </Button>
          }
        >
          <QuoteContent
            quote={quoteForView}
            vehicle={vehicles.find(v => v.id === quoteForView.vehicleId)}
            workshopInfo={quoteForView.workshopInfo}
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
