// src/app/(app)/precios/components/VehicleModelAccordion.tsx
"use client";

import React from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { VehicleEngineAccordion } from './VehicleEngineAccordion';
import type { VehicleModel, EngineData } from '@/lib/data/vehicle-database-types';
import { CheckCircle } from 'lucide-react';
import { isEngineDataComplete } from '@/lib/data/vehicle-data-check';

interface VehicleModelAccordionProps {
  makeName: string;
  model: VehicleModel;
  onEngineDataSave: (make: string, model: string, generationIndex: number, engineIndex: number, data: EngineData) => void;
}

export function VehicleModelAccordion({ makeName, model, onEngineDataSave }: VehicleModelAccordionProps) {
  const isModelComplete = model.generations.every(gen => gen.engines.every(isEngineDataComplete));
  
  return (
    <AccordionItem value={model.name} className="border-b-0">
      <AccordionTrigger className="text-sm hover:no-underline">
        <div className="flex items-center gap-2">
            {isModelComplete && <CheckCircle className="h-4 w-4 text-green-500" />}
            <span>{model.name}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-4 border-l ml-2 space-y-1">
          {model.generations.map((generation, genIndex) => (
            <div key={`${model.name}-${genIndex}`}>
              <p className="font-semibold text-xs text-muted-foreground my-2">{generation.startYear} - {generation.endYear}</p>
              <Accordion type="multiple" className="w-full space-y-2">
                {generation.engines.map((engine, engineIndex) => (
                  <VehicleEngineAccordion 
                    key={engine.name} 
                    engine={engine}
                    isComplete={isEngineDataComplete(engine)}
                    onSave={(updatedEngine) => onEngineDataSave(makeName, model.name, genIndex, engineIndex, updatedEngine)} 
                  />
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}