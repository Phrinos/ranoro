"use client";

import { useEffect, useState, useCallback } from "react";
import { format, parseISO, isToday, isFuture, isValid, compareAsc } from "date-fns";
import { es } from 'date-fns/locale';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, User, QuoteRecord } from "@/types";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon, Wrench, CheckCircle, CalendarClock, Clock, AlertTriangle } from "lucide-react"; 
import { ServiceDialog } from "../servicios/components/service-dialog";
import { useToast } from "@/hooks/use-toast";

interface EnrichedServiceRecord extends ServiceRecord {
  vehicleInfo?: string;
  technicianName?: string;
}

const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DashboardServiceSection = ({ 
  title, 
  services, 
  icon: IconCmp, 
  emptyMessage,
  isLoading,
  onServiceClick 
}: { 
  title: string, 
  services: EnrichedServiceRecord[], 
  icon: React.ElementType, 
  emptyMessage: string,
  isLoading: boolean,
  onServiceClick: (service: EnrichedServiceRecord) => void; 
}) => (
  <Card className="flex flex-col shadow-lg">
    <CardHeader className="pb-3 sticky top-0 bg-card z-10 border-b">
      <CardTitle className="text-lg font-semibold flex items-center gap-2">
        <IconCmp className="h-5 w-5 text-primary shrink-0" />
        <span>{title} ({services.length})</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="p-2 space-y-2">
      {isLoading && services.length === 0 ? (
          Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="p-2.5 animate-pulse w-full"> 
            <div className="flex gap-3"> 
              <div className="flex-grow space-y-1.5"> 
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="flex justify-between">
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              </div>
            </div>
          </Card>
        ))
      ) : services.length > 0 ? (
        services.map((service) => {
          let statusVariant: "default" | "secondary" | "outline" | "destructive" | "success" = "default";
          if (service.status === "Reparando") statusVariant = "secondary";
          else if (service.status === "Completado") statusVariant = "success";
          else if (service.status === "Cancelado") statusVariant = "destructive";
          
          const totalCostFormatted = formatCurrency(service.totalCost);
          const serviceProfitFormatted = formatCurrency(service.serviceProfit || 0);
          const serviceDateObj = service.serviceDate ? parseISO(service.serviceDate) : null;
          const deliveryDateObj = service.deliveryDateTime ? parseISO(service.deliveryDateTime) : null;
          const serviceReceptionTime = serviceDateObj && isValid(serviceDateObj) ? format(serviceDateObj, "HH:mm", { locale: es }) : 'N/A';
          const formattedDeliveryDateTime = deliveryDateObj && isValid(deliveryDateObj) ? format(deliveryDateObj, "dd MMM yy, HH:mm", { locale: es }) : 'N/A';


          return (
            <Card 
                key={service.id} 
                className="w-full shadow-sm hover:shadow-md transition-shadow duration-150 cursor-pointer hover:bg-muted/50"
                onClick={() => onServiceClick(service)}
              >
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
                                <span>{service.technicianName}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Fecha de Entrega">
                                {service.status === 'Completado' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <CalendarClock className="h-4 w-4" />}
                                <span>Entrega: {formattedDeliveryDateTime}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="ID de Servicio">
                                <span>ID: {service.id}</span>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                            <div className="flex-grow">
                                <h4 className="font-semibold text-lg" title={service.vehicleInfo}>
                                    {service.vehicleInfo}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1 truncate" title={service.description}>
                                    {service.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="w-48 shrink-0 flex flex-col items-center justify-center p-4 gap-y-2">
                        <Badge variant={statusVariant} className="w-full justify-center text-center text-base">{service.status}</Badge>
                    </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <p className="text-muted-foreground text-center py-10">{emptyMessage}</p>
      )}
    </CardContent>
  </Card>
);


export default function DashboardPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [repairingServices, setRepairingServices] = useState<EnrichedServiceRecord[]>([]);
  const [scheduledServices, setScheduledServices] = useState<EnrichedServiceRecord[]>([]);
  const [completedTodayServices, setCompletedTodayServices] = useState<EnrichedServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [vehicles, setVehiclesState] = useState<Vehicle[]>(placeholderVehicles);
  const [technicians, setTechniciansState] = useState<Technician[]>(placeholderTechnicians);
  const [inventoryItems, setInventoryItemsState] = useState<InventoryItem[]>(placeholderInventory);
  
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [selectedServiceForDialog, setSelectedServiceForDialog] = useState<ServiceRecord | null>(null);
  const { toast } = useToast();

  const loadAndFilterServices = useCallback(() => {
    setIsLoading(true);
    const clientToday = new Date();

    const enrichedServices = placeholderServiceRecords.map(service => {
      const vehicle = vehicles.find(v => v.id === service.vehicleId);
      const technician = technicians.find(t => t.id === service.technicianId);
      return {
        ...service,
        vehicleInfo: vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model} ${vehicle.year}` : `Vehículo ID: ${service.vehicleId}`,
        technicianName: technician ? technician.name : `Técnico ID: ${service.technicianId}`,
      };
    });

    const repairing = enrichedServices.filter(s => s.status === 'Reparando');
    
    const scheduled = enrichedServices.filter(s => {
      if (s.status !== 'Agendado') return false;
      try {
        const serviceDay = parseISO(s.serviceDate);
        return isValid(serviceDay) && (isToday(serviceDay) || isFuture(serviceDay));
      } catch (e) {
        console.error("Error parsing service date for scheduled services:", s.serviceDate, e);
        return false; 
      }
    }).sort((a,b) => compareAsc(parseISO(a.serviceDate), parseISO(b.serviceDate)));
    
    const completedToday = enrichedServices.filter(s => {
      if (s.status !== 'Completado') return false;
      try {
        const completionOrServiceDate = s.deliveryDateTime || s.serviceDate;
        const serviceDay = parseISO(completionOrServiceDate); 
        return isValid(serviceDay) && isToday(serviceDay);
      } catch (e) {
        console.error("Error parsing service date for completed today:", s.serviceDate, e);
        return (s.deliveryDateTime || s.serviceDate).startsWith(format(clientToday, 'yyyy-MM-dd'));
      }
    });

    setRepairingServices(repairing);
    setScheduledServices(scheduled);
    setCompletedTodayServices(completedToday);
    setIsLoading(false);
  }, [vehicles, technicians]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authUserString = localStorage.getItem('authUser');
      if (authUserString) {
        try {
          const authUser: User = JSON.parse(authUserString);
          setUserName(authUser.name);
        } catch (e) {
          console.error("Failed to parse authUser for dashboard welcome message:", e);
          setUserName(null);
        }
      } else {
         setUserName(null);
      }
    }
    loadAndFilterServices();
  }, [loadAndFilterServices]);

  const handleOpenServiceDialog = (service: EnrichedServiceRecord) => {
    const originalService = placeholderServiceRecords.find(s => s.id === service.id);
    if (originalService) {
        setSelectedServiceForDialog(originalService);
        setIsServiceDialogOpen(true);
    } else {
        toast({
            title: "Error",
            description: "No se pudo encontrar el servicio original para mostrar detalles.",
            variant: "destructive"
        });
    }
  };
  
  const handleUpdateService = async (data: ServiceRecord | QuoteRecord) => {
    // In the context of the dashboard, 'data' will always be a ServiceRecord
    // because the ServiceDialog is instantiated in 'service' mode.
    if (!('status' in data)) {
      toast({title: "Error de Tipo", description: "Se esperaba actualizar un servicio.", variant: "destructive"});
      return;
    }
    const updatedServiceData = data as ServiceRecord;

    const pIndex = placeholderServiceRecords.findIndex(s => s.id === updatedServiceData.id);
    if (pIndex !== -1) {
      placeholderServiceRecords[pIndex] = updatedServiceData;
    }
    loadAndFilterServices(); 
    toast({
      title: "Servicio Actualizado",
      description: `El servicio ${updatedServiceData.id} ha sido actualizado.`,
    });
    setIsServiceDialogOpen(false);
    setSelectedServiceForDialog(null);
  };

  const onVehicleCreated = (newVehicle: Vehicle) => {
    setVehiclesState(currentVehicles => {
      if (currentVehicles.find(v => v.id === newVehicle.id)) return currentVehicles;
      const updated = [...currentVehicles, newVehicle];
      if (!placeholderVehicles.find(v => v.id === newVehicle.id)) {
         placeholderVehicles.push(newVehicle);
      }
      return updated;
    });
    toast({ title: "Vehículo Registrado", description: `El vehículo ${newVehicle.licensePlate} ha sido agregado.` });
  };


  return (
    <div className="container mx-auto py-8 flex flex-col">
      <PageHeader
        title={userName ? `¡Bienvenido, ${userName}!` : "Panel Principal de Taller"}
        description="Vista del estado actual de los servicios."
      />

      <div className="flex flex-col gap-6">
        <DashboardServiceSection 
          title="En Reparación" 
          services={repairingServices} 
          icon={Wrench}
          emptyMessage="No hay servicios en reparación actualmente."
          isLoading={isLoading}
          onServiceClick={handleOpenServiceDialog}
        />
        <DashboardServiceSection 
          title="Agendados (Hoy/Futuro)" 
          services={scheduledServices} 
          icon={CalendarClock}
          emptyMessage="No hay servicios agendados."
          isLoading={isLoading}
          onServiceClick={handleOpenServiceDialog}
        />
        <DashboardServiceSection 
          title="Completados Hoy" 
          services={completedTodayServices} 
          icon={CheckCircle}
          emptyMessage="No se han completado servicios hoy."
          isLoading={isLoading}
          onServiceClick={handleOpenServiceDialog}
        />
      </div>
      {isServiceDialogOpen && selectedServiceForDialog && (
        <ServiceDialog
          open={isServiceDialogOpen}
          onOpenChange={setIsServiceDialogOpen}
          service={selectedServiceForDialog}
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={handleUpdateService}
          onVehicleCreated={onVehicleCreated}
        />
      )}
    </div>
  );
}
