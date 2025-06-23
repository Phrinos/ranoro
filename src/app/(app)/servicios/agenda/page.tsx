
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Clock, Search as SearchIcon, Calendar, CalendarCheck, CheckCircle, Wrench, Printer, Tag, FileText, TrendingUp, DollarSign } from "lucide-react";
import {
  placeholderServiceRecords,
  placeholderVehicles,
  placeholderTechnicians,
  placeholderInventory
} from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord } from "@/types";
import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, isFuture, isToday, isPast, isValid, addDays, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServiceDialog } from "../components/service-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import Link from "next/link";

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
  const [activeTab, setActiveTab] = useState("futuras");

  const [showPrintTicketDialog, setShowPrintTicketDialog] = useState(false);
  const [currentServiceForTicket, setCurrentServiceForTicket] = useState<ServiceRecord | null>(null);
  const [currentVehicleForTicket, setCurrentVehicleForTicket] = useState<Vehicle | null>(null);
  const [currentTechnicianForTicket, setCurrentTechnicianForTicket] = useState<Technician | null>(null);


  useEffect(() => {
    setAllServices(placeholderServiceRecords);
    setVehicles(placeholderVehicles);
    setTechniciansState(placeholderTechnicians);
    setInventoryItemsState(placeholderInventory);
  }, []);

  const appointmentSummary = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    
    let todayCount = 0;
    let tomorrowCount = 0;

    for (const service of allServices) {
      if (!service.serviceDate || service.status === 'Completado' || service.status === 'Cancelado') continue;
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

  const handleUpdateService = async (data: ServiceRecord | QuoteRecord) => {
    // In this context (AgendaServiciosPage), we are always updating ServiceRecords.
    // The ServiceDialog's onSave prop is (data: ServiceRecord | QuoteRecord).
    // So, we assert the type here.
    if (!('status' in data)) { // 'status' is a property unique to ServiceRecord vs QuoteRecord for this check
      toast({
        title: "Error de Tipo",
        description: "Se esperaba un registro de servicio para actualizar.",
        variant: "destructive",
      });
      return;
    }
    const updatedServiceData = data as ServiceRecord;

    setAllServices(prevServices =>
      prevServices.map(s => (s.id === updatedServiceData.id ? updatedServiceData : s))
    );
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === updatedServiceData.id);
    if (pIndex !== -1) {
      placeholderServiceRecords[pIndex] = updatedServiceData;
    }
     toast({
      title: "Servicio Actualizado",
      description: `El servicio para ${vehicles.find(v => v.id === updatedServiceData.vehicleId)?.licensePlate} ha sido actualizado.`,
    });
    setIsEditDialogOpen(false);
    setEditingService(null);

    if (updatedServiceData.status === 'Completado') {
      setCurrentServiceForTicket(updatedServiceData);
      setCurrentVehicleForTicket(vehicles.find(v => v.id === updatedServiceData.vehicleId) || null);
      setCurrentTechnicianForTicket(techniciansState.find(t => t.id === updatedServiceData.technicianId) || null);
      setShowPrintTicketDialog(true);
    }
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

  const onVehicleCreated = (newVehicle: Vehicle) => {
    setVehicles(currentVehicles => {
      if (currentVehicles.find(v => v.id === newVehicle.id)) return currentVehicles;
      const updated = [...currentVehicles, newVehicle];
      if (!placeholderVehicles.find(v => v.id === newVehicle.id)) {
         placeholderVehicles.push(newVehicle);
      }
      return updated;
    });
  };

  const handlePrintTicket = () => {
    window.print();
  };


  const filteredServices = useMemo(() => {
    if (!searchTerm) return allServices;
    return allServices.filter(service => {
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
        service.description.toLowerCase().includes(searchLower)
      );
    });
  }, [allServices, vehicles, techniciansState, searchTerm]);

  const futureServices = useMemo(() => {
    return filteredServices.filter(service => {
      const serviceDate = parseISO(service.serviceDate);
      return isValid(serviceDate) && (isToday(serviceDate) || isFuture(serviceDate));
    });
  }, [filteredServices]);

  const pastServices = useMemo(() => {
    return filteredServices.filter(service => {
      const serviceDate = parseISO(service.serviceDate);
      if (!isValid(serviceDate)) return false;

      const isServiceInThePast = isPast(serviceDate) && !isToday(serviceDate);
      const isValidStatusForPast = service.status === 'Agendado' || service.status === 'Cancelado';

      return isServiceInThePast && isValidStatusForPast;
    });
  }, [filteredServices]);


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

  const groupedFutureServices = useMemo(() => groupServicesByDate(futureServices), [futureServices]);
  const groupedPastServices = useMemo(() => groupServicesByDate(pastServices), [pastServices]);


  const getStatusVariant = (status: ServiceRecord['status']): "default" | "secondary" | "outline" | "destructive" | "success" => {
    switch (status) {
      case "Completado": return "success"; 
      case "Reparando": return "secondary"; 
      case "Cancelado": return "destructive"; 
      case "Agendado": return "default"; 
      default: return "default";
    }
  };

  const renderServiceGroup = (groupedServicesData: GroupedServices) => {
    if (Object.keys(groupedServicesData).length === 0) {
      return <p className="text-muted-foreground text-center py-8">No hay servicios para mostrar en esta vista.</p>;
    }

    return Object.entries(groupedServicesData).map(([date, dayServices]) => {
      const dailyProfit = dayServices.reduce((sum, service) => sum + (service.serviceProfit || 0), 0);
      return (
        <div key={date} className="mb-6">
          <div className="flex justify-between items-center mb-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-3 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold">
                  {format(parseISO(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
              </h3>
              <div className="text-right">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Ganancia Estimada del Día</p>
                  <p className="text-xl font-bold">
                      {`$${dailyProfit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </p>
              </div>
          </div>
          <div className="space-y-4">
            {dayServices.map(service => {
              const vehicle = vehicles.find(v => v.id === service.vehicleId);
              const technician = techniciansState.find(t => t.id === service.technicianId);
              const serviceDateObj = service.serviceDate ? parseISO(service.serviceDate) : null;
              const deliveryDateObj = service.deliveryDateTime ? parseISO(service.deliveryDateTime) : null;
              
              const serviceReceptionTime = serviceDateObj && isValid(serviceDateObj) ? format(serviceDateObj, "HH:mm", { locale: es }) : 'N/A';
              const formattedDeliveryDateTime = deliveryDateObj && isValid(deliveryDateObj) ? format(deliveryDateObj, "dd MMM yy, HH:mm", { locale: es }) : 'N/A';
              const technicianName = technician ? technician.name : service.technicianId;
              const vehicleMakeModelYear = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'N/A';
              const totalCostFormatted = `$${service.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              const serviceProfitFormatted = service.serviceProfit !== undefined ? `$${service.serviceProfit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';

              return (
                <Card key={service.id} className="shadow-sm">
                  <CardContent className="p-0">
                    <div className="flex items-center">
                        <div className="w-48 shrink-0 flex flex-col justify-center items-start text-left pl-6 py-4">
                            <p className="font-bold text-lg text-foreground">
                                {totalCostFormatted}
                            </p>
                            <p className="text-xs text-muted-foreground -mt-1">Costo</p>
                            <p className="font-semibold text-lg text-green-600 mt-1">
                                {serviceProfitFormatted}
                            </p>
                            <p className="text-xs text-muted-foreground -mt-1">Ganancia</p>
                        </div>
                        
                        <div className="flex-grow border-l border-r p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5" title="Hora de Recepción">
                                    {(service.status === 'Reparando' || service.status === 'Completado') ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4" />}
                                    <span>Recepción: {serviceReceptionTime}</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="Técnico">
                                    <Wrench className="h-4 w-4" />
                                    <span>{technicianName}</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="Fecha de Entrega">
                                    {service.status === 'Completado' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <CalendarCheck className="h-4 w-4" />}
                                    <span>Entrega: {formattedDeliveryDateTime}</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="ID de Servicio">
                                    <span>ID: {service.id}</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-4">
                                <div className="flex-grow">
                                    <h4 className="font-semibold text-lg" title={vehicleMakeModelYear}>
                                        {vehicle ? `${vehicle.licensePlate} - ${vehicleMakeModelYear}` : 'N/A'}
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1 truncate" title={service.description}>
                                        {service.description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="w-48 shrink-0 flex flex-col items-center justify-center p-4 gap-y-2">
                            <Badge variant={getStatusVariant(service.status)} className="w-full justify-center text-center text-base">{service.status}</Badge>
                            <div className="flex">
                              <Button variant="ghost" size="icon" aria-label="Editar Servicio" onClick={() => handleOpenEditDialog(service)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label="Eliminar Servicio">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Esto eliminará permanentemente la orden de servicio.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteService(service.id)} className="bg-destructive hover:bg-destructive/90">
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      );
    });
  };


  return (
    <>
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Citas para Hoy
            </CardTitle>
            <Calendar className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{appointmentSummary.todayCount}</div>
            <p className="text-xs text-muted-foreground">
              Servicios agendados o en progreso para hoy.
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
       <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por ID, vehículo, cliente, técnico, descripción..."
            className="w-full rounded-lg bg-card pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="futuras" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Citas Futuras</TabsTrigger>
          <TabsTrigger value="pasadas" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">Citas Pasadas</TabsTrigger>
        </TabsList>
        <TabsContent value="futuras">
          {renderServiceGroup(groupedFutureServices)}
        </TabsContent>
        <TabsContent value="pasadas">
          {renderServiceGroup(groupedPastServices)}
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
    </>
  );
}

    