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
}

export function PriceListManagementContent({ priceLists, allMakes }: PriceListManagementContentProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Accordion type="multiple" className="w-full space-y-2">
          {allMakes.map(make => (
            <VehicleMakeAccordion key={make} make={make} />
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
