// src/app/(app)/flotilla/components/MaintenanceCard.tsx
"use client";

import React from 'react';
import type { Vehicle, ServiceRecord, NextServiceInfo } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wrench, Gauge, Calendar, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { parseDate } from '@/lib/forms';
import { formatNumber } from '@/lib/utils';

interface MaintenanceCardProps {
  vehicle: Vehicle;
  serviceHistory?: ServiceRecord[];
}

const NextServiceDisplay = ({ nextServiceInfo }: { nextServiceInfo?: NextServiceInfo | null }) => {
    if (!nextServiceInfo || (!nextServiceInfo.date && !nextServiceInfo.mileage)) {
        return <p className="font-semibold text-sm">No programado</p>;
    }
    
    const date = nextServiceInfo.date ? parseDate(nextServiceInfo.date) : null;
    const isOverdue = date && isValid(date) ? new Date() > date : false;

    return (
        <div className={isOverdue ? 'text-destructive' : ''}>
            <p className="font-semibold text-sm">
                {date && isValid(date) ? format(date, "dd MMM yyyy", { locale: es }) : ''}
                {(date && nextServiceInfo.mileage) && ' / '}
                {nextServiceInfo.mileage ? `${formatNumber(nextServiceInfo.mileage)} km` : ''}
            </p>
            {isOverdue && <p className="text-xs font-semibold flex items-center gap-1"><AlertTriangle className="h-3 w-3"/>Vencido</p>}
        </div>
    );
};


export function MaintenanceCard({ vehicle, serviceHistory = [] }: MaintenanceCardProps) {
  
  const lastService = serviceHistory
    .filter(s => s.status === 'Entregado')
    .sort((a, b) => new Date(b.deliveryDateTime!).getTime() - new Date(a.deliveryDateTime!).getTime())[0];

  const recentServices = (serviceHistory || []).sort((a, b) => {
      const dateA = a.serviceDate ? new Date(a.serviceDate) : new Date(0);
      const dateB = b.serviceDate ? new Date(b.serviceDate) : new Date(0);
      return dateB.getTime() - dateA.getTime();
  }).slice(0, 5);

  const lastServiceDate = vehicle.lastServiceDate ? parseDate(vehicle.lastServiceDate) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mantenimiento y Servicios</CardTitle>
        <CardDescription>Historial de servicios y kilometraje.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
            <Gauge className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">KM Actual</p>
              <p className="font-semibold">{formatNumber(vehicle.currentMileage) || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Último Servicio</p>
              <p className="font-semibold">{lastServiceDate && isValid(lastServiceDate) ? format(lastServiceDate, 'dd MMM yyyy', { locale: es }) : 'N/A'}</p>
            </div>
          </div>
        </div>
         <div className="space-y-2 pt-2">
            <h4 className="text-sm font-semibold">Próximo Servicio Recomendado</h4>
            <div className="p-3 bg-muted/50 rounded-md">
                <NextServiceDisplay nextServiceInfo={(vehicle as any).nextServiceInfo} />
            </div>
         </div>
        <div>
          <h4 className="font-semibold text-sm mb-2">Historial Reciente</h4>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentServices.length > 0 ? (
                  recentServices.map(service => {
                      const serviceDate = parseDate(service.serviceDate);
                      return (
                        <TableRow key={service.id}>
                            <TableCell>{serviceDate && isValid(serviceDate) ? format(serviceDate, 'dd MMM yyyy', { locale: es }) : 'N/A'}</TableCell>
                            <TableCell className="font-medium">
                                <Link href={`/servicios/${service.id}`} className="hover:underline">
                                {service.description || 'Servicio General'}
                                </Link>
                            </TableCell>
                            <TableCell>
                                <Badge>{service.status}</Badge>
                            </TableCell>
                        </TableRow>
                      );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">No hay servicios registrados.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
