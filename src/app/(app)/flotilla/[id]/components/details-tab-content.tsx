
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, Gauge, Edit, User as UserIcon, CalendarDays, History, StickyNote } from 'lucide-react';
import type { Vehicle } from '@/types';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { parseDate } from '@/lib/forms';

interface DetailsTabContentProps {
  vehicle: Vehicle;
  onEdit: () => void;
}

export function DetailsTabContent({ vehicle, onEdit }: DetailsTabContentProps) {

  const formatServiceInfo = (date?: string | Date, mileage?: number): string => {
    if (!date) return 'No hay registro.';
    const parsedDate = parseDate(date);
    if (!parsedDate || !isValid(parsedDate)) return 'Fecha inválida.';
    
    const datePart = format(parsedDate, "dd MMM yyyy", { locale: es });
    const mileagePart = mileage ? `${mileage.toLocaleString('es-ES')} km - ` : '';
    
    return `${mileagePart}${datePart}`;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Información del Vehículo</CardTitle>
           <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Vehículo
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm">
            
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground flex items-center gap-2"><Car className="h-4 w-4" />Vehículo</p>
              <p className="font-bold text-lg">{vehicle.licensePlate}</p>
              <p className="text-base">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
              <p className="text-sm">Color: {vehicle.color || 'N/A'}</p>
            </div>
            
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground flex items-center gap-2"><UserIcon className="h-4 w-4" />Propietario</p>
              <p className="font-semibold text-base">{vehicle.ownerName}</p>
            </div>

            <div className="space-y-1">
                <p className="font-medium text-muted-foreground flex items-center gap-2"><Gauge className="h-4 w-4" />Kilometraje Actual</p>
                <p className="font-semibold text-base">{vehicle.currentMileage ? `${vehicle.currentMileage.toLocaleString('es-ES')} km` : 'N/A'}</p>
                {vehicle.lastMileageUpdate && <p className="text-xs text-muted-foreground">Últ. act: {format(parseISO(vehicle.lastMileageUpdate), "dd MMM yyyy", { locale: es })}</p>}
            </div>

            <div className="space-y-1">
                <p className="font-medium text-muted-foreground flex items-center gap-2"><History className="h-4 w-4" />Último Servicio Registrado</p>
                <p className="font-semibold text-base">{formatServiceInfo(vehicle.lastServiceDate, vehicle.currentMileage)}</p>
            </div>
            
            <div className="space-y-1 md:col-span-2">
              <p className="font-medium text-muted-foreground flex items-center gap-2"><StickyNote className="h-4 w-4" />Notas</p>
              <p className="whitespace-pre-wrap">{vehicle.notes || 'Sin notas.'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Costos y Deducciones Fijas</CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Costos
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-2 bg-muted/50 rounded-md">
            <p className="text-xs font-medium text-muted-foreground">RENTA DIARIA</p>
            <p className="text-lg font-bold">{formatCurrency(vehicle.dailyRentalCost || 0)}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded-md">
            <p className="text-xs font-medium text-muted-foreground">GPS (MENSUAL)</p>
            <p className="text-lg font-bold">{formatCurrency(vehicle.gpsMonthlyCost || 0)}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded-md">
            <p className="text-xs font-medium text-muted-foreground">ADMIN (MENSUAL)</p>
            <p className="text-lg font-bold">{formatCurrency(vehicle.adminMonthlyCost || 0)}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded-md">
            <p className="text-xs font-medium text-muted-foreground">SEGURO (MENSUAL)</p>
            <p className="text-lg font-bold">{formatCurrency(vehicle.insuranceMonthlyCost || 0)}</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
