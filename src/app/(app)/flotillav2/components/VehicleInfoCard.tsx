
"use client";

import React from 'react';
import type { Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, User, Calendar, Phone, Edit, Cog, Fingerprint, StickyNote } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface VehicleInfoCardProps {
  vehicle: Vehicle;
  onEdit: () => void;
}

export function VehicleInfoCard({ vehicle, onEdit }: VehicleInfoCardProps) {
  const vehicleInfo = [
    { icon: Car, label: "Marca", value: vehicle.make },
    { icon: Car, label: "Modelo", value: vehicle.model },
    { icon: Calendar, label: "Año", value: vehicle.year },
    { icon: Cog, label: "Tipo Motor", value: vehicle.engine || 'N/A' },
    { icon: Fingerprint, label: "Num. Motor", value: vehicle.engineSerialNumber || 'N/A' },
    { icon: Car, label: "Color", value: vehicle.color },
  ];

  const ownerInfo = [
    { icon: User, label: "Nombre", value: vehicle.ownerName },
    { icon: Phone, label: "Teléfono", value: vehicle.ownerPhone },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Información del Vehículo</CardTitle>
          <CardDescription>Datos generales, propietario y notas.</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={onEdit} className="bg-white">
          <Edit className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 flex-grow">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" /> Detalles Técnicos
            </h4>
            <div className="space-y-2">
              {vehicleInfo.map(item => (
                <div key={item.label} className="flex items-center justify-between text-sm border-b border-dashed pb-1 last:border-0">
                  <span className="text-muted-foreground text-xs">{item.label}</span>
                  <span className="font-medium text-right">{item.value || 'N/A'}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Propietario
              </h4>
              <div className="space-y-2">
                {ownerInfo.map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm border-b border-dashed pb-1 last:border-0">
                    <span className="text-muted-foreground text-xs">{item.label}</span>
                    <span className="font-medium text-right">{item.value || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col flex-grow">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-primary" /> Notas y Observaciones
          </h4>
          <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-xl min-h-[100px] whitespace-pre-wrap break-words border border-primary/5">
            {vehicle.notes || 'No hay notas adicionales registradas para este vehículo.'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
