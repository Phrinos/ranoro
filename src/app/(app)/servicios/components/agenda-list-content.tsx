

"use client";

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ServiceAppointmentCard } from './ServiceAppointmentCard';
import type { ServiceRecord, Vehicle, User } from '@/types';
import { isTomorrow, addDays, compareAsc, isSameDay } from 'date-fns';
import { parseDate } from '@/lib/forms';
import { useToast } from '@/hooks/use-toast';
import { serviceService } from '@/lib/services';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface AgendaListContentProps {
  services: ServiceRecord[];
  vehicles: Vehicle[];
  personnel: User[];
  onShowPreview: (service: ServiceRecord) => void;
}

export default function AgendaListContent({
  services,
  vehicles,
  personnel,
  onShowPreview,
}: AgendaListContentProps) {
  const router = useRouter();
  const { toast } = useToast();

  const { tomorrowServices, futureServices } = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const byDateAsc = (a: ServiceRecord, b: ServiceRecord) => {
      const dateA = parseDate(a.serviceDate);
      const dateB = parseDate(b.serviceDate);
      if (!dateA) return 1;
      if (!dateB) return -1;
      return compareAsc(dateA, dateB);
    };

    const tomorrowS = services
      .filter((s) => isTomorrow(parseDate(s.serviceDate)!))
      .sort(byDateAsc);
      
    const futureS = services
      .filter((s) => {
        const d = parseDate(s.serviceDate);
        return d && d > tomorrow && !isSameDay(d, tomorrow);
      })
      .sort(byDateAsc);
      
    return { tomorrowServices: tomorrowS, futureServices: futureS };
  }, [services]);
  
  const handleConfirmAppointment = useCallback(async (serviceId: string) => {
    await serviceService.updateService(serviceId, { appointmentStatus: 'Confirmada' });
    toast({
      title: "Cita Confirmada",
      description: `La cita para el servicio #${serviceId.slice(-6)} ha sido marcada como confirmada.`,
    });
  }, [toast]);
  
  const handleEditService = (serviceId: string) => {
    router.push(`/servicios/${serviceId}`);
  };

  const renderServiceCard = useCallback((service: ServiceRecord) => (
    <ServiceAppointmentCard 
      key={service.id}
      service={service}
      vehicles={vehicles}
      technicians={personnel}
      onEdit={() => handleEditService(service.id)}
      onView={() => onShowPreview(service)}
      onConfirm={() => handleConfirmAppointment(service.id)}
    />
  ), [vehicles, personnel, onShowPreview, handleConfirmAppointment, router]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Citas para Mañana</CardTitle></CardHeader>
        <CardContent>
          {tomorrowServices.length > 0 ? tomorrowServices.map(renderServiceCard) : <p className="text-muted-foreground text-center py-4">No hay citas para mañana.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Próximas Citas</CardTitle></CardHeader>
        <CardContent>
          {futureServices.length > 0 ? futureServices.map(renderServiceCard) : <p className="text-muted-foreground text-center py-4">No hay citas futuras agendadas.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
