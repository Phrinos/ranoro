
"use client";

import { useEffect, useState } from "react";
import { format, parseISO, isToday, isFuture, isValid, compareAsc } from "date-fns"; // Added compareAsc
import { es } from 'date-fns/locale';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Car, User, Wrench, CheckCircle, CalendarClock, Clock, AlertTriangle } from "lucide-react";

interface EnrichedServiceRecord extends ServiceRecord {
  vehicleInfo?: string;
  technicianName?: string;
}

// Renamed from KanbanColumn and adapted
const DashboardServiceSection = ({ 
  title, 
  services, 
  icon: IconCmp, 
  emptyMessage,
  isLoading // Added isLoading prop
}: { 
  title: string, 
  services: EnrichedServiceRecord[], 
  icon: React.ElementType, 
  emptyMessage: string,
  isLoading: boolean 
}) => (
  <Card className="flex flex-col shadow-lg">
    <CardHeader className="pb-3 sticky top-0 bg-card z-10 border-b">
      <CardTitle className="text-lg font-semibold flex items-center gap-2">
        <IconCmp className="h-5 w-5 text-primary" />
        {title} ({services.length})
      </CardTitle>
    </CardHeader>
    <ScrollArea className="flex-grow h-[calc(100vh/3-8rem)] min-h-[200px]"> {/* Adjusted height */}
      <CardContent className="p-4 space-y-3">
        {isLoading && services.length === 0 ? (
           Array.from({ length: 2 }).map((_, index) => ( // Show fewer skeletons for horizontal layout
            <Card key={index} className="p-4 animate-pulse w-full">
              <div className="flex gap-4">
                <div className="flex-shrink-0 bg-muted rounded h-10 w-10"></div>
                <div className="flex-grow space-y-2">
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

            return (
              <Card key={service.id} className="w-full shadow-sm hover:shadow-md transition-shadow duration-150">
                <CardContent className="p-3 flex flex-col sm:flex-row items-start gap-3">
                  <div className="flex-shrink-0 pt-1">
                    <Car className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-grow space-y-1 w-full">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                      <h4 className="text-sm font-semibold text-foreground">{service.vehicleInfo}</h4>
                      <Badge variant={statusVariant} className="mt-1 sm:mt-0 text-xs">{service.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">ID Servicio: {service.id}</p>
                    <p className="text-xs text-foreground pt-0.5">{service.description}</p>
                    <div className="flex flex-col sm:flex-row justify-between text-xs text-muted-foreground pt-0.5">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {service.technicianName || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {service.status === "Completado" && service.deliveryDateTime && isValid(parseISO(service.deliveryDateTime))
                          ? `Entregado: ${format(parseISO(service.deliveryDateTime), "dd MMM, HH:mm", { locale: es })}`
                          : service.serviceDate && isValid(parseISO(service.serviceDate))
                            ? `Recepción: ${format(parseISO(service.serviceDate), "dd MMM, HH:mm", { locale: es })}`
                            : 'N/A'}
                      </div>
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
    </ScrollArea>
  </Card>
);


export default function DashboardPage() {
  const [repairingServices, setRepairingServices] = useState<EnrichedServiceRecord[]>([]);
  const [scheduledServices, setScheduledServices] = useState<EnrichedServiceRecord[]>([]);
  const [completedTodayServices, setCompletedTodayServices] = useState<EnrichedServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const clientToday = new Date();

    const enrichedServices = placeholderServiceRecords.map(service => {
      const vehicle = placeholderVehicles.find(v => v.id === service.vehicleId);
      const technician = placeholderTechnicians.find(t => t.id === service.technicianId);
      return {
        ...service,
        vehicleInfo: vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model}` : `Vehículo ID: ${service.vehicleId}`,
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
    });
    
    const completedToday = enrichedServices.filter(s => {
      if (s.status !== 'Completado') return false;
      try {
        const completionOrServiceDate = s.deliveryDateTime || s.serviceDate;
        const serviceDay = parseISO(completionOrServiceDate); 
        return isValid(serviceDay) && isToday(serviceDay);
      } catch (e) {
        console.error("Error parsing service date for completed today:", s.serviceDate, e);
        // Fallback for potentially problematic date strings if parseISO fails
        return (s.deliveryDateTime || s.serviceDate).startsWith(format(clientToday, 'yyyy-MM-dd'));
      }
    });

    setRepairingServices(repairing);
    setScheduledServices(scheduled.sort((a,b) => compareAsc(parseISO(a.serviceDate), parseISO(b.serviceDate)))); // Sort upcoming
    setCompletedTodayServices(completedToday);
    setIsLoading(false);
  }, []);


  return (
    <div className="container mx-auto py-8 flex flex-col h-full">
      <PageHeader
        title="Panel Principal de Taller"
        description="Vista del estado actual de los servicios."
      />

      <div className="flex flex-col gap-6">
        <DashboardServiceSection 
          title="En Reparación" 
          services={repairingServices} 
          icon={Wrench} // Changed icon
          emptyMessage="No hay servicios en reparación actualmente."
          isLoading={isLoading}
        />
        <DashboardServiceSection 
          title="Agendados (Hoy/Futuro)" 
          services={scheduledServices} 
          icon={CalendarClock} // Changed icon
          emptyMessage="No hay servicios agendados."
          isLoading={isLoading}
        />
        <DashboardServiceSection 
          title="Completados Hoy" 
          services={completedTodayServices} 
          icon={CheckCircle}
          emptyMessage="No se han completado servicios hoy."
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

