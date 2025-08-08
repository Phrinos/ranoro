
"use client";

import React, { useMemo, useCallback } from 'react';
import { ServiceAppointmentCard } from './ServiceAppointmentCard';
import type { ServiceRecord, Vehicle, User } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { serviceService } from '@/lib/services';
import { isToday, isTomorrow, isAfter, addDays, format, startOfDay } from 'date-fns';
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
        if (service.appointmentStatus === 'Confirmada') return;
        try {
            await serviceService.updateService(service.id, { appointmentStatus: 'Confirmada' });
            toast({ title: 'Cita Confirmada', description: `La cita para ${service.vehicleIdentifier} ha sido confirmada.` });
        } catch (e) {
            toast({ title: 'Error', description: 'No se pudo confirmar la cita.', variant: 'destructive' });
        }
    };

    const groupedServices = useMemo(() => {
        const today = startOfDay(new Date());
        const tomorrow = addDays(today, 1);
        const dayAfterTomorrow = addDays(today, 2);
        const threeDaysFromNow = addDays(today, 3);
        
        const groups: GroupedServices = {
            'Hoy': [],
            'Mañana': [],
            [format(dayAfterTomorrow, 'eeee dd', { locale: es })]: [],
            [format(threeDaysFromNow, 'eeee dd', { locale: es })]: [],
            'Próximas Citas': []
        };
        
        services.forEach(service => {
            const serviceDate = parseDate(service.appointmentDateTime || service.serviceDate);
            if (!serviceDate) return;

            const serviceDayStart = startOfDay(serviceDate);

            if (isToday(serviceDayStart)) {
                groups['Hoy'].push(service);
            } else if (isTomorrow(serviceDayStart)) {
                groups['Mañana'].push(service);
            } else if (isSameDay(serviceDayStart, dayAfterTomorrow)) {
                groups[format(dayAfterTomorrow, 'eeee dd', { locale: es })].push(service);
            } else if (isSameDay(serviceDayStart, threeDaysFromNow)) {
                groups[format(threeDaysFromNow, 'eeee dd', { locale: es })].push(service);
            } else if (isAfter(serviceDayStart, threeDaysFromNow)) {
                groups['Próximas Citas'].push(service);
            }
        });
        
        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) {
                delete groups[key];
            } else {
                 // Sort services within each group by time
                groups[key].sort((a, b) => {
                    const dateA = parseDate(a.appointmentDateTime || a.serviceDate) || new Date(0);
                    const dateB = parseDate(b.appointmentDateTime || b.serviceDate) || new Date(0);
                    return dateA.getTime() - dateB.getTime();
                });
            }
        });
        
        return groups;

    }, [services]);

    const groupOrder = [
        'Hoy',
        'Mañana',
        format(addDays(new Date(), 2), 'eeee dd', { locale: es }),
        format(addDays(new Date(), 3), 'eeee dd', { locale: es }),
        'Próximas Citas'
    ];


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
                                        onComplete={() => handleConfirmAppointment(service)}
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
