// src/app/(app)/flotilla/components/MaintenanceCard.tsx
"use client";

import React from 'react';
import type { Vehicle, ServiceRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wrench, Gauge, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface MaintenanceCardProps {
  vehicle: Vehicle;
  serviceHistory: ServiceRecord[];
}

export function MaintenanceCard({ vehicle, serviceHistory }: MaintenanceCardProps) {
  
  const lastService = serviceHistory
    .filter(s => s.status === 'Entregado')
    .sort((a, b) => new Date(b.deliveryDateTime!).getTime() - new Date(a.deliveryDateTime!).getTime())[0];

  const recentServices = serviceHistory
    .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mantenimiento y Servicios</CardTitle>
        <CardDescription>Historial de servicios y kilometraje.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
            <Gauge className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">KM Actual</p>
              <p className="font-semibold">{vehicle.currentMileage?.toLocaleString('es-MX') || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
            <Calendar className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Último Servicio</p>
              <p className="font-semibold">{lastService ? format(parseISO(lastService.deliveryDateTime!), 'dd MMM yyyy', { locale: es }) : 'N/A'}</p>
            </div>
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
                  recentServices.map(service => (
                    <TableRow key={service.id}>
                      <TableCell>{format(parseISO(service.serviceDate.toString()), 'dd MMM yyyy', { locale: es })}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/servicios/${service.id}`} className="hover:underline">
                          {service.description || 'Servicio General'}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge>{service.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
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
