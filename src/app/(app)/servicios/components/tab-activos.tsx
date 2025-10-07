// src/app/(app)/servicios/components/tab-activos.tsx
"use client";

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ServiceRecord, Vehicle, User } from '@/types';
import { ServiceAppointmentCard } from './ServiceAppointmentCard';
import { startOfDay, endOfDay, isWithinInterval, isValid, compareDesc } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { parseDate } from "@/lib/forms";
import { formatCurrency } from '@/lib/utils';
import { serviceService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { DailyEarningsCard } from './DailyEarningsCard';

const TZ = "America/Mexico_City";

interface ActivosTabContentProps {
  allServices: ServiceRecord[];
  vehicles: Vehicle[];
  personnel: User[];
  currentUser: User | null;
  onShowShareDialog: (service: ServiceRecord) => void;
  onShowTicket: (service: ServiceRecord) => void;
  onCompleteService: (service: ServiceRecord) => void;
  onDelete: (serviceId: string) => void;
}

const getStatusPriority = (status: ServiceRecord['status']): number => {
    switch (status) {
        case 'Agendado': return 1;
        case 'En Taller': return 2;
        case 'Entregado': return 3;
        default: return 4;
    }
};

const getDateForService = (service: ServiceRecord): Date | null => {
    switch (service.status) {
        case 'Agendado':
            return parseDate(service.appointmentDateTime);
        case 'En Taller':
            return parseDate(service.receptionDateTime);
        case 'Entregado':
            return parseDate(service.deliveryDateTime);
        default:
            return parseDate(service.serviceDate); 
    }
};

export default function ActivosTabContent({
  allServices,
  vehicles,
  personnel,
  currentUser,
  onShowShareDialog,
  onShowTicket,
  onCompleteService,
  onDelete,
}: ActivosTabContentProps) {
  const router = useRouter();
  const { toast } = useToast();

  const nowZ = toZonedTime(new Date(), TZ);
  const todayStart = startOfDay(nowZ);
  const todayEnd = endOfDay(nowZ);

  const activeServices = useMemo(() => {
    return allServices.filter(s => {
      if (s.status === 'En Taller') return true;

      const appointmentDate = parseDate(s.appointmentDateTime);
      if (s.status === 'Agendado' && appointmentDate && isValid(appointmentDate) && isWithinInterval(toZonedTime(appointmentDate, TZ), { start: todayStart, end: todayEnd })) {
        return true;
      }
      
      const deliveryDate = parseDate(s.deliveryDateTime);
      if (s.status === 'Entregado' && deliveryDate && isValid(deliveryDate) && isWithinInterval(toZonedTime(deliveryDate, TZ), { start: todayStart, end: todayEnd })) {
        return true;
      }

      return false;
    });
  }, [allServices, todayStart, todayEnd]);


  const sortedServices = useMemo(() => {
    return [...activeServices].sort((a, b) => {
      const priorityA = getStatusPriority(a.status);
      const priorityB = getStatusPriority(b.status);
      if (priorityA !== priorityB) return priorityA - priorityB;

      const dateA = getDateForService(a);
      const dateB = getDateForService(b);

      if (dateA && dateB) return compareDesc(dateA, dateB);
      if (dateA) return -1;
      if (dateB) return 1;
      
      return 0;
    });
  }, [activeServices]);
  
  const handleEditService = (serviceId: string) => {
    router.push(`/servicios/${serviceId}`);
  };

  const handleCancelService = async (serviceId: string) => {
    const reason = prompt('Motivo de la cancelación:');
    if (reason) {
      try {
        await serviceService.cancelService(serviceId, reason);
        toast({ title: 'Servicio Cancelado' });
      } catch (e) {
        toast({ title: 'Error', description: 'No se pudo cancelar el servicio.', variant: 'destructive' });
      }
    }
  };
  
  const renderServiceCard = useCallback(
    (service: ServiceRecord) => (
      <ServiceAppointmentCard 
        key={service.id}
        service={service}
        vehicle={vehicles.find((v) => v.id === service.vehicleId)}
        personnel={personnel}
        currentUser={currentUser}
        onEdit={() => handleEditService(service.id)}
        onView={() => onShowShareDialog(service)}
        onShowTicket={() => onShowTicket(service)}
        onCancel={() => handleCancelService(service.id)}
        onDelete={() => onDelete(service.id)}
      />
    ),
    [vehicles, personnel, currentUser, onShowShareDialog, onDelete, handleEditService, handleCancelService, onShowTicket]
  );

  return (
    <>
      <DailyEarningsCard services={allServices} />
      <Card>
        <CardHeader>
          <CardTitle>Servicios Activos del Día</CardTitle>
          <CardDescription>
            Servicios agendados para hoy, en taller y entregados hoy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedServices.length > 0 ? (
            sortedServices.map(renderServiceCard)
          ) : (
            <p className="text-center text-muted-foreground py-10">No hay servicios activos para hoy.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
