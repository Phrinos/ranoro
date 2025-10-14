// src/app/(app)/precios/components/VehicleMakeAccordion.tsx
"use client";

import React from 'react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import vehicleDatabase from '@/lib/data/vehicle-database.json';

interface VehicleMakeAccordionProps {
  make: string;
}

export function VehicleMakeAccordion({ make }: VehicleMakeAccordionProps) {
  const makeData = vehicleDatabase.find(m => m.make === make);

  return (
    <AccordionItem value={make} className="border rounded-md px-4 bg-card">
      <AccordionTrigger className="hover:no-underline font-semibold">{make}</AccordionTrigger>
      <AccordionContent>
        <div className="pl-4 border-l">
          <p className="text-muted-foreground text-sm">Contenido para {make} irá aquí.</p>
          {/* Aquí iría el siguiente nivel de acordeón para los modelos */}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
