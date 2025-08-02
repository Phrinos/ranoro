

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, List, Calendar as CalendarIcon, FileCheck, Eye, Loader2, Edit, CheckCircle, Printer, MessageSquare, Ban, DollarSign } from "lucide-react";
import { ServiceDialog } from "../components/service-dialog";
import type { ServiceRecord, Vehicle, Technician, QuoteRecord, InventoryItem, CapacityAnalysisOutput, ServiceTypeRecord, WorkshopInfo, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, isTomorrow, compareAsc, compareDesc, isSameDay, addDays, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceCalendar } from '../components/service-calendar';
import { analyzeWorkshopCapacity } from '@/ai/flows/capacity-analysis-flow';
import { Badge } from "@/components/ui/badge";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { ServiceAppointmentCard } from '../components/ServiceAppointmentCard';
import { inventoryService, personnelService, operationsService, adminService } from '@/lib/services';
import type { VehicleFormValues } from "../../vehiculos/components/vehicle-form";
import { PaymentDetailsDialog, type PaymentDetailsFormValues } from '../components/PaymentDetailsDialog';
import { parseDate } from '@/lib/forms';
import { db } from '@/lib/firebaseClient';
import { writeBatch } from 'firebase/firestore';


const handleAiError = (error: any, toast: any, context: string): string => {
    console.error(`AI Error in ${context}:`, error);
    let message = `La IA no pudo completar la acción de ${context}.`;
    if (error instanceof Error && error.message.includes('503')) {
        message = "El modelo de IA está sobrecargado. Por favor, inténtelo de nuevo más tarde.";
    }
    toast({ title: "Error de IA", description: message, variant: "destructive" });
    return message;
};

function AgendaPageComponent() {
  const { toast } = useToast();
  
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]); 
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]); 
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);

  const [capacityInfo, setCapacityInfo] = useState<CapacityAnalysisOutput | null>(null);
  const [isCapacityLoading, setIsCapacityLoading] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [serviceForPreview, setServiceForPreview] = useState<ServiceRecord | null>(null);
  
  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);


  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);

    unsubs.push(operationsService.onServicesUpdate(setAllServices));
    unsubs.push(inventoryService.onVehiclesUpdate(setVehicles));
    unsubs.push(adminService.onUsersUpdate(setPersonnel));
    unsubs.push(inventoryService.onItemsUpdate(setInventoryItems));
    unsubs.push(inventoryService.onServiceTypesUpdate((data) => {
        setServiceTypes(data);
        setIsLoading(false);
    }));

    return () => unsubs.forEach((unsub) => unsub());
  }, []);
  
  const { scheduledServices, todayServices, tomorrowServices, futureServices } = useMemo(() => {
    if (isLoading) {
      return { scheduledServices: [], todayServices: [], tomorrowServices: [], futureServices: [] };
    }
    
    const now = new Date();
    const today = now;
    const tomorrow = addDays(today, 1);
  
    const byDateAsc = (a: ServiceRecord, b: ServiceRecord) => {
      const dateA = parseDate(a.serviceDate);
      const dateB = parseDate(b.serviceDate);
      if (!dateA) return 1;
      if (!dateB) return -1;
      return compareAsc(dateA, dateB);
    };

    const byDateDesc = (a: ServiceRecord, b: ServiceRecord) => {
      const dateA = parseDate(a.serviceDate);
      const dateB = parseDate(b.serviceDate);
      if (!dateA) return 1;
      if (!dateB) return -1;
      return compareDesc(dateA, dateB);
    };
  
    const isSame = (d: Date | null, ref: Date) => d && isValid(d) && isSameDay(d, ref);
  
    // Actives are any service not yet delivered or cancelled.
    const activeServices = allServices.filter(s => s.status !== 'Entregado' && s.status !== 'Cancelado');

    // Today's services are those 'En Taller' OR scheduled for today OR delivered today.
    const todayS = allServices.filter(s => {
      // Include services 'En Taller' regardless of date
      if (s.status === 'En Taller') {
        return true;
      }
      const serviceDay = parseDate(s.serviceDate);
      if (s.status === 'Agendado' && isSame(serviceDay, today)) {
        return true;
      }
      const deliveryDay = parseDate(s.deliveryDateTime);
      if (s.status === 'Entregado' && isSame(deliveryDay, today)) {
        return true;
      }
      return false;
    }).sort(byDateDesc);
  
    // Tomorrow's services are only those explicitly scheduled for tomorrow.
    const tomorrowS = activeServices
      .filter((s) => s.status === 'Agendado' && isSame(parseDate(s.serviceDate), tomorrow))
      .sort(byDateAsc);
  
    // Future services are those scheduled after tomorrow.
    const futureS = activeServices
      .filter((s) => {
        const d = parseDate(s.serviceDate);
        return s.status === 'Agendado' && d && d > tomorrow && !isSameDay(d, tomorrow);
      })
      .sort(byDateAsc);
  
    return {
      scheduledServices: activeServices,
      todayServices: todayS,
      tomorrowServices: tomorrowS,
      futureServices: futureS,
    };
  }, [allServices, isLoading]);

  useEffect(() => {
    if (agendaView === 'lista' && !isLoading) {
      const runCapacityAnalysis = async () => {
        setIsCapacityLoading(true);
        setCapacityError(null);
        try {
          const servicesForToday = todayServices;
          
          if (servicesForToday.length === 0) {
              setCapacityInfo({ totalRequiredHours: 0, totalAvailableHours: personnel.reduce((sum, t) => sum + (t.standardHoursPerDay || 8), 0), recommendation: "Taller disponible", capacityPercentage: 0 });
              setIsCapacityLoading(false);
              return;
          }

          const result = await analyzeWorkshopCapacity({
            servicesForDay: servicesForToday.map(s => ({ description: s.description || '' })),
            technicians: personnel.filter(t => !t.isArchived).map(t => ({ id: t.id, standardHoursPerDay: t.standardHoursPerDay || 8 })),
            serviceHistory: allServices
              .filter(s => s.serviceDate)
              .map(s => ({
                  description: s.description || '',
                  serviceDate: parseDate(s.serviceDate)?.toISOString(),
                  deliveryDateTime: parseDate(s.deliveryDateTime)?.toISOString(),
              })),
          });
          setCapacityInfo(result);
        } catch (e) {
          setCapacityError(handleAiError(e, toast, 'análisis de capacidad'));
        } finally {
          setIsCapacityLoading(false);
        }
      };
      runCapacityAnalysis();
    }
  }, [agendaView, toast, isLoading, allServices, personnel, todayServices]);

  const totalEarningsToday = useMemo(() => {
    return todayServices.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  }, [todayServices]);

  const handleOpenServiceDialog = useCallback((service: ServiceRecord | null) => {
    setEditingService(service);
    setIsServiceDialogOpen(true);
  }, []);
  
  const handleShowPreview = useCallback((service: ServiceRecord) => {
    setServiceForPreview(service);
    setIsSheetOpen(true);
  }, []);
  
  const handleCancelService = useCallback(async (serviceId: string, reason: string) => {
    await operationsService.cancelService(serviceId, reason);
    toast({ title: "Servicio Cancelado" });
    setIsServiceDialogOpen(false);
  }, [toast]);


  const handleVehicleCreated = useCallback(async (newVehicle: Omit<Vehicle, 'id'>) => {
      await inventoryService.addVehicle(newVehicle as VehicleFormValues);
      toast({ title: "Vehículo Creado" });
  }, [toast]);
  
  const handleConfirmAppointment = useCallback(async (serviceId: string) => {
    await operationsService.updateService(serviceId, { appointmentStatus: 'Confirmada' });
    toast({
      title: "Cita Confirmada",
      description: `La cita para el servicio #${serviceId} ha sido marcada como confirmada.`,
    });
  }, [toast]);
  
  const handleSaveService = useCallback(async (data: ServiceRecord | QuoteRecord) => {
      if ('status' in data) {
        if(data.id) {
            await operationsService.updateService(data.id, data);
        } else {
            await operationsService.addService(data);
        }
      }
      setIsServiceDialogOpen(false);
  }, []);

  const handleOpenCompleteDialog = useCallback((service: ServiceRecord) => {
    setServiceToComplete(service);
    setIsPaymentDialogOpen(true);
  }, []);
  
  const handleConfirmCompletion = useCallback(async (serviceId: string, paymentDetails: PaymentDetailsFormValues) => {
    const serviceToUpdate = allServices.find(s => s.id === serviceId);
    if (!serviceToUpdate) return;
    
    if(!db) return toast({ title: "Error de base de datos", variant: "destructive"});
    try {
        const batch = writeBatch(db);
        await operationsService.completeService(serviceToUpdate, { ...paymentDetails, nextServiceInfo: serviceToUpdate.nextServiceInfo }, batch);
        await batch.commit();
        setIsPaymentDialogOpen(false);
        toast({
            title: "Servicio Completado",
            description: `El servicio para ${serviceToUpdate.vehicleIdentifier} ha sido marcado como entregado.`,
        });
    } catch (e) {
        console.error(e);
        setIsPaymentDialogOpen(false);
        toast({ title: "Error al Completar", description: `No se pudo completar el servicio.`, variant: "destructive" });
    }
  }, [toast, allServices]);

  const renderCapacityBadge = () => {
    if (isCapacityLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
    if (capacityError) return <Badge variant="destructive" title={capacityError}>Error de IA</Badge>;
    if (!capacityInfo) return null;

    const { capacityPercentage, recommendation } = capacityInfo;
    const isOverloaded = capacityPercentage > 95;
    
    let text = recommendation;
    if (recommendation === "Se pueden aceptar más trabajos") {
        const remainingPercentage = 100 - capacityPercentage;
        text = `${recommendation} (${remainingPercentage}% libre)`;
    }

    return (
        <Badge variant={isOverloaded ? "destructive" : "secondary"}>{text}</Badge>
    );
};
  const [activeView, setActiveView] = useState('lista');

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-3">Cargando datos...</span>
        </div>
    );
  }

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Agenda de Citas</h1>
        <p className="text-primary-foreground/80 mt-1">Planifica y visualiza todas las citas y servicios programados.</p>
      </div>
      
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
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
                {renderCapacityBadge()}
              </CardTitle>
              <CardDescription>
                Ganancia total estimada para hoy: {totalEarningsToday.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayServices.length > 0 ? todayServices.map(service => (<ServiceAppointmentCard key={service.id} service={service} vehicles={vehicles} technicians={personnel} onEdit={() => handleOpenServiceDialog(service)} onConfirm={() => handleConfirmAppointment(service.id)} onView={() => handleShowPreview(service)} onComplete={() => handleOpenCompleteDialog(service)} onCancel={() => { const reason = prompt('Motivo de cancelación:'); if(reason) handleCancelService(service.id, reason)}}/>)) : <p className="text-muted-foreground text-center py-4">No hay citas para hoy.</p>}
            </CardContent>
          </Card>
           <Card>
            <CardHeader><CardTitle>Citas para Mañana</CardTitle></CardHeader>
            <CardContent>
              {tomorrowServices.length > 0 ? tomorrowServices.map(service => (<ServiceAppointmentCard key={service.id} service={service} vehicles={vehicles} technicians={personnel} onEdit={() => handleOpenServiceDialog(service)} onConfirm={() => handleConfirmAppointment(service.id)} onView={() => handleShowPreview(service)} />)) : <p className="text-muted-foreground text-center py-4">No hay citas para mañana.</p>}
            </CardContent>
          </Card>
           <Card>
            <CardHeader><CardTitle>Próximas Citas</CardTitle></CardHeader>
            <CardContent>
              {futureServices.length > 0 ? futureServices.map(service => (<ServiceAppointmentCard key={service.id} service={service} vehicles={vehicles} technicians={personnel} onEdit={() => handleOpenServiceDialog(service)} onConfirm={() => handleConfirmAppointment(service.id)} onView={() => handleShowPreview(service)} />)) : <p className="text-muted-foreground text-center py-4">No hay citas futuras agendadas.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendario">
          <ServiceCalendar services={scheduledServices} vehicles={vehicles} technicians={personnel as Technician[]} onServiceClick={(s) => handleOpenServiceDialog(s)} />
        </TabsContent>
      </Tabs>

      {isServiceDialogOpen && (
        <ServiceDialog
          open={isServiceDialogOpen}
          onOpenChange={setIsServiceDialogOpen}
          service={editingService}
          vehicles={vehicles}
          technicians={personnel}
          inventoryItems={inventoryItems}
          serviceTypes={serviceTypes}
          onSave={handleSaveService}
          onCancelService={handleCancelService}
          onComplete={handleConfirmCompletion}
        />
      )}
      
       {isSheetOpen && serviceForPreview && (
        <UnifiedPreviewDialog
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          service={serviceForPreview}
        />
      )}
      
      {serviceToComplete && (
        <PaymentDetailsDialog
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            service={serviceToComplete}
            onConfirm={handleConfirmCompletion}
            isCompletionFlow={true}
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
