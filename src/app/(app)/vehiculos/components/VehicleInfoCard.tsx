// src/app/(app)/vehiculos/components/VehicleInfoCard.tsx
"use client";

import React from 'react';
import type { Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, User, Calendar, StickyNote, Phone, Edit, Cog } from 'lucide-react';

interface VehicleInfoCardProps {
  vehicle: Vehicle;
  onEdit: () => void;
}

export function VehicleInfoCard({ vehicle, onEdit }: VehicleInfoCardProps) {
  const vehicleInfo = [
    { icon: Car, label: "Marca", value: vehicle.make },
    { icon: Car, label: "Modelo", value: vehicle.model },
    { icon: Calendar, label: "Año", value: vehicle.year },
    { icon: Cog, label: "Motor", value: (vehicle as any).engine || 'N/A' },
    { icon: Car, label: "Color", value: vehicle.color },
  ];

  const ownerInfo = [
    { icon: User, label: "Propietario", value: vehicle.ownerName },
    { icon: Phone, label: "Teléfono", value: vehicle.ownerPhone },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Información del Vehículo</CardTitle>
          <CardDescription>Datos generales, propietario y notas.</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold text-sm mb-2">Detalles del Vehículo</h4>
          <div className="space-y-2">
            {vehicleInfo.map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                </div>
                <span className="font-medium">{item.value || 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-2">Propietario</h4>
          <div className="space-y-2">
            {ownerInfo.map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                </div>
                <span className="font-medium">{item.value || 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-grow">
          <h4 className="font-semibold text-sm mb-2">Notas</h4>
          <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md min-h-[60px] whitespace-pre-wrap break-words">
            {vehicle.notes || 'No hay notas adicionales.'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
