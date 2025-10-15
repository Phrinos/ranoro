// src/app/(app)/precios/components/VehicleModelAccordion.tsx
"use client";

import React from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { VehicleEngineAccordion } from './VehicleEngineAccordion';
import type { VehicleModel } from '@/lib/data/vehicle-database-types';

interface VehicleModelAccordionProps {
  model: VehicleModel;
}

export function VehicleModelAccordion({ model }: VehicleModelAccordionProps) {
  return (
    <AccordionItem value={model.name} className="border-b-0">
      <AccordionTrigger className="text-sm hover:no-underline">{model.name}</AccordionTrigger>
      <AccordionContent>
        <div className="pl-4 border-l ml-2 space-y-1">
          {model.generations.map((generation, genIndex) => (
            <div key={`${model.name}-${genIndex}`}>
              <p className="font-semibold text-xs text-muted-foreground my-2">{generation.startYear} - {generation.endYear}</p>
              <Accordion type="multiple" className="w-full space-y-2">
                {generation.engines.map((engine, engineIndex) => (
                  <VehicleEngineAccordion key={engine.name} engine={engine} />
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
