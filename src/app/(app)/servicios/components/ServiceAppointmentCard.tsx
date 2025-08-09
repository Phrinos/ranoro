// src/app/(app)/servicios/components/ServiceAppointmentCard.tsx

"use client";

import React, { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Car, User as UserIcon, Calendar, CheckCircle, XCircle, Clock, Ellipsis, Eye, Edit, Check, DollarSign, TrendingUp, Copy, Printer, Trash2, Phone } from 'lucide-react';
import type { ServiceRecord, Vehicle, User, Payment } from '@/types';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, getStatusInfo, getPaymentMethodVariant, cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { parseDate } from '@/lib/forms';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface ServiceAppointmentCardProps {
  service: ServiceRecord;
  vehicle?: Vehicle;
  personnel?: User[];
  currentUser?: User | null;
  onView: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
}

const IVA_RATE = 0.16;

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
}: ServiceAppointmentCardProps) {
  const { toast } = useToast();
  const { color, icon: Icon, label } = getStatusInfo(service.status, service.subStatus, service.appointmentStatus);

  const technician = useMemo(() => personnel.find(u => u.id === service.technicianId), [personnel, service.technicianId]);
  const advisor = useMemo(() => personnel.find(u => u.id === service.serviceAdvisorId), [personnel, service.serviceAdvisorId]);
  
  const displayDate = service.appointmentDateTime || service.receptionDateTime || service.deliveryDateTime || service.serviceDate;
  const parsedDate = displayDate ? parseDate(displayDate) : null;

  // Recalculate totals directly from serviceItems for display accuracy, especially for quotes
  const calculatedTotals = useMemo(() => {
    const total = (service.serviceItems ?? []).reduce((s, i) => s + (Number(i.price) || 0), 0);
    const cost = (service.serviceItems ?? [])
      .flatMap((i) => i.suppliesUsed ?? [])
      .reduce((s, su) => s + (Number(su.unitPrice) || 0) * Number(su.quantity || 0), 0);
    
    return {
      totalCost: total,
      serviceProfit: total - cost,
    };
  }, [service.serviceItems]);

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
    if (service.paymentMethod) {
      return { method: service.paymentMethod as any, amount: service.totalCost };
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


  return (
    <Card className={cn("shadow-sm overflow-hidden", service.status === 'Cancelado' && "bg-muted/60 opacity-80")}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row text-sm">
          {/* Col 1: Date & Folio */}
          <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-40 flex-shrink-0 bg-card border-b md:border-b-0 md:border-r">
            <p className="text-muted-foreground text-sm">{parsedDate && isValid(parsedDate) ? format(parsedDate, "HH:mm 'hrs'", { locale: es }) : 'N/A'}</p>
            <p className="font-bold text-lg text-foreground">{parsedDate && isValid(parsedDate) ? format(parsedDate, "dd MMM yyyy", { locale: es }) : "N/A"}</p>
            <p className="text-muted-foreground text-xs mt-2">{service.id}</p>
          </div>

          {/* Col 2: Client & Vehicle */}
          <div className="p-4 flex flex-col justify-center flex-grow space-y-2 border-b md:border-b-0 md:border-r">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <UserIcon className="h-3 w-3" />
              <span>{vehicle?.ownerName || 'Cliente no asignado'}</span>
              <Phone className="h-3 w-3 ml-2"/>
              <span>{vehicle?.ownerPhone || 'N/A'}</span>
            </div>
            <p className="font-bold text-lg">{vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model}` : service.vehicleIdentifier}</p>
            <p className="text-muted-foreground text-xs truncate" title={getServiceDescriptionText(service)}>{getServiceDescriptionText(service)}</p>
          </div>

          {/* Col 3: Cost & Profit */}
          <div className="p-4 flex flex-col items-center md:items-end justify-center text-center md:text-right w-full md:w-48 flex-shrink-0 space-y-1 border-b md:border-b-0 md:border-r">
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
                {primaryPayment.method} {service.payments && service.payments.length > 1 ? `(+${service.payments.length - 1})` : ''}
              </Badge>
            )}
          </div>

          {/* Col 4: Status & Actions */}
          <div className="p-4 flex flex-col justify-between items-center text-center w-full md:w-48 flex-shrink-0">
            <Badge variant={color as any} className="w-full justify-center">
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Badge>
            <div className="text-xs text-muted-foreground mt-2 w-full text-center">
              <p>Asesor: {advisor?.name || 'N/A'}</p>
              {service.status !== 'Cotizacion' && service.status !== 'Agendado' && (
                  <p>Técnico: {technician?.name || 'N/A'}</p>
              )}
            </div>
             <div className="flex justify-center items-center gap-1 flex-wrap mt-2">
                <Button variant="ghost" size="icon" onClick={onView} title="Ver Detalles">
                    <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onEdit} title="Editar Servicio">
                    <Edit className="h-4 w-4" />
                </Button>
                {onConfirm && service.status === 'Agendado' && service.appointmentStatus !== 'Confirmada' && (
                  <Button variant="ghost" size="icon" onClick={onConfirm} title="Confirmar Cita">
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" title="Imprimir" onClick={() => toast({title: "Función no implementada"})}>
                    <Printer className="h-4 w-4" />
                </Button>
                {currentUser?.role === 'Superadministrador' && onDelete && (
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
