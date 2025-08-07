
"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Car, Wrench, User as UserIcon, Calendar, CheckCircle, XCircle, Clock, Ellipsis, Eye, Edit, Check, DollarSign, TrendingUp, Copy } from 'lucide-react';
import type { ServiceRecord, Vehicle, User } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, getStatusInfo } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ServiceAppointmentCardProps {
  service: ServiceRecord;
  vehicles: Vehicle[];
  technicians: User[];
  onView: () => void;
  onEdit: () => void;
  onComplete?: () => void;
  onEditPayment?: () => void;
}

export function ServiceAppointmentCard({
  service,
  vehicles,
  technicians,
  onView,
  onEdit,
  onComplete,
  onEditPayment,
}: ServiceAppointmentCardProps) {
  const { toast } = useToast();
  const vehicle = vehicles.find(v => v.id === service.vehicleId);
  const technician = technicians.find(u => u.id === service.technicianId);
  const { color, icon: Icon, label } = getStatusInfo(service.status, service.subStatus, service.appointmentStatus);

  const displayDate = service.appointmentDateTime || service.deliveryDateTime || service.receptionDateTime || service.serviceDate;
  const dateLabel = service.status === 'Entregado' || service.status === 'Cancelado' ? 'Fecha de Entrega/Cierre' : 'Fecha de Cita/Recepción';

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copiado", description: `${fieldName} copiado al portapapeles.` });
    }).catch(err => {
      toast({ title: "Error", description: `No se pudo copiar ${fieldName}.`, variant: "destructive" });
    });
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="h-5 w-5" />
              {vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.year})` : 'Vehículo no asignado'}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span>{vehicle?.licensePlate || service.vehicleIdentifier}</span>
              <button onClick={() => copyToClipboard(service.id, 'Folio')} className="ml-2 p-1 rounded-full hover:bg-muted">
                <Copy className="h-3 w-3" />
              </button>
              <span className="text-xs text-gray-500">Folio: ...{service.id.slice(-6)}</span>
            </CardDescription>
          </div>
          <Badge variant="outline" className={`border-${color} text-${color} bg-${color}/10`}>
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center text-sm text-muted-foreground">
          <Wrench className="mr-2 h-4 w-4" />
          <span>{service.description || "Sin descripción"}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center text-muted-foreground">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>{technician?.name || 'Técnico no asignado'}</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4" />
            <span>
              {displayDate ? format(new Date(displayDate), 'dd MMM yyyy, hh:mm a', { locale: es }) : 'Fecha no disponible'}
            </span>
          </div>
        </div>
        {/* Financial Summary - Now visible for Quotes as well */}
        <div className="border-t pt-3 mt-3 flex justify-around text-center">
            <div className="flex flex-col items-center space-y-1">
                <span className="text-xs text-muted-foreground">Costo Cliente</span>
                <p className="font-bold text-primary flex items-center gap-1"><DollarSign className="h-4 w-4"/>{formatCurrency(service.totalCost)}</p>
            </div>
            <div className="flex flex-col items-center space-y-1">
                <span className="text-xs text-muted-foreground">Ganancia</span>
                <p className="font-bold text-green-600 flex items-center gap-1"><TrendingUp className="h-4 w-4"/>{formatCurrency(service.serviceProfit)}</p>
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onView}><Eye className="mr-2 h-4 w-4" />Ver</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm"><Ellipsis className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
            {onComplete && service.status !== 'Entregado' && (
              <DropdownMenuItem onClick={onComplete}><CheckCircle className="mr-2 h-4 w-4" />Marcar como Completado</DropdownMenuItem>
            )}
            {onEditPayment && service.status === 'Entregado' && (
              <DropdownMenuItem onClick={onEditPayment}><DollarSign className="mr-2 h-4 w-4" />Editar Pago</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
