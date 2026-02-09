
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
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Información del Vehículo</CardTitle>
          <CardDescription>Datos generales, propietario y notas internas.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit} className="bg-white gap-2">
          <Edit className="h-4 w-4" /> Editar Datos
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 flex-grow">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Car className="h-4 w-4" /> Detalles Técnicos
            </h4>
            <div className="space-y-3">
              {vehicleInfo.map(item => (
                <div key={item.label} className="flex items-center justify-between text-sm border-b border-dashed border-muted pb-1 last:border-0">
                  <span className="text-muted-foreground text-xs">{item.label}</span>
                  <span className="font-semibold text-right">{item.value || 'N/A'}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <User className="h-4 w-4" /> Datos del Propietario
              </h4>
              <div className="space-y-3">
                {ownerInfo.map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm border-b border-dashed border-muted pb-1 last:border-0">
                    <span className="text-muted-foreground text-xs">{item.label}</span>
                    <span className="font-semibold text-right">{item.value || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col flex-grow">
          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <StickyNote className="h-4 w-4" /> Notas y Observaciones
          </h4>
          <div className="text-sm text-foreground p-4 bg-muted/40 rounded-xl min-h-[100px] whitespace-pre-wrap break-words border border-muted">
            {vehicle.notes || 'No hay notas adicionales registradas para este vehículo.'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
