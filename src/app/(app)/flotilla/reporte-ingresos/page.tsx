
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { placeholderVehicles } from '@/lib/placeholder-data';
import { ChevronRight, User } from "lucide-react";

export default function ReporteIngresosFlotillaPage() {

  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    placeholderVehicles
      .filter(v => v.isFleetVehicle)
      .forEach(v => owners.add(v.ownerName));
    return Array.from(owners).sort();
  }, []);

  return (
    <>
      <PageHeader
        title="Reporte de Ingresos de Flotilla"
        description="Seleccione un propietario para ver el detalle de ingresos de sus vehículos."
      />

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
        {uniqueOwners.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-8">
            No hay vehículos de flotilla con propietarios asignados.
          </p>
        )}
      </div>
    </>
  );
}
