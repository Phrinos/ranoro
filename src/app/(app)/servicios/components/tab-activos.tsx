
// src/app/(app)/servicios/components/tab-activos.tsx
"use client";

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ServiceRecord, Vehicle, User } from '@/types';
import { ServiceAppointmentCard } from './ServiceAppointmentCard';
import { isToday, isValid, compareDesc, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { parseDate } from '@/lib/forms';
import { formatCurrency } from '@/lib/utils';
import { serviceService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { toZonedTime } from 'date-fns-tz';

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
            return parseDate(service.serviceDate); // Fallback
    }
};

const getDeliveredDate = (s: ServiceRecord): Date | null => {
  return (
    parseDate(s.deliveryDateTime) ||
    parseDate((s as any).completedAt) ||
    parseDate(s.serviceDate) ||
    parseDate((s as any).updatedAt) ||
    parseDate((s as any).createdAt) ||
    null
  );
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

  const activeServices = useMemo(() => {
    const timeZone = 'America/Mexico_City';
    const nowInLA = toZonedTime(new Date(), timeZone);
    const start = startOfDay(nowInLA);
    const end = endOfDay(nowInLA);

    return allServices.filter(s => {
      switch (s.status) {
        case 'Agendado':
          const appointmentDate = parseDate(s.appointmentDateTime);
          return appointmentDate && isValid(appointmentDate) && isWithinInterval(toZonedTime(appointmentDate, timeZone), { start, end });
        
        case 'En Taller':
          return true;

        case 'Entregado':
          const deliveryDate = getDeliveredDate(s);
          return deliveryDate && isValid(deliveryDate) && isWithinInterval(toZonedTime(deliveryDate, timeZone), { start, end });

        default:
          return false;
      }
    });
  }, [allServices]);

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

  const totalEarningsToday = useMemo(() => {
    return activeServices
      .filter((s) => s.status === 'Entregado')
      .reduce((sum, s) => sum + (Number(s.totalCost) || 0), 0);
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
    <Card>
      <CardHeader>
        <CardTitle>Servicios Activos</CardTitle>
        <CardDescription>
          Total facturado hoy:{' '}
          <span className="font-bold text-primary">{formatCurrency(totalEarningsToday)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedServices.length > 0 ? (
          sortedServices.map(renderServiceCard)
        ) : (
          <p className="text-center text-muted-foreground py-10">No hay servicios activos.</p>
        )}
      </CardContent>
    </Card>
  );
}
