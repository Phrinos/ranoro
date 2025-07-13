

"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusTracker } from "./StatusTracker";
import type { ServiceRecord, Vehicle, Technician } from '@/types';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit, Eye, CheckCircle, Ban, DollarSign, User, Phone, TrendingUp, Clock, Wrench } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { parseDate } from '@/lib/forms';
import { cn } from '@/lib/utils';

interface ServiceAppointmentCardProps {
    service: ServiceRecord;
    vehicles: Vehicle[];
    technicians: Technician[];
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
    return { label: 'Sin confirmar', variant: 'lightRed' };
};

export const ServiceAppointmentCard = React.memo(({
    service,
    vehicles,
    technicians,
    onEdit,
    onView,
    onConfirm,
    onComplete,
    onCancel,
}: ServiceAppointmentCardProps) => {
    const vehicle = vehicles.find(v => v.id === service.vehicleId);
    const appointmentStatus = getAppointmentStatus(service);
    
    // Use receptionDateTime if available (for 'En Taller'), otherwise use serviceDate
    const displayDate = parseDate(service.receptionDateTime) || parseDate(service.serviceDate) || new Date();

    const isDone = service.status === 'Entregado' || service.status === 'Cancelado';
    const isQuote = service.status === 'Cotizacion';
    const isScheduled = service.status === 'Agendado';
    const isWorkshop = service.status === 'En Taller';
    const isCompleted = service.status === 'Entregado';
    const isCancelled = service.status === 'Cancelado';

    const technicianName = technicians.find(t => t.id === service.technicianId)?.name;

    const getStatusBadgeVariant = (status: ServiceRecord['status']) => {
        switch(status) {
            case 'En Taller': return 'secondary';
            case 'Entregado': return 'success';
            default: return 'outline';
        }
    };

    return (
        <Card className="shadow-sm overflow-hidden mb-4">
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row text-sm">
                    <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                        <p className="font-semibold text-xl text-foreground">{isValid(displayDate) ? format(displayDate, "dd MMM yyyy", { locale: es }) : "Fecha inválida"}</p>
                        <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                             {isScheduled && <Clock className="h-4 w-4" />}
                             {isWorkshop && <Wrench className="h-4 w-4" />}
                             {(isScheduled || isWorkshop) && (
                                <span className="text-base font-semibold">
                                    {isValid(displayDate) ? format(displayDate, "HH:mm 'hrs'", { locale: es }) : 'N/A'}
                                </span>
                             )}
                        </div>
                        <p className="text-muted-foreground text-xs mt-1">Folio: {service.id}</p>
                        <StatusTracker status={service.status} />
                    </div>
                    <div className="p-4 flex flex-col justify-center flex-grow space-y-2 text-left border-y md:border-y-0 md:border-x">
                        {vehicle && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-1">
                                <div className="flex items-center gap-1.5"><User className="h-4 w-4" /> <span className="font-medium">{vehicle.ownerName}</span></div>
                                <div className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> <span>{vehicle.ownerPhone}</span></div>
                            </div>
                        )}
                        <p className="font-bold text-2xl text-black">{vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model}` : 'N/A'}</p>
                        <p className="text-sm text-foreground">
                            {getServiceDescriptionText(service)}
                        </p>
                    </div>
                    <div className="p-3 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                         <div className="flex flex-col items-center">
                            <p className="text-xs text-muted-foreground mb-1">Costo Cliente</p>
                            <p className="font-bold text-2xl text-primary">{formatCurrency(service.totalCost)}</p>
                        </div>
                        <div className="flex flex-col items-center mt-2">
                             <p className="text-xs text-muted-foreground mb-1">Ganancia</p>
                            <p className="font-semibold text-base text-green-600 flex items-center gap-1">
                                <TrendingUp className="h-4 w-4" /> {formatCurrency(service.serviceProfit)}
                            </p>
                        </div>
                    </div>
                    <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-56 flex-shrink-0 space-y-2">
                        {isCancelled && <Badge variant="destructive" className="mb-1 font-bold">CANCELADO</Badge>}
                        {(isWorkshop || isCompleted) && <Badge variant={getStatusBadgeVariant(service.status)} className="mb-1">{service.status}</Badge>}
                        {!isQuote && !isDone && !isWorkshop && <Badge variant={appointmentStatus.variant} className="mb-1">{appointmentStatus.label}</Badge>}
                        
                        <p className="text-xs text-muted-foreground">Asesor: {service.serviceAdvisorName || 'N/A'}</p>
                        {technicianName && <p className="text-xs text-muted-foreground">Técnico: {technicianName}</p>}

                        <div className="flex justify-center items-center gap-1">
                            {onConfirm && !isDone && !isQuote && service.appointmentStatus !== 'Confirmada' && (
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
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

ServiceAppointmentCard.displayName = 'ServiceAppointmentCard';
