// src/app/(app)/flotilla/components/VehicleInfoCard.tsx
"use client";

import React from 'react';
import type { Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, User, Calendar, StickyNote, Phone, Edit } from 'lucide-react';

interface VehicleInfoCardProps {
  vehicle: Vehicle;
  onEdit: () => void;
}

export function VehicleInfoCard({ vehicle, onEdit }: VehicleInfoCardProps) {
  const vehicleInfo = [
    { icon: Car, label: "Marca", value: vehicle.make },
    { icon: Car, label: "Modelo", value: vehicle.model },
    { icon: Calendar, label: "Año", value: vehicle.year },
    { icon: Car, label: "Color", value: vehicle.color },
  ];

  const ownerInfo = [
    { icon: User, label: "Nombre", value: vehicle.ownerName },
    { icon: Phone, label: "Teléfono", value: vehicle.ownerPhone },
  ];

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Información del Vehículo</CardTitle>
          <CardDescription>Datos generales, propietario y notas.</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow space-y-6">
        <div>
          <h4 className="font-semibold text-sm mb-2">Detalles del Vehículo</h4>
          <div className="space-y-2">
            {vehicleInfo.map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
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
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value || 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-grow">
          <h4 className="font-semibold text-sm mb-2">Notas</h4>
          <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md min-h-[60px]">
            {vehicle.notes || 'No hay notas adicionales.'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
