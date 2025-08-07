
"use client";

import React, { useMemo, useCallback } from 'react';
import { ServiceAppointmentCard } from './ServiceAppointmentCard';
import type { ServiceRecord, Vehicle, User } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { serviceService } from '@/lib/services';

interface AgendaListContentProps {
    services: ServiceRecord[];
    vehicles: Vehicle[];
    personnel: User[];
    onShowPreview: (service: ServiceRecord) => void;
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

    return (
        <div className="space-y-4">
            {services.length > 0 ? (
                services.map(service => (
                    <ServiceAppointmentCard 
                        key={service.id}
                        service={service}
                        vehicle={vehicles.find(v => v.id === service.vehicleId)}
                        personnel={personnel}
                        onEdit={() => handleEditService(service.id)}
                        onView={() => onShowPreview(service)}
                        onComplete={() => handleConfirmAppointment(service)} // Use onComplete for confirmation in this context
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
