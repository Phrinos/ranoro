// src/app/(app)/servicios/components/ServiceAppointmentCard.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { ServiceRecord, Vehicle, User, Payment, ServiceSubStatus, PaymentMethod } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { formatCurrency, getStatusInfo, getPaymentMethodVariant, cn } from '@/lib/utils';
import { User as UserIcon, Clock, Wrench, Edit, Printer, Trash2, Phone, Wallet, CreditCard, Landmark, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { calcEffectiveProfit } from '@/lib/money-helpers';
import { Icon } from '@iconify/react';

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
  const { color, icon: StatusIcon, label } = getStatusInfo(service.status as any, service.subStatus as ServiceSubStatus);

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
  const handleShowTicket = onShowTicket ?? noop;

  return (
    <Card className={cn("shadow-sm overflow-hidden", 
      service.status === 'Cancelado' ? "bg-muted/60 opacity-80" : "bg-card"
    )}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row text-sm">
          {/* Fecha y Folio */}
          <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-40 flex-shrink-0 bg-muted/30 border-b md:border-b-0 md:border-r">
            <p className="text-muted-foreground text-xs">{parsedDate && isValid(parsedDate) ? format(parsedDate, "HH:mm 'hrs'", { locale: es }) : 'N/A'}</p>
            <p className="font-bold text-lg text-foreground">{parsedDate && isValid(parsedDate) ? format(parsedDate, "dd MMM yyyy", { locale: es }) : "N/A"}</p>
            <p className="text-muted-foreground text-xs mt-1">#{(service as any).folio || service.id.slice(-6)}</p>
          </div>

          {/* Info Cliente y Vehículo */}
          <div className="p-4 flex flex-col justify-center flex-grow space-y-2 border-b md:border-b-0 md:border-r">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <UserIcon className="h-3 w-3" />
              <span className="font-medium">{vehicle?.ownerName || service.customerName || 'Cliente no registrado'}</span>
            </div>
            <p className="font-bold text-base leading-tight">
              {vehicle ? `${vehicle.licensePlate} — ${vehicle.make} ${vehicle.model}` : service.vehicleIdentifier}
            </p>
            <p className="text-muted-foreground text-xs line-clamp-1" title={getServiceDescriptionText(service)}>
              {getServiceDescriptionText(service)}
            </p>
          </div>

          {/* Finanzas */}
          <div className="p-4 flex flex-col items-center md:items-end justify-center text-center md:text-right w-full md:w-44 flex-shrink-0 space-y-1 border-b md:border-b-0 md:border-r">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Costo Cliente</p>
              <p className="font-bold text-xl text-primary">{formatCurrency(calculatedTotals.totalCost)}</p>
            </div>
            <div>
              <p className="font-semibold text-xs text-green-600 flex items-center gap-1 justify-end">
                <TrendingUp className="h-4 w-4" /> {formatCurrency(calculatedTotals.serviceProfit)}
              </p>
            </div>
            {primaryPayment && (
              <Badge variant={getPaymentMethodVariant(primaryPayment.method)} className="mt-1">
                {primaryPayment.method}
              </Badge>
            )}
          </div>

          {/* Estatus y Acciones */}
          <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0 bg-card space-y-2">
             <div className="w-full">
                <Badge variant={color as any} className="w-full justify-center">
                  <Icon icon={typeof StatusIcon === 'string' ? StatusIcon : "mdi:information"} className="mr-1.5 h-4 w-4" />
                  {label}
                </Badge>
            </div>
            
             <div className="flex justify-center items-center gap-1 flex-wrap pt-2">
                <Button variant="ghost" size="icon" onClick={onView} title="Ver Detalles"><Icon icon="mdi:eye" className="h-4 w-4"/></Button>
                <Button variant="ghost" size="icon" onClick={onEdit} title="Editar"><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Ticket" onClick={handleShowTicket}><Printer className="h-4 w-4" /></Button>
                {onDelete && (
                    <ConfirmDialog
                        triggerButton={<Button variant="ghost" size="icon" className="text-destructive" title="Eliminar"><Trash2 className="h-4 w-4"/></Button>}
                        title="¿Eliminar Registro?"
                        description="Esta acción eliminará el registro permanentemente."
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
