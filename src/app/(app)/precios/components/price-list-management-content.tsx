// src/app/(app)/precios/components/price-list-management-content.tsx
"use client";

import React from 'react';
import { Accordion } from "@/components/ui/accordion";
import type { VehiclePriceList } from '@/types';
import { VehicleMakeAccordion } from './VehicleMakeAccordion';
import { Card, CardContent } from '@/components/ui/card';

interface PriceListManagementContentProps {
  priceLists: VehiclePriceList[];
  allMakes: string[];
  onEngineDataSave: (make: string, model: string, generationIndex: number, engineIndex: number, data: any) => void;
}

export function PriceListManagementContent({ priceLists, allMakes, onEngineDataSave }: PriceListManagementContentProps) {
  return (
    <Card>
      <CardContent className="pt-6">
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
