// src/app/(app)/flotilla/components/AssignedVehicleCard.tsx
"use client";

import React from 'react';
import type { Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface AssignedVehicleCardProps {
  assignedVehicle: Vehicle | null;
}

export function AssignedVehicleCard({ assignedVehicle }: AssignedVehicleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehículo Vinculado</CardTitle>
        <CardDescription>
          Para asignar o cambiar el vehículo, visita el perfil del vehículo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assignedVehicle ? (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <div className="flex items-center gap-3">
              <Car className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-semibold">{assignedVehicle.make} {assignedVehicle.model} ({assignedVehicle.licensePlate})</p>
                <p className="text-sm text-muted-foreground">Año: {assignedVehicle.year}</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/flotilla/vehiculos/${assignedVehicle.id}`}>
                Ver Perfil del Vehículo
              </Link>
            </Button>
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-6">
            <p>No hay un vehículo asignado a este conductor.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
