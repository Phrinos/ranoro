
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Ban, Clock, Search as SearchIcon, Calendar as CalendarIcon, CalendarCheck, CheckCircle, Wrench, Printer, Tag, FileText, BrainCircuit, Loader2, AlertTriangle, List, CalendarDays, MessageSquare, Copy, Pencil, FileCheck } from "lucide-react";
import {
  placeholderServiceRecords,
  placeholderVehicles,
  placeholderTechnicians,
  placeholderInventory,
  placeholderQuotes,
  persistToFirestore,
  AUTH_USER_LOCALSTORAGE_KEY,
} from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, User } from "@/types";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, isFuture, isToday, isPast, isValid, addDays, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ServiceDialog } from "../components/service-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { QuoteContent } from '@/components/quote-content';
import Link from "next/link";
import { analyzeWorkshopCapacity, type CapacityAnalysisOutput } from '@/ai/flows/capacity-analysis-flow';
import { ServiceSheetContent } from '@/components/service-sheet-content';
import { ServiceCalendar } from '../components/service-calendar';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebasePublic.js';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


interface GroupedServices {
  [date: string]: ServiceRecord[];
}

export default function AgendaServiciosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const [allServices, setAllServices] = useState<ServiceRecord[]>(placeholderServiceRecords);
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const [techniciansState, setTechniciansState] = useState<Technician[]>(placeholderTechnicians);
  const [inventoryItemsState, setInventoryItemsState] = useState<InventoryItem[]>(placeholderInventory);

  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState("list");

  const [showPrintTicketDialog, setShowPrintTicketDialog] = useState(false);
  const [currentServiceForTicket, setCurrentServiceForTicket] = useState<ServiceRecord | null>(null);
  const [currentVehicleForTicket, setCurrentVehicleForTicket] = useState<Vehicle | null>(null);
  const [currentTechnicianForTicket, setCurrentTechnicianForTicket] = useState<Technician | null>(null);
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [serviceForSheet, setServiceForSheet] = useState<ServiceRecord | null>(null);

  const [isQuoteViewOpen, setIsQuoteViewOpen] = useState(false);
  const [quoteForView, setQuoteForView] = useState<QuoteRecord | null>(null);

  const [capacityInfo, setCapacityInfo] = useState<CapacityAnalysisOutput | null>(null);
  const [isCapacityLoading, setIsCapacityLoading] = useState(true);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  
  const [cancellationReason, setCancellationReason] = useState('');


  const handleServiceUpdated = useCallback(async (data: ServiceRecord) => {
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
      setCurrentTechnicianForTicket(techniciansState.find(t => t.id === data.technicianId) || null);
      setShowPrintTicketDialog(true);
    }
  }, [techniciansState, vehicles, toast]);

  useEffect(() => {
    setAllServices(placeholderServiceRecords);
    setVehicles(placeholderVehicles);
    setTechniciansState(placeholderTechnicians);
    setInventoryItemsState(placeholderInventory);
  }, []);
  
  const filteredServices = useMemo(() => {
    let servicesToList = allServices.filter(s => s.status === 'Agendado'); // Only show 'Agendado'

    if (!searchTerm) return servicesToList;

    return servicesToList.filter(service => {
      const vehicle = vehicles.find(v => v.id === service.vehicleId);
      const technician = techniciansState.find(t => t.id === service.technicianId);
      const searchLower = searchTerm.toLowerCase();

      return (
        service.id.toLowerCase().includes(searchLower) ||
        (vehicle && (
          vehicle.licensePlate.toLowerCase().includes(searchLower) ||
          vehicle.make.toLowerCase().includes(searchLower) ||
          vehicle.model.toLowerCase().includes(searchLower) ||
          vehicle.ownerName.toLowerCase().includes(searchLower)
        )) ||
        (technician && technician.name.toLowerCase().includes(searchLower)) ||
        (service.description && service.description.toLowerCase().includes(searchLower)) ||
        (service.serviceItems && service.serviceItems.some(item => item.name.toLowerCase().includes(searchLower)))
      );
    });
  }, [allServices, vehicles, techniciansState, searchTerm]);

  const todayServicesForCapacity = useMemo(() => {
      const today = new Date();
      return allServices.filter(service => {
          if (service.status === 'Completado' || service.status === 'Cancelado') return false;
          const serviceDate = parseISO(service.serviceDate);
          return isValid(serviceDate) && isToday(serviceDate);
      });
  }, [allServices]);

  useEffect(() => {
      const runAnalysis = async () => {
          setIsCapacityLoading(true);
          setCapacityError(null);
          
          if (todayServicesForCapacity.length === 0) {
              const totalAvailable = placeholderTechnicians
                  .filter(t => !t.isArchived)
                  .reduce((sum, t) => sum + (t.standardHoursPerDay || 8), 0);
              
              setCapacityInfo({
                  totalRequiredHours: 0,
                  totalAvailableHours: totalAvailable,
                  recommendation: "Taller disponible",
                  capacityPercentage: 0
              });
              setIsCapacityLoading(false);
              return;
          }

          try {
              const result = await analyzeWorkshopCapacity({
                  servicesForDay: todayServicesForCapacity.map(s => ({ description: s.description || '' })),
                  technicians: placeholderTechnicians.filter(t => !t.isArchived).map(t => ({ id: t.id, standardHoursPerDay: t.standardHoursPerDay || 8 })),
                  serviceHistory: placeholderServiceRecords.map(s => ({
                      description: s.description || '',
                      serviceDate: s.serviceDate,
                      deliveryDateTime: s.deliveryDateTime,
                  })),
              });
              setCapacityInfo(result);
          } catch (e) {
              console.error("Capacity analysis failed:", e);
              setCapacityError("La IA no pudo calcular la capacidad.");
          } finally {
              setIsCapacityLoading(false);
          }
      };
      runAnalysis();
  }, [todayServicesForCapacity]);

  const appointmentSummary = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    
    let todayCount = 0;
    let tomorrowCount = 0;

    for (const service of allServices) {
      if (!service.serviceDate || service.status !== 'Agendado') continue;
      const serviceDate = parseISO(service.serviceDate);
      if (isValid(serviceDate)) {
        if (isToday(serviceDate)) {
          todayCount++;
        } else if (isSameDay(serviceDate, tomorrow)) {
          tomorrowCount++;
        }
      }
    }
    return { todayCount, tomorrowCount };
  }, [allServices]);

  const handleOpenEditDialog = (service: ServiceRecord) => {
    setEditingService(service);
    setIsEditDialogOpen(true);
  };

  const handleUpdateService = useCallback(async (data: ServiceRecord | QuoteRecord) => {
    if (!('status' in data)) {
      toast({
        title: "Error de Tipo",
        description: "Se esperaba un registro de servicio para actualizar.",
        variant: "destructive",
      });
      return;
    }
    await handleServiceUpdated(data);
    setIsEditDialogOpen(false);
    setEditingService(null);
  }, [handleServiceUpdated, toast]);

  const handleCancelService = useCallback(async (serviceId: string, reason: string) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
    
    const serviceIndex = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (serviceIndex === -1) {
        toast({ title: "Error", description: "Servicio no encontrado.", variant: "destructive" });
        return;
    }
    
    const service = placeholderServiceRecords[serviceIndex];
    if (service.status === 'Cancelado') {
        toast({ title: "Acción no válida", description: "Este servicio ya ha sido cancelado.", variant: "default" });
        return;
    }

    service.status = 'Cancelado';
    service.cancellationReason = reason;
    service.cancelledBy = currentUser?.name || 'Usuario desconocido';
    
    if (service.serviceItems && service.serviceItems.length > 0) {
      service.serviceItems.forEach(item => {
        item.suppliesUsed.forEach(supply => {
          const invIndex = placeholderInventory.findIndex(i => i.id === supply.supplyId);
          if (invIndex > -1 && !placeholderInventory[invIndex].isService) {
            placeholderInventory[invIndex].quantity += supply.quantity;
          }
        });
      });
    }

    setAllServices([...placeholderServiceRecords]);
    await persistToFirestore(['serviceRecords', 'inventory']);
    
    toast({
      title: "Servicio Cancelado",
      description: `El servicio ${serviceId} ha sido cancelado.`,
    });
  }, [toast]);
  
  const handleReprintService = useCallback((service: ServiceRecord) => {
    setCurrentServiceForTicket(service);
    setCurrentVehicleForTicket(vehicles.find(v => v.id === service.vehicleId) || null);
    setCurrentTechnicianForTicket(techniciansState.find(t => t.id === service.technicianId) || null);
    setShowPrintTicketDialog(true);
  }, [techniciansState, vehicles]);

  const handleShowSheet = async (service: ServiceRecord) => {
    const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;

    let serviceToDisplay = { ...service };

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
            toast({ title: "Error de Sincronización", description: "No se pudieron cargar las firmas más recientes.", variant: "destructive" });
        }
    }

    if (currentUser && currentUser.id === service.serviceAdvisorId) {
      serviceToDisplay = {
        ...serviceToDisplay,
        serviceAdvisorName: currentUser.name,
        serviceAdvisorSignatureDataUrl: currentUser.signatureDataUrl,
      };
    }
    setServiceForSheet(serviceToDisplay);
    setIsSheetOpen(true);
  };
  
  const handleViewQuote = useCallback((serviceId: string) => {
    const quote = placeholderQuotes.find(q => q.serviceId === serviceId);
    if (quote) {
      setQuoteForView(quote);
      setIsQuoteViewOpen(true);
    } else {
      toast({ title: 'No encontrada', description: 'No se encontró la cotización original para este servicio.', variant: 'default' });
    }
  }, [toast]);


  const onVehicleCreated = useCallback(async (newVehicle: Vehicle) => {
    setVehicles(currentVehicles => {
      if (currentVehicles.find(v => v.id === newVehicle.id)) return currentVehicles;
      const updated = [...currentVehicles, newVehicle];
      if (!placeholderVehicles.find(v => v.id === newVehicle.id)) {
         placeholderVehicles.push(newVehicle);
      }
      return updated;
    });
    await persistToFirestore(['vehicles']);
  }, []);

  const handlePrintTicket = useCallback(() => {
    window.print();
  }, []);
  
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

  const groupServicesByDate = (servicesToGroup: ServiceRecord[]): GroupedServices => {
    return servicesToGroup
      .sort((a, b) => compareAsc(parseISO(a.serviceDate), parseISO(b.serviceDate)))
      .reduce((acc: GroupedServices, service) => {
        const dateKey = format(parseISO(service.serviceDate), 'yyyy-MM-dd');
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(service);
        return acc;
      }, {});
  };

  const groupedFutureServices = useMemo(() => groupServicesByDate(filteredServices), [filteredServices]);

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
  
  const getServiceDescriptionText = (service: ServiceRecord) => {
    if (service.serviceItems && service.serviceItems.length > 0) {
      return service.serviceItems.map(item => item.name).join(', ');
    }
    return service.description || '';
  };
  
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return `$${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };


  const serviceListSection = (
    <>
      {Object.keys(groupedFutureServices).length > 0 ? (
        Object.entries(groupedFutureServices).map(([date, dayServices]) => {
          const isCurrentDateToday = isToday(parseISO(date));
          return (
            <div key={date} className="mb-6">
              <div className="flex justify-between items-center mb-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-3 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold">
                      {format(parseISO(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </h3>
                  {isCurrentDateToday && (
                    <div className="text-right">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Capacidad del Taller</p>
                        {isCapacityLoading ? (
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs">Calculando...</span>
                            </div>
                        ) : capacityError ? (
                            <div className="flex items-center justify-end gap-2 pt-1 text-destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-xs">{capacityError}</span>
                            </div>
                        ) : capacityInfo && (
                            <p className="text-xl font-bold" title={`${capacityInfo.totalRequiredHours}h de ${capacityInfo.totalAvailableHours}h`}>
                               {capacityInfo.capacityPercentage}%
                            </p>
                        )}
                    </div>
                  )}
              </div>
              <div className="space-y-4">
                {dayServices.map(service => {
                  const vehicle = vehicles.find(v => v.id === service.vehicleId);
                  const originalQuote = placeholderQuotes.find(q => q.serviceId === service.id);

                  return (
                    <Card key={service.id} className="shadow-sm overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row text-sm">
                           <div className="p-4 w-full md:w-56 flex-none border-b md:border-b-0 md:border-r flex flex-col gap-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">Folio</p>
                                    <p className="font-semibold">{service.id}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Hora Cita</p>
                                    <p className="font-semibold">{format(parseISO(service.serviceDate), "HH:mm 'hrs'", { locale: es })}</p>
                                </div>
                                <Separator />
                                <div>
                                    <p className="text-xs text-muted-foreground">Vehículo y Cliente</p>
                                    <p className="font-semibold">{vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'N/A'}</p>
                                    <p className="text-muted-foreground">{vehicle?.licensePlate}</p>
                                    <p className="text-muted-foreground">{vehicle?.ownerName}</p>
                                </div>
                            </div>
                          
                           <div className="p-4 flex-grow border-b md:border-b-0 md:border-r">
                              <p className="text-xs text-muted-foreground">Detalles del Servicio</p>
                                <div className="mt-1 space-y-2">
                                  <p><span className="font-semibold">Asesor:</span> {service.serviceAdvisorName || 'N/A'}</p>
                                  <div>
                                    <span className="font-semibold">Tipo: </span>
                                    <Badge variant="outline" className="ml-1">{service.serviceType}</Badge>
                                  </div>
                                  <p className="truncate" title={getServiceDescriptionText(service)}>
                                      <span className="font-semibold">Servicio:</span> {getServiceDescriptionText(service)}
                                  </p>
                              </div>
                           </div>
                          
                           <div className="p-4 w-full md:w-52 flex-none bg-muted/30 flex flex-col justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">Costo Estimado</p>
                                <p className="font-bold text-lg text-primary">{formatCurrency(service.totalCost)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Ganancia Estimada</p>
                                <p className="font-semibold text-base text-green-600">{formatCurrency(service.serviceProfit)}</p>
                              </div>
                              <div className="space-y-2 mt-2 text-right">
                                 <Badge variant={getStatusVariant(service.status)} className="w-full justify-center text-center text-base">
                                    {service.status}
                                </Badge>
                                <div className="flex justify-end flex-wrap gap-1">
                                    {originalQuote && (
                                      <Button variant="ghost" size="icon" title="Ver Cotización" onClick={() => handleViewQuote(service.id)}>
                                          <FileText className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="icon" title="Ver Hoja de Servicio" onClick={() => handleShowSheet(service)}>
                                      <FileCheck className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" title="Ingresar a Taller" onClick={() => handleOpenEditDialog(service)} className="text-blue-600 hover:text-blue-700">
                                      <Wrench className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" title="Cancelar Cita" disabled={service.status === 'Completado' || service.status === 'Cancelado'}>
                                        <Ban className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>¿Cancelar esta cita?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción marcará el servicio {service.id} como cancelado y no se podrá revertir.
                                            <div className="mt-4">
                                            <Label htmlFor={`cancel-reason-agenda-${service.id}`} className="text-left font-semibold">Motivo de la cancelación (obligatorio)</Label>
                                            <Textarea id={`cancel-reason-agenda-${service.id}`} value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} placeholder="Ej: El cliente no se presentó..." className="mt-2" />
                                            </div>
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setCancellationReason('')}>No</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => { handleCancelService(service.id, cancellationReason); setCancellationReason(''); }} disabled={!cancellationReason.trim()} className="bg-destructive hover:bg-destructive/90">
                                            Sí, Cancelar Cita
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                              </div>
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )
        })
      ) : (
        <p className="text-muted-foreground text-center py-8">No hay servicios agendados.</p>
      )}
    </>
  );

  return (
    <>
      <div className="mb-6 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Citas para Hoy
            </CardTitle>
            <CalendarIcon className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{appointmentSummary.todayCount}</div>
            <p className="text-xs text-muted-foreground">
              Servicios agendados para hoy.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Citas para Mañana
            </CardTitle>
            <CalendarCheck className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{appointmentSummary.tomorrowCount}</div>
            <p className="text-xs text-muted-foreground">
              Servicios agendados para mañana.
            </p>
          </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Capacidad del Taller (Hoy)
                </CardTitle>
                <BrainCircuit className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
                {isCapacityLoading ? (
                    <div className="flex items-center gap-2 pt-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-muted-foreground text-sm">Calculando...</span>
                    </div>
                ) : capacityError ? (
                    <div className="flex items-center justify-end gap-2 pt-1 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs">{capacityError}</span>
                    </div>
                ) : capacityInfo && (
                    <>
                        <div className="text-2xl font-bold font-headline">{capacityInfo.capacityPercentage}%</div>
                        <p className="text-xs text-muted-foreground" title={`${capacityInfo.totalRequiredHours}h de ${capacityInfo.totalAvailableHours}h`}>
                            {capacityInfo.recommendation}
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
      </div>

      <PageHeader
        title="Agenda de Servicios"
        description="Visualiza, busca y gestiona los servicios agendados."
        actions={
          <Button asChild>
            <Link href="/servicios/nuevo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Servicio
            </Link>
          </Button>
        }
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por ID, vehículo, cliente, técnico, descripción..."
              className="w-full rounded-lg bg-card pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="list"><List className="mr-2 h-4 w-4"/>Lista</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4"/>Calendario</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0">
          {serviceListSection}
        </TabsContent>
        <TabsContent value="calendar" className="mt-0">
          <ServiceCalendar
              services={filteredServices}
              vehicles={vehicles}
              technicians={techniciansState}
              onServiceClick={handleOpenEditDialog}
          />
        </TabsContent>
      </Tabs>

      {isEditDialogOpen && editingService && (
        <ServiceDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          service={editingService}
          vehicles={vehicles}
          technicians={techniciansState}
          inventoryItems={inventoryItemsState}
          onSave={handleUpdateService}
          onVehicleCreated={onVehicleCreated}
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
          {serviceForSheet && <ServiceSheetContent service={serviceForSheet} vehicle={vehicles.find(v => v.id === serviceForSheet.id)} />}
      </PrintTicketDialog>
    </>
  );
}
