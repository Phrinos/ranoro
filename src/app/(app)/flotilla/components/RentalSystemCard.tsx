// src/app/(app)/flotilla/components/RentalSystemCard.tsx
"use client";

import React from 'react';
import type { Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Signal, ShieldCheck, Cog, Edit } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RentalSystemCardProps {
  vehicle: Vehicle;
  onEdit: () => void;
}

export function RentalSystemCard({ vehicle, onEdit }: RentalSystemCardProps) {
  const rentalInfo = [
    { icon: DollarSign, label: "Renta Diaria", value: formatCurrency(vehicle.dailyRentalCost) },
    { icon: Signal, label: "GPS (Mensual)", value: formatCurrency(vehicle.gpsCost) },
    { icon: ShieldCheck, label: "Seguro (Mensual)", value: formatCurrency(vehicle.insuranceCost) },
    { icon: Cog, label: "Administración (Mensual)", value: formatCurrency(vehicle.adminCost) },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Sistema de Renta</CardTitle>
          <CardDescription>Costos fijos y de operación.</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {rentalInfo.map(item => (
          <div key={item.label} className="flex items-center justify-between text-sm py-2 border-b last:border-b-0">
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span>{item.label}</span>
            </div>
            <span className="font-semibold">{item.value || 'N/A'}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
