
// src/app/(app)/servicios/components/tab-activos.tsx
"use client";

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  onShowShareDialog: (service: ServiceRecord) => void;
  onShowTicket: (service: ServiceRecord) => void;
  onCompleteService: (service: ServiceRecord) => void;
  onDelete: (serviceId: string) => void;
}

const getStatusPriority = (service: ServiceRecord): number => {
    if (service.status === 'Agendado') return 1;
    if (service.status === 'En Taller') return 2;
    if (service.status === 'Completado') return 3;
    if (service.status === 'Entregado') return 4;
    if (service.status === 'Cancelado') return 5;
    return 6; 
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
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    return allServices.filter(s => {
      // Exclude quotes and cancelled services
      if (s.status === 'Cotizacion' || s.status === 'Cancelado') {
        return false;
      }
      // Include services delivered today
      if (s.status === 'Entregado') {
        const deliveryDate = parseDate(s.deliveryDateTime);
        return deliveryDate && isValid(deliveryDate) && isWithinInterval(deliveryDate, { start: todayStart, end: todayEnd });
      }
      // Include all other statuses
      return true;
    });
  }, [allServices]);

  const sortedServices = useMemo(() => {
    return [...activeServices].sort((a, b) => {
      const priorityA = getStatusPriority(a);
      const priorityB = getStatusPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;

      const dateA = parseDate(a.receptionDateTime || a.serviceDate);
      const dateB = parseDate(b.receptionDateTime || b.serviceDate);
      if (dateA && dateB) return compareDesc(dateA, dateB);
      
      return 0;
    });
  }, [activeServices]);

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
