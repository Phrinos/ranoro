// src/app/(app)/precios/components/VehicleMakeAccordion.tsx
"use client";

import React, { useMemo } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import vehicleDatabase from '@/lib/data/vehicle-database.json';
import { VehicleModelAccordion } from './VehicleModelAccordion';
import { EngineData } from '@/lib/data/vehicle-database-types';

interface VehicleMakeAccordionProps {
  make: string;
  onEngineDataSave: (make: string, model: string, generationIndex: number, engineIndex: number, data: EngineData) => void;
}

export function VehicleMakeAccordion({ make, onEngineDataSave }: VehicleMakeAccordionProps) {
  const makeData = useMemo(() => vehicleDatabase.find(m => m.make === make), [make]);
  const models = useMemo(() => makeData?.models.sort((a, b) => a.name.localeCompare(b.name)) || [], [makeData]);

  return (
    <AccordionItem value={make} className="border rounded-md px-4 bg-card">
      <AccordionTrigger className="hover:no-underline font-semibold">{make}</AccordionTrigger>
      <AccordionContent>
        <div className="pl-4 border-l">
          {models.length > 0 ? (
             <Accordion type="multiple" className="w-full space-y-2">
                {models.map(model => (
                    <VehicleModelAccordion 
                        key={model.name} 
                        makeName={make}
                        model={model}
                        onEngineDataSave={onEngineDataSave}
                    />
                ))}
             </Accordion>
          ) : (
             <p className="text-muted-foreground text-sm">No hay modelos definidos para esta marca.</p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
