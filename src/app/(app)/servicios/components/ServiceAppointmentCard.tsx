// src/app/(app)/servicios/components/ServiceAppointmentCard.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ServiceRecord, Vehicle, Technician, User, Payment, ServiceSubStatus, PaymentMethod } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { serviceService } from '@/lib/services';
import { isToday, isTomorrow, isAfter, isBefore, addDays, format, startOfDay, isSameDay, compareDesc, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { capitalizeWords, formatCurrency, getStatusInfo, getPaymentMethodVariant, cn } from '@/lib/utils';
import { User as UserIcon, Car, Clock, CheckCircle, XCircle, Wrench, Package, AlertCircle, Eye, Edit, Check, DollarSign, TrendingUp, Copy, Printer, Trash2, Phone, Share2, Wallet, CreditCard, Landmark, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { calcEffectiveProfit } from '@/lib/money-helpers';

export type ServiceAppointmentCardProps = {
  service: ServiceRecord;
  vehicle?: Vehicle;
  personnel: User[];
  currentUser?: User | null;
  onEdit: () => void;
  onView: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  onConfirm?: () => Promise<void>;
  onShowTicket?: () => void;
};

const noop = () => {};

const IVA_RATE = 0.16;

const paymentMethodIcons: Partial<Record<PaymentMethod, React.ElementType>> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Tarjeta MSI": CreditCard,
  "Transferencia": Landmark,
  "Efectivo+Transferencia": Wallet,
  "Tarjeta+Transferencia": CreditCard,
  "Crédito": CreditCard,
};

export function ServiceAppointmentCard({
  service,
  vehicle,
  personnel = [],
  currentUser,
  onView,
  onEdit,
  onDelete,
  onCancel,
  onConfirm,
  onShowTicket,
}: ServiceAppointmentCardProps) {
  const { toast } = useToast();
  const { color, icon: Icon, label } = getStatusInfo(service.status as any, service.subStatus as ServiceSubStatus);

  const technician = useMemo(() => personnel.find(u => u.id === service.technicianId), [personnel, service.technicianId]);
  const advisor = useMemo(() => personnel.find(u => u.id === service.serviceAdvisorId), [personnel, service.serviceAdvisorId]);
  
  const displayDate = service.appointmentDateTime || service.receptionDateTime || service.deliveryDateTime || service.serviceDate;
  const parsedDate = displayDate ? parseDate(displayDate) : null;

  const calculatedTotals = useMemo(() => {
    const dbTotal = Number(service.totalCost || (service as any).total || 0);
    const itemsTotal = (service.serviceItems ?? []).reduce((s, i) => s + (Number(i.sellingPrice) || 0), 0);
    const total = dbTotal > 0 ? dbTotal : itemsTotal;
    const serviceProfit = calcEffectiveProfit(service);
    return { totalCost: total, serviceProfit };
  }, [service]);


  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copiado", description: `${fieldName} copiado al portapapeles.` });
    }).catch(err => {
      toast({ title: "Error", description: `No se pudo copiar ${fieldName}.`, variant: "destructive" });
    });
  };

  const getServiceDescriptionText = (service: ServiceRecord) => {
    if (service.serviceItems && service.serviceItems.length > 0) {
      return service.serviceItems.map(item => item.name).join(', ');
    }
    return service.description || 'Servicio sin descripción';
  };
  
  const getPrimaryPaymentMethod = (): Payment | undefined => {
    if (service.payments && service.payments.length > 0) {
      if (service.payments.length === 1) return service.payments[0];
      return service.payments.reduce((prev, current) => ((prev.amount ?? 0) > (current.amount ?? 0)) ? prev : current);
    }
    if ((service as any).paymentMethod) {
      return { method: (service as any).paymentMethod as any, amount: service.totalCost || 0 };
    }
    return undefined;
  };

  const primaryPayment = getPrimaryPaymentMethod();

  const handleConfirmAction = () => {
    if (service.status === 'Cotizacion' && onDelete) {
        onDelete();
    } else if (onCancel) {
        onCancel();
    }
  };
  
  const handleShowTicket = onShowTicket ?? noop;


  return (
    <Card className={cn("shadow-sm overflow-hidden", service.status === 'Cancelado' && "bg-muted/60 opacity-80")}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row text-sm">
          <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-40 flex-shrink-0 bg-card border-b md:border-b-0 md:border-r">
            <p className="text-muted-foreground text-sm">{parsedDate && isValid(parsedDate) ? format(parsedDate, "HH:mm 'hrs'", { locale: es }) : 'N/A'}</p>
            <p className="font-bold text-lg text-foreground">{parsedDate && isValid(parsedDate) ? format(parsedDate, "dd MMM yyyy", { locale: es }) : "N/A"}</p>
            <p className="font-semibold text-primary text-sm mt-2">{(service as any).folio || service.id}</p>
          </div>

          <div className="p-4 flex flex-col justify-center flex-grow space-y-2 border-b md:border-b-0 md:border-r">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <UserIcon className="h-3 w-3" />
              <span>{vehicle?.ownerName || service.customerName || 'Cliente no asignado'}</span>
              <Phone className="h-3 w-3 ml-2"/>
              <span>{vehicle?.ownerPhone || 'N/A'}</span>
            </div>
            <p className="font-bold text-lg">{vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model} ${vehicle.year}` : service.vehicleIdentifier}</p>
            <p className="text-muted-foreground text-xs truncate" title={getServiceDescriptionText(service)}>{getServiceDescriptionText(service)}</p>
          </div>

          <div className="p-4 flex flex-col items-center md:items-end justify-center text-center md:text-right w-full md:w-40 flex-shrink-0 space-y-1 border-b md:border-b-0 md:border-r">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Costo Cliente</p>
              <p className="font-bold text-xl text-primary">{formatCurrency(calculatedTotals.totalCost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ganancia</p>
              <p className="font-semibold text-base text-green-600 flex items-center gap-1 justify-end">
                <TrendingUp className="h-4 w-4" /> {formatCurrency(calculatedTotals.serviceProfit)}
              </p>
            </div>
            {primaryPayment && (
              <Badge variant={getPaymentMethodVariant(primaryPayment.method)} className="mt-1">
                 {React.createElement(paymentMethodIcons[primaryPayment.method as keyof typeof paymentMethodIcons] ?? Wallet, { className: "h-3 w-3 mr-1" })}
                {primaryPayment.method} {service.payments && service.payments.length > 1 ? `(+${service.payments.length - 1})` : ''}
              </Badge>
            )}
          </div>

          <div className="p-4 flex flex-col justify-between items-center text-center w-full md:w-48 flex-shrink-0">
             <div>
                <Badge variant={color as any} className="w-full justify-center">
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </Badge>
                {service.status === 'Agendado' && service.subStatus && (
                  <p className='text-xs mt-1 text-muted-foreground font-semibold'>{service.subStatus}</p>
                )}
            </div>
            <div className="text-xs text-muted-foreground mt-2 w-full text-center">
              <p>Asesor: {advisor?.name || service.serviceAdvisorName || 'N/A'}</p>
              <p>Técnico: {technician?.name || service.technicianName || 'N/A'}</p>
            </div>
             <div className="flex justify-center items-center gap-1 flex-wrap mt-2">
                <Button variant="ghost" size="icon" onClick={onView} title="Compartir Documento">
                    <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onEdit} title="Editar Servicio">
                    <Edit className="h-4 w-4" />
                </Button>
                {service.status === 'Agendado' && (
                    <>
                        {service.subStatus === 'Sin Confirmar' && onConfirm ? (
                             <Button variant="ghost" size="icon" onClick={onConfirm} title="Confirmar Cita">
                                <Check className="h-4 w-4 text-green-600" />
                             </Button>
                        ) : null}
                    </>
                )}
                <Button variant="ghost" size="icon" title="Imprimir Ticket" onClick={handleShowTicket}>
                    <Printer className="h-4 w-4" />
                </Button>
                {onDelete && (
                    <ConfirmDialog
                        triggerButton={<Button variant="ghost" size="icon" title="Eliminar Permanentemente"><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                        title="¿Eliminar Servicio Permanentemente?"
                        description="Esta acción eliminará el registro de la base de datos y no se podrá recuperar. Úselo solo si el registro se creó por error."
                        onConfirm={onDelete}
                        confirmText="Sí, Eliminar"
                    />
                )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
