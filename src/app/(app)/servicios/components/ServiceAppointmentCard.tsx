
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
import {
  User as UserIcon,
  Phone,
  Wrench,
  Edit,
  Printer,
  Wallet,
  CreditCard,
  Landmark,
  TrendingUp,
  CheckCircle2,
  Clock,
  Tag,
  Link2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import { usePermissions } from "@/hooks/usePermissions";
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
  useToast();
  const userPermissions = usePermissions();
  const { color, icon: StatusIcon, label } = getStatusInfo(service.status as any, service.subStatus as ServiceSubStatus);

  const technician = useMemo(() => personnel.find(u => u.id === service.technicianId), [personnel, service.technicianId]);

  const displayDate = service.appointmentDateTime || service.receptionDateTime || service.deliveryDateTime || service.serviceDate;
  const parsedDate = displayDate ? parseDate(displayDate) : null;

  const calculatedTotals = useMemo(() => {
    const dbTotal = Number(service.totalCost || (service as any).total || 0);
    const itemsTotal = (service.serviceItems ?? []).reduce((s, i) => s + (Number(i.sellingPrice) || 0), 0);
    const total = dbTotal > 0 ? dbTotal : itemsTotal;
    const serviceProfit = calcEffectiveProfit(service);
    return { totalCost: total, serviceProfit };
  }, [service]);

  // Unique service types across all items
  const serviceTypeLabels = useMemo(() => {
    const types = new Set<string>();
    (service.serviceItems ?? []).forEach(item => {
      if ((item as any).serviceType) types.add((item as any).serviceType);
    });
    return Array.from(types);
  }, [service.serviceItems]);

  // Payment info
  const primaryPayment: Payment | undefined = useMemo(() => {
    if (service.payments && service.payments.length > 0) {
      if (service.payments.length === 1) return service.payments[0];
      return service.payments.reduce((prev, cur) => (prev.amount ?? 0) > (cur.amount ?? 0) ? prev : cur);
    }
    if ((service as any).paymentMethod) {
      return { method: (service as any).paymentMethod as PaymentMethod, amount: calculatedTotals.totalCost };
    }
    return undefined;
  }, [service.payments, service, calculatedTotals.totalCost]);

  const isCobrado = service.status === 'Entregado';
  const handleShowTicket = onShowTicket ?? noop;

  const paymentIcon: Record<string, React.ElementType> = {
    'Efectivo': Wallet,
    'Tarjeta': CreditCard,
    'Tarjeta 3 MSI': CreditCard,
    'Tarjeta 6 MSI': CreditCard,
    'Transferencia': Landmark,
    'Transferencia/Contadora': Landmark,
  };

  return (
    <Card className={cn(
      "shadow-sm overflow-hidden border",
      service.status === 'Cancelado' ? "bg-muted/60 opacity-80" : "bg-card"
    )}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row text-sm divide-y md:divide-y-0 md:divide-x divide-border">

          {/* ── BLOQUE 1: Fecha / Hora / Folio ────────────────────── */}
          <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-[7.5rem] flex-shrink-0 bg-muted/20">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
              {parsedDate && isValid(parsedDate) ? format(parsedDate, "HH:mm 'hrs'", { locale: es }) : '—'}
            </p>
            <p className="font-bold text-lg text-foreground leading-tight mt-0.5">
              {parsedDate && isValid(parsedDate) ? format(parsedDate, "dd MMM", { locale: es }) : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {parsedDate && isValid(parsedDate) ? format(parsedDate, "yyyy") : ''}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
              #{(service as any).folio || service.id.slice(-6)}
            </p>
          </div>

          {/* ── BLOQUE 2: Cliente / Vehículo ──────────────────────── */}
          <div className="p-4 flex flex-col justify-center flex-[2] min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base text-foreground leading-tight truncate">
                {vehicle?.ownerName || service.customerName || 'Cliente no registrado'}
              </span>
              {service.customerPhone && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0">
                  <Phone className="h-3 w-3" />
                  {service.customerPhone}
                </span>
              )}
            </div>
            <p className="font-bold text-xl text-foreground leading-tight tracking-tight">
              {vehicle
                ? `${vehicle.licensePlate} — ${vehicle.make} ${vehicle.model}${vehicle.year ? ` ${vehicle.year}` : ''}`
                : service.vehicleIdentifier || '—'}
            </p>
            {service.notes && (
              <p className="text-[11px] text-muted-foreground line-clamp-1">{service.notes}</p>
            )}
          </div>

          {/* ── BLOQUE 3: Servicios / Estatus / Categoría / Técnico ─ */}
          <div className="p-4 flex flex-col justify-center flex-1 min-w-0 space-y-2">
            {/* Service items chips */}
            {service.serviceItems && service.serviceItems.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {service.serviceItems.slice(0, 3).map((item, i) => (
                  <span
                    key={i}
                    className="inline-block text-[10px] bg-muted px-2 py-0.5 rounded-full text-foreground/80 font-medium border border-border/50 truncate max-w-[140px]"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                ))}
                {service.serviceItems.length > 3 && (
                  <span className="inline-block text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground border border-border/50">
                    +{service.serviceItems.length - 3} más
                  </span>
                )}
              </div>
            )}

            {/* Status badge */}
            <Badge variant={color as any} className="w-fit text-[11px]">
              <Icon icon={typeof StatusIcon === 'string' ? StatusIcon : "mdi:information"} className="mr-1 h-3.5 w-3.5" />
              {label}
            </Badge>

            {/* Service type categories */}
            {serviceTypeLabels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {serviceTypeLabels.map((type, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                    <Tag className="h-2.5 w-2.5" />
                    {type}
                  </span>
                ))}
              </div>
            )}

            {/* Technician */}
            {(technician || service.technicianName) ? (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Wrench className="h-3 w-3 shrink-0" />
                <span className="font-medium truncate">{technician?.name || service.technicianName}</span>
              </p>
            ) : (
              <p className="text-[11px] text-orange-500/90 flex items-center gap-1">
                <Wrench className="h-3 w-3 shrink-0" />
                <span>Sin técnico asignado</span>
              </p>
            )}
          </div>

          {/* ── BLOQUE 4: Costo / Ganancia / Pago ─────────────────── */}
          <div className="p-4 flex flex-col justify-center items-end text-right w-full md:w-40 flex-shrink-0 space-y-1.5">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total cliente</p>
              <p className="font-bold text-2xl text-primary leading-tight">{formatCurrency(calculatedTotals.totalCost)}</p>
            </div>

            <p className="text-xs text-green-600 flex items-center gap-1 justify-end font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatCurrency(calculatedTotals.serviceProfit)}
            </p>

            {/* Cobrado / Por cobrar */}
            {isCobrado ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Cobrado
              </span>
            ) : service.status !== 'Cancelado' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                <Clock className="h-3 w-3" /> Por cobrar
              </span>
            ) : null}

            {/* Payment method */}
            {primaryPayment && (
              <Badge variant={getPaymentMethodVariant(primaryPayment.method)} className="text-[10px]">
                {React.createElement(paymentIcon[primaryPayment.method] ?? Wallet, { className: 'h-3 w-3 mr-1' })}
                {primaryPayment.method}
              </Badge>
            )}
          </div>

          {/* ── BLOQUE 5: Acciones verticales ─────────────────────── */}
          <div className="p-3 flex flex-row md:flex-col justify-center items-center gap-1 w-full md:w-14 flex-shrink-0 bg-muted/10">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onView} title="Compartir Enlace">
              <Link2 className="h-4 w-4" />
            </Button>
            {userPermissions.has('services:edit') && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onEdit} title="Editar">
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9" title="Imprimir Ticket" onClick={handleShowTicket}>
              <Printer className="h-4 w-4" />
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
