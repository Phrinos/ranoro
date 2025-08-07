// src/app/(app)/servicios/components
"use client";

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ServiceRecord, Vehicle, User } from '@/types';
import { ServiceAppointmentCard } from './ServiceAppointmentCard';
import { isToday, parseISO, isValid, compareAsc, compareDesc } from 'date-fns';
import { parseDate } from '@/lib/forms';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ActivosTabContentProps {
  allServices: ServiceRecord[];
  vehicles: Vehicle[];
  personnel: User[];
  onShowPreview: (service: ServiceRecord) => void;
  onCompleteService: (service: ServiceRecord) => void;
}

const getStatusPriority = (service: ServiceRecord): number => {
    if (service.status === 'En Taller' && service.subStatus === 'En Espera de Refacciones') return 1;
    if (service.status === 'En Taller' && service.subStatus === 'Proveedor Externo') return 2;
    if (service.status === 'Agendado' && service.appointmentStatus === 'Confirmada') return 3;
    if (service.status === 'En Taller' && service.subStatus === 'Reparando') return 4;
    if (service.status === 'En Taller' && !service.subStatus) return 4; // Default for 'En Taller'
    if (service.status === 'Agendado' && service.appointmentStatus !== 'Confirmada') return 5;
    if (service.status === 'En Taller' && service.subStatus === 'Completado') return 6;
    if (service.status === 'Entregado') return 7;
    if (service.status === 'Cancelado') return 8;
    return 99; // Default case
};

export default function ActivosTabContent({
  allServices,
  vehicles,
  personnel,
  onShowPreview,
  onCompleteService
}: ActivosTabContentProps) {
  const router = useRouter();

  const activeServices = useMemo(() => {
    const today = new Date();
    return allServices.filter(s => {
      const serviceDate = parseDate(s.appointmentDateTime || s.serviceDate);
      const deliveryDate = parseDate(s.deliveryDateTime);
      if (s.status === 'En Taller') return true;
      if (s.status === 'Agendado' && serviceDate && isToday(serviceDate)) return true;
      if ((s.status === 'Entregado' || s.status === 'Cancelado') && deliveryDate && isToday(deliveryDate)) return true;
      return false;
    }).sort((a, b) => {
        const priorityA = getStatusPriority(a);
        const priorityB = getStatusPriority(b);
        if (priorityA !== priorityB) return priorityA - priorityB;
        const dateA = parseDate(a.receptionDateTime) || parseDate(a.serviceDate);
        const dateB = parseDate(b.receptionDateTime) || parseDate(b.serviceDate);
        if (!dateA) return 1; if (!dateB) return -1;
        return compareDesc(dateA, dateB);
    });
  }, [allServices]);

  const totalEarningsToday = useMemo(() => {
    return activeServices
      .filter(s => s.status === 'Entregado')
      .reduce((sum, s) => sum + (s.totalCost || 0), 0);
  }, [activeServices]);
  
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
      onComplete={() => onCompleteService(service)}
    />
  ), [vehicles, personnel, onShowPreview, onCompleteService, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Servicios Activos</CardTitle>
        <CardDescription>
          Total facturado hoy: <span className="font-bold text-primary">{formatCurrency(totalEarningsToday)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeServices.length > 0 ? (
          activeServices.map(renderServiceCard)
        ) : (
          <p className="text-center text-muted-foreground py-10">
            No hay servicios activos para hoy.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
