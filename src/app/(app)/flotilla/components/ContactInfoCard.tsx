// src/app/(app)/flotilla/components/ContactInfoCard.tsx
"use client";

import React from 'react';
import type { Driver, Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Phone, Home, AlertTriangle, Car } from 'lucide-react';
import Link from 'next/link';

interface ContactInfoCardProps {
  driver: Driver;
  assignedVehicle: Vehicle | null;
}

export function ContactInfoCard({ driver, assignedVehicle }: ContactInfoCardProps) {
  const contactInfo = [
    { icon: User, label: "Nombre Completo", value: driver.name },
    { icon: Phone, label: "Teléfono", value: driver.phone },
    { icon: AlertTriangle, label: "Tel. Emergencia", value: driver.emergencyPhone },
    { icon: Home, label: "Dirección", value: driver.address },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Información de Contacto</CardTitle>
        <CardDescription>Datos personales y vehículo asignado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {contactInfo.map(item => (
          <div key={item.label} className="flex items-start justify-between text-sm">
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
            <span className="font-semibold text-right">{item.value || 'N/A'}</span>
          </div>
        ))}
         <div className="pt-3 border-t">
          <h4 className="font-semibold text-sm mb-2 text-muted-foreground pt-2">Vehículo Vinculado</h4>
          <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-md">
            <div className="flex items-center gap-3">
              <Car className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">Vehículo Actual</span>
            </div>
            {assignedVehicle ? (
              <Link href={`/flotilla/vehiculos/${assignedVehicle.id}`} className="font-semibold hover:underline">
                {assignedVehicle.make} {assignedVehicle.model} ({assignedVehicle.licensePlate})
              </Link>
            ) : (
              <span className="font-semibold">Sin vehículo asignado</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
