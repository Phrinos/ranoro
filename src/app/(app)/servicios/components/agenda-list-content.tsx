
"use client";

import React, { useMemo } from 'react';
import { ServiceAppointmentCard } from './ServiceAppointmentCard';
import type { ServiceRecord, Vehicle, User } from '@/types';
import { useRouter } from 'next/navigation';

interface AgendaListContentProps {
    services: ServiceRecord[];
    vehicles: Vehicle[];
    personnel: User[];
    onShowPreview: (service: ServiceRecord) => void;
}

export default function AgendaListContent({ services, vehicles, personnel, onShowPreview }: AgendaListContentProps) {
    const router = useRouter();

    const handleEditService = (serviceId: string) => {
        router.push(`/servicios/${serviceId}`);
    };

    return (
        <div className="space-y-4">
            {services.length > 0 ? (
                services.map(service => (
                    <ServiceAppointmentCard 
                        key={service.id}
                        service={service}
                        vehicles={vehicles}
                        technicians={personnel}
                        onEdit={() => handleEditService(service.id)}
                        onView={() => onShowPreview(service)}
                    />
                ))
            ) : (
                <p className="text-center text-muted-foreground py-10">
                    No hay servicios agendados.
                </p>
            )}
        </div>
    );
}
