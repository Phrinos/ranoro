

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, List, Calendar as CalendarIcon, FileCheck, Eye, Loader2, Edit } from "lucide-react";
import { ServiceDialog } from "../components/service-dialog";
import type { ServiceRecord, Vehicle, Technician, QuoteRecord, InventoryItem, CapacityAnalysisOutput } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isToday, isTomorrow, compareAsc, isValid, startOfDay, endOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory, persistToFirestore, hydrateReady } from "@/lib/placeholder-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceCalendar } from '../components/service-calendar';
import { analyzeWorkshopCapacity } from '@/ai/flows/capacity-analysis-flow';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { StatusTracker } from "../components/StatusTracker";


const ServiceAppointmentCard = React.memo(({ service, vehicles, onEdit }: { service: ServiceRecord, vehicles: Vehicle[], onEdit: () => void }) => {
  const vehicle = vehicles.find(v => v.id === service.vehicleId);
  const getServiceDescriptionText = (service: ServiceRecord) => {
    if (service.serviceItems && service.serviceItems.length > 0) {
      return service.serviceItems.map(item => item.name).join(', ');
    }
    return service.description || 'Servicio sin descripción';
  };

  return (
    <Card className="shadow-sm overflow-hidden mb-4">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row text-sm">
          <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
              <p className="font-semibold text-xl text-foreground">{format(parseISO(service.serviceDate), "dd MMM yyyy", { locale: es })}</p>
              <p className="text-muted-foreground text-xs mt-1">Folio: {service.id}</p>
              <StatusTracker status={service.status} />
          </div>
          <div className="p-4 flex flex-col justify-center flex-grow space-y-2 text-left border-y md:border-y-0 md:border-x">
              <p className="font-bold text-2xl text-black">{vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model}` : 'N/A'}</p>
              <p className="text-sm text-foreground">
                  <span className="font-semibold">{service.serviceType}:</span> {getServiceDescriptionText(service)}
              </p>
          </div>
          <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
              <p className="text-xs text-muted-foreground">Hora de Cita</p>
              <p className="font-bold text-2xl text-black">{format(parseISO(service.serviceDate), "HH:mm", { locale: es })}</p>
          </div>
          <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-56 flex-shrink-0 space-y-2">
              <p className="text-xs text-muted-foreground">Asesor: {service.serviceAdvisorName || 'N/A'}</p>
              <div className="flex justify-center items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={onEdit} title="Ver/Editar Servicio">
                      <Eye className="h-4 w-4" />
                  </Button>
              </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
ServiceAppointmentCard.displayName = 'ServiceAppointmentCard';

function AgendaPageComponent() {
  const { toast } = useToast();
  
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]); 
  const [technicians, setTechnicians] = useState<Technician[]>([]); 
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]); 
  const [hydrated, setHydrated] = useState(false);
  const [version, setVersion] = useState(0);

  const [agendaView, setAgendaView] = useState('lista');
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);

  const [capacityInfo, setCapacityInfo] = useState<CapacityAnalysisOutput | null>(null);
  const [isCapacityLoading, setIsCapacityLoading] = useState(false);

  useEffect(() => {
    hydrateReady.then(() => {
      setHydrated(true);
      setAllServices([...placeholderServiceRecords]);
      setVehicles([...placeholderVehicles]);
      setTechnicians([...placeholderTechnicians]);
      setInventoryItems([...placeholderInventory]);
    });
    const forceUpdate = () => setVersion(v => v + 1);
    window.addEventListener('databaseUpdated', forceUpdate);
    return () => window.removeEventListener('databaseUpdated', forceUpdate);
  }, []);
  
  useEffect(() => {
    if (hydrated) {
      setAllServices([...placeholderServiceRecords]);
      setVehicles([...placeholderVehicles]);
      setTechnicians([...placeholderTechnicians]);
      setInventoryItems([...placeholderInventory]);
    }
  }, [hydrated, version]);

  useEffect(() => {
    if (agendaView === 'lista') {
      const runCapacityAnalysis = async () => {
        setIsCapacityLoading(true);
        const servicesForToday = placeholderServiceRecords.filter(s => {
          if (!s.serviceDate || typeof s.serviceDate !== 'string') return false;
          return isValid(parseISO(s.serviceDate)) && isToday(parseISO(s.serviceDate)) && s.status !== 'Completado' && s.status !== 'Cancelado';
        });
        
        if (servicesForToday.length === 0) {
            setCapacityInfo({ totalRequiredHours: 0, totalAvailableHours: placeholderTechnicians.reduce((sum, t) => sum + (t.standardHoursPerDay || 8), 0), recommendation: "Taller disponible", capacityPercentage: 0 });
            setIsCapacityLoading(false);
            return;
        }

        try {
          const result = await analyzeWorkshopCapacity({
            servicesForDay: servicesForToday.map(s => ({ description: s.description || '' })),
            technicians: placeholderTechnicians.filter(t => !t.isArchived).map(t => ({ id: t.id, standardHoursPerDay: t.standardHoursPerDay || 8 })),
            serviceHistory: placeholderServiceRecords.filter(s => s.serviceDate).map(s => ({ description: s.description || '', serviceDate: s.serviceDate, deliveryDateTime: s.deliveryDateTime })),
          });
          setCapacityInfo(result);
        } catch (e) {
          console.error("Capacity analysis failed:", e);
        } finally {
          setIsCapacityLoading(false);
        }
      };
      runCapacityAnalysis();
    }
  }, [agendaView]);

  const { scheduledServices, todayServices, tomorrowServices } = useMemo(() => {
    const scheduled = allServices.filter(s => s.status === 'Agendado' || (s.status === 'Reparando' && !s.deliveryDateTime));
    const today = new Date();
    const todayS = scheduled.filter(s => isToday(parseISO(s.serviceDate))).sort((a, b) => compareAsc(parseISO(a.serviceDate), parseISO(b.serviceDate)));
    const tomorrowS = scheduled.filter(s => isTomorrow(parseISO(s.serviceDate))).sort((a, b) => compareAsc(parseISO(a.serviceDate), parseISO(b.serviceDate)));
    return { scheduledServices: scheduled, todayServices: todayS, tomorrowServices: tomorrowS };
  }, [allServices]);

  const totalEarningsToday = useMemo(() => {
    return todayServices.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  }, [todayServices]);

  const handleOpenServiceDialog = useCallback((service: ServiceRecord) => {
    setEditingService(service);
    setIsServiceDialogOpen(true);
  }, []);

  const handleUpdateService = useCallback(async (data: ServiceRecord) => {
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === data.id);
    if (pIndex !== -1) placeholderServiceRecords[pIndex] = data;
    else placeholderServiceRecords.push(data);
    await persistToFirestore(['serviceRecords']);
    setIsServiceDialogOpen(false);
    toast({ title: "Servicio Actualizado" });
  }, [toast]);
  
  const handleCancelService = useCallback(async (serviceId: string, reason: string) => {
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (pIndex !== -1) {
      placeholderServiceRecords[pIndex].status = 'Cancelado';
      placeholderServiceRecords[pIndex].cancellationReason = reason;
    }
    await persistToFirestore(['serviceRecords']);
    toast({ title: "Servicio Cancelado" });
  }, [toast]);

  const handleVehicleCreated = useCallback(async (newVehicle: Vehicle) => {
    placeholderVehicles.push(newVehicle);
    await persistToFirestore(['vehicles']);
  }, []);

  if (!hydrated) {
    return <div className="text-center py-10">Cargando datos...</div>;
  }

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Agenda de Citas</h1>
        <p className="text-primary-foreground/80 mt-1">Planifica y visualiza todas las citas y servicios programados.</p>
      </div>
      
      <Tabs value={agendaView} onValueChange={setAgendaView} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="lista" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <List className="mr-2 h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="calendario" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Calendario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Citas para Hoy</span>
                {isCapacityLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Badge variant={capacityInfo?.capacityPercentage && capacityInfo.capacityPercentage > 95 ? "destructive" : "secondary"}>{capacityInfo?.recommendation}</Badge>}
              </CardTitle>
              <CardDescription>
                Ganancia total estimada para hoy: {totalEarningsToday.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayServices.length > 0 ? todayServices.map(service => (<ServiceAppointmentCard key={service.id} service={service} vehicles={vehicles} onEdit={() => handleOpenServiceDialog(service)} />)) : <p className="text-muted-foreground text-center py-4">No hay citas para hoy.</p>}
            </CardContent>
          </Card>
           <Card>
            <CardHeader><CardTitle>Citas para Mañana</CardTitle></CardHeader>
            <CardContent>
              {tomorrowServices.length > 0 ? tomorrowServices.map(service => (<ServiceAppointmentCard key={service.id} service={service} vehicles={vehicles} onEdit={() => handleOpenServiceDialog(service)} />)) : <p className="text-muted-foreground text-center py-4">No hay citas para mañana.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendario">
          <ServiceCalendar services={scheduledServices} vehicles={vehicles} technicians={technicians} onServiceClick={handleOpenServiceDialog} />
        </TabsContent>
      </Tabs>

      {isServiceDialogOpen && (
        <ServiceDialog
          open={isServiceDialogOpen}
          onOpenChange={setIsServiceDialogOpen}
          service={editingService}
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={handleUpdateService as any}
          onVehicleCreated={handleVehicleCreated}
          onCancelService={handleCancelService}
          mode="service"
        />
      )}
    </>
  );
}

export default function AgendaPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Cargando...</div>}>
      <AgendaPageComponent />
    </Suspense>
  );
}
