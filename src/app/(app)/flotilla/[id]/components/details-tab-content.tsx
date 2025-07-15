
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, Gauge, Edit } from 'lucide-react';
import type { Vehicle } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface DetailsTabContentProps {
  vehicle: Vehicle;
  onEdit: () => void;
}

export function DetailsTabContent({ vehicle, onEdit }: DetailsTabContentProps) {
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground flex items-center gap-2"><Car className="h-4 w-4" />Vehículo</p>
              <p className="font-semibold text-base">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
              <p>Placa: {vehicle.licensePlate}</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground flex items-center gap-2"><Gauge className="h-4 w-4" />Kilometraje Actual</p>
              <p className="font-semibold text-base">{vehicle.currentMileage ? `${vehicle.currentMileage.toLocaleString('es-ES')} km` : 'N/A'}</p>
              {vehicle.lastMileageUpdate && <p className="text-xs text-muted-foreground">Últ. act: {format(parseISO(vehicle.lastMileageUpdate), "dd MMM yyyy", { locale: es })}</p>}
            </div>
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground">Propietario</p>
              <p>{vehicle.ownerName}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="font-medium text-muted-foreground">Notas</p>
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
