// src/app/(app)/precios/components/VehicleModelAccordion.tsx
"use client";

import React, { useMemo } from 'react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

interface VehicleModel {
  name: string;
  generations: {
    startYear: number;
    endYear: number;
    engines: string[];
  }[];
}

interface VehicleModelAccordionProps {
  model: VehicleModel;
}

export function VehicleModelAccordion({ model }: VehicleModelAccordionProps) {
  // Aquí puedes agregar la lógica para obtener y mostrar los motores de cada generación.
  // Por ahora, solo mostraremos los nombres de los motores.
  const allEngines = useMemo(() => {
    const engineSet = new Set<string>();
    model.generations.forEach(gen => {
        gen.engines.forEach(engine => engineSet.add(engine));
    });
    return Array.from(engineSet).sort();
  }, [model]);

  return (
    <AccordionItem value={model.name} className="border-b-0">
      <AccordionTrigger className="text-sm hover:no-underline">{model.name}</AccordionTrigger>
      <AccordionContent>
        <div className="pl-4 border-l ml-2 space-y-1">
            {allEngines.length > 0 ? (
                allEngines.map(engine => (
                    <div key={engine} className="text-xs p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                        {engine}
                    </div>
                ))
            ) : (
                <p className="text-xs text-muted-foreground">No hay motores definidos para este modelo.</p>
            )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
