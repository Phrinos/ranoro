
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusTracker } from "./StatusTracker";
import type { ServiceRecord, Vehicle } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit, Eye, CheckCircle, Ban, DollarSign } from 'lucide-react';

interface ServiceAppointmentCardProps {
    service: ServiceRecord;
    vehicles: Vehicle[];
    onEdit: () => void;
    onView: () => void;
    onConfirm?: () => void;
    onComplete?: () => void;
    onCancel?: () => void;
}

const getServiceDescriptionText = (service: ServiceRecord) => {
    const serviceType = service.serviceType && service.serviceType !== 'Servicio General' ? `${service.serviceType}: ` : '';
    const description = (service.serviceItems && service.serviceItems.length > 0)
        ? service.serviceItems.map(item => item.name).join(', ')
        : service.description || 'Servicio sin descripción';
    return `${serviceType}${description}`;
};

const getAppointmentStatus = (service: ServiceRecord): { label: string; variant: "lightRed" | "success" } => {
    if (service.appointmentStatus === 'Confirmada') {
        return { label: 'Confirmada', variant: 'success' };
    }
    return { label: 'Creada', variant: 'lightRed' };
};

export const ServiceAppointmentCard = React.memo(({
    service,
    vehicles,
    onEdit,
    onView,
    onConfirm,
    onComplete,
    onCancel,
}: ServiceAppointmentCardProps) => {
    const vehicle = vehicles.find(v => v.id === service.vehicleId);
    const appointmentStatus = getAppointmentStatus(service);
    const serviceDate = service.serviceDate ? parseISO(service.serviceDate) : new Date();

    const isDone = service.status === 'Entregado' || service.status === 'Cancelado';
    const isQuote = service.status === 'Cotizacion';

    return (
        <Card className="shadow-sm overflow-hidden mb-4">
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row text-sm">
                    <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                        <p className="font-semibold text-xl text-foreground">{isValid(serviceDate) ? format(serviceDate, "dd MMM yyyy", { locale: es }) : "Fecha inválida"}</p>
                        <p className="text-muted-foreground text-xs mt-1">Folio: {service.id}</p>
                        <StatusTracker status={service.status} />
                    </div>
                    <div className="p-4 flex flex-col justify-center flex-grow space-y-2 text-left border-y md:border-y-0 md:border-x">
                        <p className="font-bold text-2xl text-black">{vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model}` : 'N/A'}</p>
                        <p className="text-sm text-foreground">
                            {getServiceDescriptionText(service)}
                        </p>
                    </div>
                    {!isQuote && (
                        <div className="p-3 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                            <p className="text-xs text-muted-foreground">Hora de Cita</p>
                            <p className="font-bold text-2xl text-black">{isValid(serviceDate) ? format(serviceDate, "HH:mm", { locale: es }) : '--:--'}</p>
                        </div>
                    )}
                    <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-56 flex-shrink-0 space-y-2">
                        {!isQuote && <Badge variant={appointmentStatus.variant} className="mb-1">{appointmentStatus.label}</Badge>}
                        <p className="text-xs text-muted-foreground">Asesor: {service.serviceAdvisorName || 'N/A'}</p>
                        <div className="flex justify-center items-center gap-1">
                            {onConfirm && !isDone && !isQuote && appointmentStatus.label === 'Creada' && (
                                <Button variant="ghost" size="icon" onClick={onConfirm} title="Confirmar Cita">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                            )}
                            {onComplete && service.status === 'En Taller' && service.subStatus === 'Completado' && (
                               <Button variant="ghost" size="icon" onClick={onComplete} title="Completar y Cobrar">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={onView} title="Vista Previa"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={onEdit} title="Editar Servicio"><Edit className="h-4 w-4" /></Button>
                            {onCancel && !isDone && (
                                <Button variant="ghost" size="icon" onClick={onCancel} title="Cancelar Servicio">
                                    <Ban className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

ServiceAppointmentCard.displayName = 'ServiceAppointmentCard';
