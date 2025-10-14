// src/app/(app)/precios/components/price-list-management-content.tsx
"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion } from "@/components/ui/accordion";
import type { VehiclePriceList } from '@/types';
import { VehicleMakeAccordion } from './VehicleMakeAccordion';
import { Card, CardContent } from '@/components/ui/card';

interface PriceListManagementContentProps {
  priceLists: VehiclePriceList[];
  quotedMakes: string[];
  unquotedMakes: string[];
}

export function PriceListManagementContent({ priceLists, quotedMakes, unquotedMakes }: PriceListManagementContentProps) {
  const [activeTab, setActiveTab] = useState<'quoted' | 'unquoted'>('unquoted');

  return (
    <Card>
        <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="unquoted">Sin Cotizar ({unquotedMakes.length})</TabsTrigger>
                <TabsTrigger value="quoted">Cotizados ({quotedMakes.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="unquoted" className="mt-4">
                <Accordion type="multiple" className="w-full space-y-2">
                  {unquotedMakes.map(make => (
                    <VehicleMakeAccordion key={make} make={make} />
                  ))}
                </Accordion>
              </TabsContent>
              <TabsContent value="quoted" className="mt-4">
                 <Accordion type="multiple" className="w-full space-y-2">
                  {quotedMakes.map(make => (
                    <VehicleMakeAccordion key={make} make={make} />
                  ))}
                </Accordion>
              </TabsContent>
            </Tabs>
        </CardContent>
    </Card>
  );
}
