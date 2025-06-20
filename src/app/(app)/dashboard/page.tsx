
"use client";

import { useEffect, useState } from "react";
import { format, parseISO, isToday } from "date-fns";
import { es } from 'date-fns/locale';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Car, User, Wrench, CheckCircle, Loader2 } from "lucide-react";

interface EnrichedServiceRecord extends ServiceRecord {
  vehicleInfo?: string;
  technicianName?: string;
}

export default function DashboardPage() {
  const [inProgressServices, setInProgressServices] = useState<EnrichedServiceRecord[]>([]);
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

    const inProg = enrichedServices.filter(s => s.status === 'En Progreso');
    
    const completedToday = enrichedServices.filter(s => {
      if (s.status !== 'Completado') return false;
      try {
        const completionOrServiceDate = s.deliveryDateTime ? s.deliveryDateTime : s.serviceDate;
        const serviceDay = parseISO(completionOrServiceDate); 
        return isToday(serviceDay);
      } catch (e) {
        console.error("Error parsing service date for dashboard:", s.serviceDate, e);
        return s.serviceDate.startsWith(format(clientToday, 'yyyy-MM-dd'));
      }
    });

    setInProgressServices(inProg);
    setCompletedTodayServices(completedToday);
    setIsLoading(false);
  }, []);

  const KanbanColumn = ({ title, services, icon: IconCmp, emptyMessage }: { title: string, services: EnrichedServiceRecord[], icon: React.ElementType, emptyMessage: string }) => (
    <Card className="flex flex-col shadow-lg h-[calc(100vh-15rem)]"> 
      <CardHeader className="pb-3 sticky top-0 bg-card z-10 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <IconCmp className="h-5 w-5 text-primary" />
          {title} ({services.length})
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-4 space-y-4">
          {isLoading && services.length === 0 ? (
             Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </Card>
            ))
          ) : services.length > 0 ? (
            services.map((service) => (
              <Card key={service.id} className="shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground shrink-0"/> {service.vehicleInfo}
                  </CardTitle>
                   <CardDescription className="text-xs text-muted-foreground">ID Servicio: {service.id}</CardDescription>
                </CardHeader>
                <CardContent className="pb-3 px-4 space-y-1">
                  <div className="flex items-start gap-2 text-sm">
                    <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"/>
                    <p className="font-normal">{service.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground shrink-0"/> 
                    <p className="text-muted-foreground">{service.technicianName || 'N/A'}</p>
                  </div>
                   {service.deliveryDateTime && service.status === "Completado" && (
                     <p className="text-xs text-green-600">
                        Entregado: {format(parseISO(service.deliveryDateTime), "dd MMM yyyy, HH:mm", { locale: es })}
                     </p>
                   )}
                    {service.status === "En Progreso" && service.serviceDate && (
                        <p className="text-xs text-blue-600">
                            Recepción: {format(parseISO(service.serviceDate), "dd MMM yyyy, HH:mm", { locale: es })}
                        </p>
                    )}
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-10">{emptyMessage}</p>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );

  return (
    <div className="container mx-auto py-8 flex flex-col h-full">
      <PageHeader
        title="Panel Principal de Taller"
        description="Vista Kanban del estado de los servicios."
      />

      <div className="grid flex-grow gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        <KanbanColumn 
          title="En Progreso" 
          services={inProgressServices} 
          icon={Loader2}
          emptyMessage="No hay servicios en progreso actualmente."
        />
        <KanbanColumn 
          title="Completado Hoy" 
          services={completedTodayServices} 
          icon={CheckCircle}
          emptyMessage="No se han completado servicios hoy."
        />
      </div>
    </div>
  );
}
