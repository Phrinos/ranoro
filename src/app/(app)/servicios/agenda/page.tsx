
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Clock, Search as SearchIcon, Calendar, CalendarCheck, CheckCircle } from "lucide-react";
import {
  placeholderServiceRecords,
  placeholderVehicles,
  placeholderTechnicians,
  placeholderInventory
} from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord } from "@/types";
import { useState, useEffect, useMemo } from "react";
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
      return isToday(serviceDate) || isFuture(serviceDate);
    });
  }, [filteredServices]);

  const pastServices = useMemo(() => {
    return filteredServices.filter(service => isPast(parseISO(service.serviceDate)) && !isToday(parseISO(service.serviceDate)));
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
        <Card key={date} className="mb-6 shadow-md">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold text-primary">
                {format(parseISO(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
              </CardTitle>
              {dailyProfit > 0 && (
                <span className="text-lg font-medium text-green-600">
                  Ganancia del Día: ${dailyProfit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {dayServices.map(service => {
              const vehicle = vehicles.find(v => v.id === service.vehicleId);
              const technician = techniciansState.find(t => t.id === service.technicianId);
              const formattedServiceTime = service.serviceDate && isValid(parseISO(service.serviceDate))
                  ? format(parseISO(service.serviceDate), "HH:mm", { locale: es })
                  : 'Hora Inválida';
              const formattedDelivery = service.deliveryDateTime && isValid(parseISO(service.deliveryDateTime))
                  ? format(parseISO(service.deliveryDateTime), "dd MMM, HH:mm", { locale: es })
                  : 'N/A';

              return (
                <div key={service.id} className="flex items-stretch gap-4 rounded-lg border p-4 shadow-sm hover:bg-muted/50 transition-colors">
                  {/* ID Column */}
                  <div className="flex flex-col items-center justify-center border-r pr-4 text-center w-20 shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">ID</span>
                    <span className="block font-bold text-lg text-primary">{service.id}</span>
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-grow space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <p className="font-semibold text-base">{vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model} ${vehicle.year}` : service.vehicleId}</p>
                            <p className="text-sm text-muted-foreground truncate">{service.description}</p>
                        </div>
                        <p className="font-bold text-lg whitespace-nowrap">${service.totalCost.toLocaleString('es-ES')}</p>
                      </div>
                      <div className="border-t border-dashed"></div>
                      <div className="flex flex-wrap justify-start items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1 font-medium text-foreground" title="Hora de Recepción">
                          <Clock className="h-4 w-4" />
                          <span>Recepción: {formattedServiceTime}</span>
                        </div>
                        <span title={`Técnico: ${technician ? technician.name : 'N/A'}`}>
                            Téc: <span className="font-medium text-foreground">{technician ? technician.name : 'N/A'}</span>
                        </span>
                        <div className="flex items-center gap-1" title="Fecha de Entrega">
                            {service.status === 'Completado' ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                                <CalendarCheck className="h-4 w-4" />
                            )}
                            <span>Entrega: {formattedDelivery}</span>
                        </div>
                      </div>
                  </div>

                  {/* Status & Actions Column */}
                  <div className="flex flex-col items-center justify-between border-l pl-4 w-28 shrink-0">
                      <Badge variant={getStatusVariant(service.status)} className="w-full justify-center mb-2">{service.status}</Badge>
                      <div className="flex flex-row items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(service)} title="Editar Servicio">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Eliminar Servicio">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar Servicio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. ¿Seguro que quieres eliminar este servicio?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteService(service.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Sí, Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
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
          <TabsTrigger value="futuras" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Citas Futuras</TabsTrigger>
          <TabsTrigger value="pasadas" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Citas Pasadas</TabsTrigger>
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
        >
          <TicketContent 
            service={currentServiceForTicket} 
            vehicle={currentVehicleForTicket || undefined}
            technician={currentTechnicianForTicket || undefined}
          />
        </PrintTicketDialog>
      )}
    </>
  );
}
