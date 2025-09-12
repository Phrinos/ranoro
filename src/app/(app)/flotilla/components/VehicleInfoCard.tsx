// src/app/(app)/flotilla/components/VehicleInfoCard.tsx
"use client";

import React from 'react';
import type { Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car, User, Calendar } from 'lucide-react';

interface VehicleInfoCardProps {
  vehicle: Vehicle;
}

export function VehicleInfoCard({ vehicle }: VehicleInfoCardProps) {
  const vehicleInfo = [
    { icon: Car, label: "Marca", value: vehicle.make },
    { icon: Car, label: "Modelo", value: vehicle.model },
    { icon: Calendar, label: "Año", value: vehicle.year },
  ];

  const ownerInfo = [
    { icon: User, label: "Nombre", value: vehicle.ownerName },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del Vehículo</CardTitle>
        <CardDescription>Datos generales y del propietario.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
      </CardContent>
    </Card>
  );
}
