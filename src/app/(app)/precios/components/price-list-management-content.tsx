// src/app/(app)/precios/components/price-list-management-content.tsx
"use client";

import React from 'react';
import { Accordion } from "@/components/ui/accordion";
import type { VehiclePriceList } from '@/types';
import { VehicleMakeAccordion } from './VehicleMakeAccordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface PriceListManagementContentProps {
  priceLists: VehiclePriceList[];
  allMakes: string[];
  onEngineDataSave: (make: string, model: string, generationIndex: number, engineIndex: number, data: any) => void;
}

export default function PriceListManagementContent({ priceLists, allMakes, onEngineDataSave }: PriceListManagementContentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Base de Datos Completa</CardTitle>
        <CardDescription>Explora y edita todas las marcas, modelos y motores en el sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full space-y-2">
          {allMakes.map(make => (
            <VehicleMakeAccordion 
              key={make} 
              make={make} 
              onEngineDataSave={onEngineDataSave}
            />
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
