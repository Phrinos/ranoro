// src/app/(app)/precios/components/VencimientosContent.tsx
"use client";

import React, { useMemo } from 'react';
import { Accordion } from "@/components/ui/accordion";
import type { VehiclePriceList, EngineData } from '@/types';
import { VehicleMakeAccordion } from './VehicleMakeAccordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { isBefore, subDays, parseISO, isValid } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

interface VencimientosContentProps {
  priceLists: VehiclePriceList[];
  onEngineDataSave: (make: string, model: string, generationIndex: number, engineIndex: number, data: any) => void;
}

const isOutdated = (dateString?: string) => {
    // Si NO hay fecha, NO está desactualizado porque nunca se ha establecido.
    if (!dateString) return false; 
    
    const ninetyDaysAgo = subDays(new Date(), 90);
    try {
        const date = parseISO(dateString);
        // Debe ser una fecha válida Y anterior a 90 días.
        return isValid(date) && isBefore(date, ninetyDaysAgo);
    } catch {
        // Si hay un error al parsear, no se puede considerar vencido.
        return false;
    }
};

const getOutdatedEngines = (priceLists: VehiclePriceList[]) => {
    const outdatedMakes: any[] = [];

    priceLists.forEach(make => {
        const outdatedModels: any[] = [];
        if (!make.models) return;

        make.models.forEach(model => {
            const outdatedGenerations: any[] = [];
            model.generations.forEach((gen, genIndex) => {
                const outdatedEnginesInGen: any[] = [];
                gen.engines.forEach((engine: EngineData, engineIndex: any) => {
                    const insumos = engine.insumos;
                    
                    // Comprueba si CUALQUIERA de los insumos está vencido
                    const isAnyOutdated = 
                        isOutdated(insumos.aceite.lastUpdated) ||
                        isOutdated(insumos.filtroAceite.lastUpdated) ||
                        isOutdated(insumos.filtroAire.lastUpdated) ||
                        isOutdated(insumos.balatas.lastUpdated) ||
                        isOutdated(insumos.bujias.lastUpdated);
                    
                    if (isAnyOutdated) {
                        outdatedEnginesInGen.push({ ...engine, originalEngineIndex: engineIndex });
                    }
                });
                if (outdatedEnginesInGen.length > 0) {
                    outdatedGenerations.push({ ...gen, engines: outdatedEnginesInGen, originalGenIndex: genIndex });
                }
            });
            if (outdatedGenerations.length > 0) {
                outdatedModels.push({ ...model, generations: outdatedGenerations });
            }
        });

        if (outdatedModels.length > 0) {
            outdatedMakes.push({ make: make.make, models: outdatedModels });
        }
    });

    return outdatedMakes;
};


export default function VencimientosContent({ priceLists, onEngineDataSave }: VencimientosContentProps) {
  const outdatedData = useMemo(() => getOutdatedEngines(priceLists), [priceLists]);

  const handleSave = (make: string, model: string, generationIndex: number, engineIndex: number, data: any) => {
    onEngineDataSave(make, model, generationIndex, engineIndex, data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Precios de Insumos Vencidos</CardTitle>
        <CardDescription>
          Lista de motores cuyos costos de insumos no han sido actualizados en los últimos 90 días.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {outdatedData.length > 0 ? (
          <Accordion type="multiple" className="w-full space-y-2">
            {outdatedData.map(makeData => (
              <VehicleMakeAccordion
                key={makeData.make}
                make={makeData.make}
                initialData={makeData}
                onEngineDataSave={(make, model, genIndex, engineIndex, data) => {
                    // We need to find the original indexes
                    const modelData = makeData.models.find((m:any) => m.name === model);
                    const genData = modelData?.generations.find((g:any) => g.originalGenIndex === genIndex);
                    const engineData = genData?.engines.find((e:any) => e.originalEngineIndex === engineIndex);
                    if (modelData && genData && engineData) {
                         onEngineDataSave(make, model, genData.originalGenIndex, engineData.originalEngineIndex, data);
                    }
                }}
              />
            ))}
          </Accordion>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <AlertTriangle className="h-12 w-12 mb-4 text-green-500" />
            <h3 className="text-lg font-semibold text-foreground">¡Todo en Orden!</h3>
            <p className="text-sm">No se encontraron precios vencidos. Todos los costos de insumos han sido actualizados recientemente.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
