// src/app/(app)/rentas/components/ReportesTab.tsx
"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { User, ChevronRight } from 'lucide-react';
import type { Vehicle } from '@/types';

interface ReportesTabProps {
  vehicles: Vehicle[];
}

export function ReportesTab({ vehicles }: ReportesTabProps) {
  const uniqueOwners = useMemo(() => Array.from(new Set(vehicles.filter(v => v.isFleetVehicle).map(v => v.ownerName))).sort(), [vehicles]);

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Reporte de Ingresos de Flotilla</h2>
          <p className="text-muted-foreground">Seleccione un propietario para ver el detalle de ingresos de sus vehículos.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {uniqueOwners.map(owner => (
          <Link key={owner} href={`/flotilla/reporte-ingresos/${encodeURIComponent(owner)}`} passHref>
            <Card className="hover:bg-muted hover:border-primary/50 transition-all shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{owner}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
