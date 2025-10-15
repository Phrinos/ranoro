// src/app/(app)/precios/components/VehicleEngineAccordion.tsx
"use client";

import React, { useState } from 'react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import type { EngineData } from '@/lib/data/vehicle-database-types';
import { Button } from '@/components/ui/button';
import { Edit, CheckCircle } from 'lucide-react';
import { EditEngineDataDialog } from './EditEngineDataDialog';

interface VehicleEngineAccordionProps {
  engine: EngineData;
  onSave: (updatedEngine: EngineData) => void;
  isComplete: boolean;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium text-right">{value || 'N/A'}</span>
    </div>
);

const ServiceItem = ({ label, cost, price }: { label: string; cost?: number; price?: number }) => (
    <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}:</span>
        <div className="flex gap-4">
            <span className="font-medium">Costo: <span className="text-red-600">{formatCurrency(cost)}</span></span>
            <span className="font-medium">Venta: <span className="text-green-600">{formatCurrency(price)}</span></span>
        </div>
    </div>
);

export function VehicleEngineAccordion({ engine, onSave, isComplete }: VehicleEngineAccordionProps) {
  const { insumos, servicios } = engine;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleSave = (updatedData: EngineData) => {
    onSave(updatedData);
    setIsEditDialogOpen(false);
  };

  return (
    <>
    <AccordionItem value={engine.name} className="border rounded-md px-3 bg-background">
        <AccordionTrigger className="text-xs font-semibold py-3 hover:no-underline">
           <div className="flex items-center gap-2">
                {isComplete && <CheckCircle className="h-4 w-4 text-green-500" />}
                <span>{engine.name}</span>
            </div>
        </AccordionTrigger>
        <AccordionContent className="p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna de Insumos */}
                <Card>
                    <CardContent className="p-3 space-y-2">
                        <h4 className="font-bold text-sm mb-2">Insumos</h4>
                        <Separator />
                        <DetailItem label="Aceite" value={`${insumos.aceite?.grado || ''} (${insumos.aceite?.litros || ''}L)`} />
                        <DetailItem label="Filtro de Aceite SKU" value={insumos.filtroAceite?.sku} />
                        <DetailItem label="Filtro de Aire SKU" value={insumos.filtroAire?.sku} />
                        <Separator />
                        <h5 className="font-semibold text-xs text-muted-foreground pt-1">Balatas</h5>
                        {insumos.balatas.delanteras.map((balata, i) => (
                          <DetailItem key={i} label={`Delantera ${i + 1}`} value={`${balata.modelo || 'N/A'} (${balata.tipo || 'N/A'})`} />
                        ))}
                        {insumos.balatas.traseras.map((balata, i) => (
                           <DetailItem key={i} label={`Trasera ${i + 1}`} value={`${balata.modelo || 'N/A'} (${balata.tipo || 'N/A'})`} />
                        ))}
                         <Separator />
                        <h5 className="font-semibold text-xs text-muted-foreground pt-1">Bujías</h5>
                        <DetailItem label="Cantidad" value={insumos.bujias.cantidad} />
                        <DetailItem label="Cobre" value={insumos.bujias.modelos.cobre} />
                        <DetailItem label="Platino" value={insumos.bujias.modelos.platino} />
                        <DetailItem label="Iridio" value={insumos.bujias.modelos.iridio} />
                         <Separator />
                        <DetailItem label="Tipo de Inyector" value={insumos.inyector.tipo} />
                    </CardContent>
                </Card>

                {/* Columna de Servicios */}
                <Card>
                    <CardContent className="p-3 space-y-2">
                        <h4 className="font-bold text-sm mb-2">Servicios</h4>
                        <Separator />
                        <ServiceItem label="Afinación Integral" cost={servicios.afinacionIntegral.costoInsumos} price={servicios.afinacionIntegral.precioPublico} />
                        {servicios.afinacionIntegral.upgrades && (
                            <div className="pl-4 text-xs space-y-1">
                                <DetailItem label="+ Aceite Sintético" value={formatCurrency(servicios.afinacionIntegral.upgrades.conAceiteSintetico)} />
                                <DetailItem label="+ Aceite Mobil" value={formatCurrency(servicios.afinacionIntegral.upgrades.conAceiteMobil)} />
                                <DetailItem label="+ Bujías Platino" value={formatCurrency(servicios.afinacionIntegral.upgrades.conBujiasPlatino)} />
                                <DetailItem label="+ Bujías Iridio" value={formatCurrency(servicios.afinacionIntegral.upgrades.conBujiasIridio)} />
                            </div>
                        )}
                        <ServiceItem label="Cambio de Aceite" cost={servicios.cambioAceite.costoInsumos} price={servicios.cambioAceite.precioPublico} />
                        <ServiceItem label="Balatas Delanteras" cost={servicios.balatasDelanteras.costoInsumos} price={servicios.balatasDelanteras.precioPublico} />
                        <ServiceItem label="Balatas Traseras" cost={servicios.balatasTraseras.costoInsumos} price={servicios.balatasTraseras.precioPublico} />
                    </CardContent>
                </Card>
            </div>
             <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)} className="bg-white">
                    <Edit className="h-3 w-3 mr-2" />
                    Editar Datos del Motor
                </Button>
            </div>
        </AccordionContent>
    </AccordionItem>
    <EditEngineDataDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        engineData={engine}
        onSave={handleSave}
    />
    </>
  );
}
