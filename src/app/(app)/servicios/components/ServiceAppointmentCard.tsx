
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusTracker } from "./StatusTracker";
import type { ServiceRecord, Vehicle, Technician, PaymentMethod, ServiceSubStatus } from '@/types';
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
    onEditPayment?: () => void;
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

const getPaymentMethodVariant = (method?: PaymentMethod): 'success' | 'purple' | 'blue' | 'lightGreen' | 'lightPurple' | 'outline' | 'teal' => {
  switch (method) {
    case 'Efectivo': return 'success';
    case 'Tarjeta': return 'purple';
    case 'Efectivo/Tarjeta': return 'teal';
    case 'Transferencia': return 'blue';
    case 'Efectivo+Transferencia': return 'lightGreen';
    case 'Tarjeta+Transferencia': return 'lightPurple';
    default: return 'outline';
  }
};

const getSubStatusVariant = (subStatus?: ServiceSubStatus): 'destructive' | 'waiting' | 'success' | 'purple' => {
    switch(subStatus) {
        case 'En Espera de Refacciones': return 'destructive';
        case 'Proveedor Externo': return 'purple';
        case 'Reparando': return 'waiting';
        case 'Completado': return 'success';
        default: return 'waiting';
    }
}


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
    onEditPayment,
}: ServiceAppointmentCardProps) => {
    const vehicle = vehicles.find(v => v.id === service.vehicleId);
    const appointmentStatus = getAppointmentStatus(service);
    
    const isDone = service.status === 'Entregado' || service.status === 'Cancelado';
    const isQuote = service.status === 'Cotizacion';
    const isScheduled = service.status === 'Agendado';
    const isWorkshop = service.status === 'En Taller';
    const isCompleted = service.status === 'Entregado';
    const isCancelled = service.status === 'Cancelado';

    const displayDate = isWorkshop 
      ? parseDate(service.receptionDateTime) || parseDate(service.serviceDate) || new Date() 
      : parseDate(service.serviceDate) || new Date();

    const technicianName = technicians.find(t => t.id === service.technicianId)?.name;

    const getStatusBadgeVariant = (status: ServiceRecord['status']) => {
        switch(status) {
            case 'En Taller': return 'secondary';
            case 'Entregado': return 'success';
            default: return 'outline';
        }
    };

    const renderPaymentBadge = () => {
        if (!isCompleted || !service.paymentMethod) return null;
        
        return (
            <Badge variant={getPaymentMethodVariant(service.paymentMethod)} className="mt-1 text-xs whitespace-nowrap">
                {service.paymentMethod}
            </Badge>
        );
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
                    <div className="p-3 grid grid-cols-2 md:grid-cols-1 md:w-auto md:min-w-[12rem]">
                        <div className="flex flex-col items-center md:items-end col-span-2 space-y-1">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1 text-right">Costo Cliente</p>
                                <p className="font-bold text-2xl text-primary text-right">{formatCurrency(service.totalCost)}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-base text-green-600 flex items-center gap-1 justify-end">
                                    <TrendingUp className="h-4 w-4" /> {formatCurrency(service.serviceProfit)}
                                </p>
                            </div>
                            {renderPaymentBadge()}
                        </div>
                    </div>
                    <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-56 flex-shrink-0 space-y-2">
                        {isCancelled ? (
                            <Badge variant="destructive" className="mb-1 font-bold">CANCELADO</Badge>
                        ) : isWorkshop && service.subStatus ? (
                            <div className="flex items-center gap-2">
                                <Badge variant={getSubStatusVariant(service.subStatus)}>{service.subStatus}</Badge>
                                <Badge variant={getStatusBadgeVariant(service.status)} className="mb-1">{service.status}</Badge>
                            </div>
                        ) : (isWorkshop || isCompleted) ? (
                            <Badge variant={getStatusBadgeVariant(service.status)} className="mb-1">{service.status}</Badge>
                        ) : !isQuote ? (
                            <Badge variant={appointmentStatus.variant} className="mb-1">{appointmentStatus.label}</Badge>
                        ) : null}
                        
                        <p className="text-xs text-muted-foreground">Asesor: {service.serviceAdvisorName || 'N/A'}</p>
                        {technicianName && <p className="text-xs text-muted-foreground">Técnico: {technicianName}</p>}

                        <div className="flex justify-center items-center gap-1">
                            {onConfirm && service.status === 'Agendado' && service.appointmentStatus !== 'Confirmada' && (
                                <Button variant="ghost" size="icon" onClick={onConfirm} title="Confirmar Cita">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                            )}
                            {onComplete && service.status === 'En Taller' && service.subStatus === 'Completado' && (
                               <Button variant="ghost" size="icon" onClick={onComplete} title="Completar y Cobrar">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                </Button>
                            )}
                            {onEditPayment && service.status === 'Entregado' && (
                                <Button variant="ghost" size="icon" onClick={onEditPayment} title="Editar Pago">
                                    <DollarSign className="h-4 w-4" />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={onView} title="Ver Documento"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={onEdit} title="Editar Servicio"><Edit className="h-4 w-4" /></Button>
                             {onPrintTicket && service.status === 'Entregado' && (
                                <Button variant="ghost" size="icon" onClick={onPrintTicket} title="Reimprimir Ticket">
                                    <Printer className="h-4 w-4" />
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
