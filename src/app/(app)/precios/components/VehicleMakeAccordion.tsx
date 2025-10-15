// src/app/(app)/precios/components/VehicleMakeAccordion.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { VehicleModelAccordion } from './VehicleModelAccordion';
import { EngineData } from '@/lib/data/vehicle-database-types';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface VehicleMakeAccordionProps {
  make: string;
  onEngineDataSave: (make: string, model: string, generationIndex: number, engineIndex: number, data: EngineData) => void;
}

interface Model {
    name: string;
    // other properties
}

interface MakeData {
    models: Model[];
}

export function VehicleMakeAccordion({ make, onEngineDataSave }: VehicleMakeAccordionProps) {
  const [makeData, setMakeData] = useState<MakeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMakeData = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'vehicleData', make);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMakeData(docSnap.data() as MakeData);
        } else {
          console.warn(`No vehicle data found for make: ${make}`);
          setMakeData(null);
        }
      } catch (error) {
        console.error(`Error fetching data for make ${make}:`, error);
        setMakeData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMakeData();
  }, [make]);

  const models = useMemo(() => {
    if (!makeData) return [];
    return [...makeData.models].sort((a, b) => a.name.localeCompare(b.name));
  }, [makeData]);

  return (
    <AccordionItem value={make} className="border rounded-md px-4 bg-card">
      <AccordionTrigger className="hover:no-underline font-semibold">{make}</AccordionTrigger>
      <AccordionContent>
        <div className="pl-4 border-l">
          {loading ? (
            <p className="text-muted-foreground text-sm">Cargando modelos...</p>
          ) : models.length > 0 ? (
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
