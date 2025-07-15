
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusTracker } from "./StatusTracker";
import type { ServiceRecord, Vehicle, Technician, PaymentMethod } from '@/types';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit, CheckCircle, Ban, DollarSign, User, Phone, TrendingUp, Clock, Wrench, Eye, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { parseDate } from '@/lib/forms';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ServiceAppointmentCardProps {
    service: ServiceRecord;
    vehicles: Vehicle[];
    technicians: Technician[];
    onEdit: () => void;
    onView: () => void;
    onConfirm?: () => void;
    onComplete?: () => void;
    onCancel?: () => void;
    onPrintTicket?: () => void;
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

const getPaymentMethodVariant = (method?: PaymentMethod): 'success' | 'purple' | 'blue' | 'lightGreen' | 'lightPurple' | 'outline' => {
  switch (method) {
    case 'Efectivo': return 'success';
    case 'Tarjeta': return 'purple';
    case 'Transferencia': return 'blue';
    case 'Efectivo+Transferencia': return 'lightGreen';
    case 'Tarjeta+Transferencia': return 'lightPurple';
    default: return 'outline';
  }
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
    onPrintTicket,
}: ServiceAppointmentCardProps) => {
    const vehicle = vehicles.find(v => v.id === service.vehicleId);
    
    const isDone = service.status === 'Entregado' || service.status === 'Cancelado';
    const isCompleted = service.status === 'Entregado';
    const isCancelled = service.status === 'Cancelado';

    const displayDate = parseDate(service.deliveryDateTime) || parseDate(service.serviceDate) || new Date();

    const technicianName = technicians.find(t => t.id === service.technicianId)?.name;

    const getStatusBadgeVariant = (status: ServiceRecord['status']) => {
        switch(status) {
            case 'En Taller': return 'secondary';
            case 'Entregado': return 'success';
            case 'Agendado': return 'outline';
            case 'Cancelado': return 'destructive';
            case 'Cotizacion': return 'default';
            default: return 'default';
        }
    };
    
    const profitVariant = (service.serviceProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600';

    return (
        <Card className="shadow-sm overflow-hidden mb-4">
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row text-sm">
                    <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                        <p className="font-semibold text-xl text-foreground">{isValid(displayDate) ? format(displayDate, "dd MMM yyyy", { locale: es }) : "Fecha inválida"}</p>
                        <div className="text-muted-foreground text-xs mt-1">Folio: {service.id.slice(-12)}</div>
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
                    <div className="p-3 grid grid-cols-2 md:grid-cols-1 md:w-auto md:min-w-[12rem]">
                        <div className="flex flex-col items-center md:items-end col-span-2 space-y-1">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1 text-right">Costo Cliente</p>
                                <p className="font-bold text-2xl text-primary text-right">{formatCurrency(service.totalCost)}</p>
                            </div>
                            <div>
                                <p className={cn("font-semibold text-base flex items-center gap-1 justify-end", profitVariant)}>
                                    <TrendingUp className="h-4 w-4" /> {formatCurrency(service.serviceProfit)}
                                </p>
                            </div>
                             {isCompleted && service.paymentMethod && <Badge variant={getPaymentMethodVariant(service.paymentMethod)}>{service.paymentMethod}</Badge>}
                        </div>
                    </div>
                    <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-56 flex-shrink-0 space-y-2">
                        <Badge variant={getStatusBadgeVariant(service.status)} className="mb-1">{service.status}</Badge>
                        <p className="text-xs text-muted-foreground">Asesor: {service.serviceAdvisorName || 'N/A'}</p>
                        {technicianName && <p className="text-xs text-muted-foreground">Técnico: {technicianName}</p>}

                        <div className="flex justify-center items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={onView} title="Ver Documento"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={onEdit} title="Editar Servicio"><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={onPrintTicket} disabled={!isCompleted} title="Imprimir Ticket"><Printer className="h-4 w-4"/></Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

ServiceAppointmentCard.displayName = 'ServiceAppointmentCard';
