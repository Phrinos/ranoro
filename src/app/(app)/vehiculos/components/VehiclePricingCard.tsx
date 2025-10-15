// src/app/(app)/vehiculos/components/VehiclePricingCard.tsx
"use client";

import React from 'react';
import type { EngineData } from '@/lib/data/vehicle-database-types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, Droplet, Wind, CircuitBoard, DiscAlbum } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface VehiclePricingCardProps {
  engineData: EngineData | null;
}

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex justify-between items-center text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold text-right">{value || 'N/A'}</span>
  </div>
);

const ServiceRow = ({ label, price }: { label: string; price?: number | null }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-bold text-primary">{formatCurrency(price || 0)}</span>
    </div>
);

export function VehiclePricingCard({ engineData }: VehiclePricingCardProps) {
  if (!engineData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Precios y Costos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay datos de precios para el motor seleccionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { insumos, servicios } = engineData;
  const balatasDel = insumos.balatas?.delanteras?.[0];
  const balatasTra = insumos.balatas?.traseras?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Precios y Costos</CardTitle>
        <CardDescription>Referencia rápida de costos para el motor <span className="font-semibold">{engineData.name}</span>.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Droplet className="h-4 w-4" /> Costo de Insumos</h4>
          <div className="p-3 bg-muted/50 rounded-md space-y-1">
            <DetailRow label="Aceite" value={`${insumos.aceite?.grado || 'N/A'} (${insumos.aceite?.litros || 'N/A'} L)`} />
            <DetailRow label="Costo Aceite (x L)" value={formatCurrency(insumos.aceite?.costoUnitario)} />
            <Separator />
            <DetailRow label="Filtro Aceite" value={insumos.filtroAceite?.sku} />
            <DetailRow label="Costo Filtro Aceite" value={formatCurrency(insumos.filtroAceite?.costoUnitario)} />
            <Separator />
            <DetailRow label="Filtro Aire" value={insumos.filtroAire?.sku} />
            <DetailRow label="Costo Filtro Aire" value={formatCurrency(insumos.filtroAire?.costoUnitario)} />
            <Separator />
            <DetailRow label="Bujía Cobre" value={insumos.bujias?.modelos?.cobre} />
            <DetailRow label="Costo Bujía Cobre" value={formatCurrency(insumos.bujias?.costoUnitario?.cobre)} />
            <Separator />
            <DetailRow label="Balatas Del." value={balatasDel?.modelo} />
            <DetailRow label="Costo Balatas Del." value={formatCurrency(balatasDel?.costoJuego)} />
            <Separator />
            <DetailRow label="Balatas Tras." value={balatasTra?.modelo} />
            <DetailRow label="Costo Balatas Tras." value={formatCurrency(balatasTra?.costoJuego)} />
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><DollarSign className="h-4 w-4" /> Precios de Servicios (Público)</h4>
          <div className="p-3 bg-muted/50 rounded-md space-y-2">
            <ServiceRow label="Afinación Integral" price={servicios.afinacionIntegral?.precioPublico} />
            <ServiceRow label="Cambio de Aceite" price={servicios.cambioAceite?.precioPublico} />
            <ServiceRow label="Frenos Delanteros" price={servicios.balatasDelanteras?.precioPublico} />
            <ServiceRow label="Frenos Traseros" price={servicios.balatasTraseras?.precioPublico} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
