
// src/app/(app)/servicios/components/agenda-list-content.tsx

"use client";

import React, { useMemo, useCallback } from 'react';
import { ServiceAppointmentCard } from './ServiceAppointmentCard';
import type { ServiceRecord, Vehicle, User } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { serviceService } from '@/lib/services';
import { isToday, isTomorrow, isAfter, isBefore, addDays, format, startOfDay, isSameDay, compareDesc } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { capitalizeWords } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';

interface AgendaListContentProps {
    services: ServiceRecord[];
    vehicles: Vehicle[];
    personnel: User[];
    onShowPreview: (service: ServiceRecord) => void;
}

interface GroupedServices {
  [key: string]: ServiceRecord[];
}

export default function AgendaListContent({ services, vehicles, personnel, onShowPreview }: AgendaListContentProps) {
    const router = useRouter();
    const { toast } = useToast();

    const handleEditService = (serviceId: string) => {
        router.push(`/servicios/${serviceId}`);
    };
    
    const handleConfirmAppointment = async (service: ServiceRecord) => {
        if (service.subStatus === 'Confirmada' || service.subStatus === 'Cancelada') return;
        try {
            await serviceService.updateService(service.id, { subStatus: 'Confirmada' });
            toast({ title: 'Cita Confirmada', description: `La cita para ${service.vehicleIdentifier} ha sido confirmada.` });
        } catch (e) {
            toast({ title: 'Error', description: 'No se pudo confirmar la cita.', variant: 'destructive' });
        }
    };

    const groupedServices = useMemo(() => {
        const today = startOfDay(new Date());
        
        // Sort all services by appointment date descendingly first
        const sortedServices = services.sort((a, b) => {
            const dateA = parseDate(a.appointmentDateTime || a.serviceDate) || new Date(0);
            const dateB = parseDate(b.appointmentDateTime || b.serviceDate) || new Date(0);
            return compareDesc(dateA, dateB);
        });

        const groups: GroupedServices = {
            'Hoy': [],
            'Mañana': [],
            'Próximas Citas': [],
            'Citas Anteriores': []
        };
        
        sortedServices.forEach(service => {
            const serviceDate = parseDate(service.appointmentDateTime || service.serviceDate);
            if (!serviceDate) return;

            const serviceDayStart = startOfDay(serviceDate);

            if (isBefore(serviceDayStart, today)) {
                groups['Citas Anteriores'].push(service);
            } else if (isToday(serviceDayStart)) {
                groups['Hoy'].push(service);
            } else if (isTomorrow(serviceDayStart)) {
                groups['Mañana'].push(service);
            } else {
                groups['Próximas Citas'].push(service);
            }
        });
        
        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) {
                delete groups[key];
            }
        });
        
        return groups;

    }, [services]);

    const groupOrder = ['Hoy', 'Mañana', 'Próximas Citas', 'Citas Anteriores'];

    return (
        <div className="space-y-6">
            {Object.keys(groupedServices).length > 0 ? (
                groupOrder.map(groupName => {
                    const servicesInGroup = groupedServices[groupName];
                    if (!servicesInGroup || servicesInGroup.length === 0) return null;
                    
                    return (
                        <div key={groupName}>
                            <h3 className="text-lg font-semibold mb-3 pb-2 border-b-2 border-primary flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-primary/80"/>
                                {capitalizeWords(groupName)}
                            </h3>
                            <div className="space-y-4">
                                {servicesInGroup.map(service => (
                                    <ServiceAppointmentCard 
                                        key={service.id}
                                        service={service}
                                        vehicle={vehicles.find(v => v.id === service.vehicleId)}
                                        personnel={personnel}
                                        onEdit={() => handleEditService(service.id)}
                                        onView={() => onShowPreview(service)}
                                        onConfirm={() => handleConfirmAppointment(service)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })
            ) : (
                <p className="text-center text-muted-foreground py-10">
                    No hay servicios agendados.
                </p>
            )}
        </div>
    );
}
