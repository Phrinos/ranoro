
// src/app/(app)/servicios/components/tab-activos.tsx
"use client";

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ServiceRecord, Vehicle, User } from '@/types';
import { ServiceAppointmentCard } from './ServiceAppointmentCard';
import {
  isToday,
  isValid,
  compareDesc,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from 'date-fns';
import { parseDate } from '@/lib/forms';
import { formatCurrency } from '@/lib/utils';
import { serviceService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';

interface ActivosTabContentProps {
  allServices: ServiceRecord[];
  vehicles: Vehicle[];
  personnel: User[];
  currentUser: User | null;
  onShowPreview: (service: ServiceRecord) => void;
  onCompleteService: (service: ServiceRecord) => void;
  onDelete: (serviceId: string) => void;
}

const getStatusPriority = (service: ServiceRecord): number => {
  if (service.status === 'Agendado') {
    return service.appointmentStatus === 'Confirmada' ? 1 : 2;
  }
  if (service.status === 'En Taller') {
    switch (service.subStatus) {
      case 'En Espera de Refacciones': return 3;
      case 'Reparando': return 4;
      case 'Completado': return 5;
      default: return 4; // default para En Taller sin subStatus
    }
  }
  if (service.status === 'Entregado') return 6;
  if (service.status === 'Cancelado') return 8;
  return 7; // otros
};

export default function ActivosTabContent({
  allServices,
  vehicles,
  personnel,
  currentUser,
  onShowPreview,
  onCompleteService,
  onDelete,
}: ActivosTabContentProps) {
  const router = useRouter();
  const { toast } = useToast();

  const visibleServices = useMemo(() => {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());

    return allServices.filter((s) => {
      if (s.status === 'En Taller') return true;

      if (s.status === 'Entregado') {
        const d = parseDate(s.deliveryDateTime);
        return d && isValid(d) && isWithinInterval(d, { start, end });
      }
      
      if (s.status === 'Completado' || s.subStatus === 'Completado') {
        const completedAt =
          parseDate((s as any).completionDateTime) ||
          parseDate(s.deliveryDateTime) ||
          parseDate(s.receptionDateTime) ||
          parseDate(s.serviceDate);

        return completedAt && isValid(completedAt) && isWithinInterval(completedAt, { start, end });
      }

      return false;
    });
  }, [allServices]);

  const sortedServices = useMemo(() => {
    return [...visibleServices].sort((a, b) => {
      const dateA = parseDate(a.receptionDateTime) || parseDate(a.serviceDate) || parseDate(a.appointmentDateTime);
      const dateB = parseDate(b.receptionDateTime) || parseDate(b.serviceDate) || parseDate(b.appointmentDateTime);

      const priorityA = getStatusPriority(a);
      const priorityB = getStatusPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;

      if (dateA && dateB) return compareDesc(dateA, dateB);
      if (dateA) return -1;
      if (dateB) return 1;
      return 0;
    });
  }, [visibleServices]);

  const totalEarningsToday = useMemo(() => {
    return allServices
      .filter((s) => {
        if (s.status !== 'Entregado') return false;
        const deliveryDate = parseDate(s.deliveryDateTime);
        return deliveryDate && isValid(deliveryDate) && isToday(deliveryDate);
      })
      .reduce((sum, s) => sum + (s.totalCost || 0), 0);
  }, [allServices]);

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
        onView={() => onShowPreview(service)}
        onCancel={() => handleCancelService(service.id)}
        onDelete={() => onDelete(service.id)}
      />
    ),
    [vehicles, personnel, currentUser, onShowPreview, onDelete, handleEditService, handleCancelService]
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
