// src/app/(app)/precios/components/VehicleMakeAccordion.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { VehicleModelAccordion } from './VehicleModelAccordion';
import type { EngineData, VehicleModel } from '@/lib/data/vehicle-database-types';
import { db } from '@/lib/firebaseClient';
import { doc, onSnapshot } from 'firebase/firestore';
import { VEHICLE_COLLECTION } from "@/lib/vehicle-constants";
import { CheckCircle } from 'lucide-react';
import { isEngineDataComplete } from '@/lib/data/vehicle-data-check';

interface VehicleMakeAccordionProps {
  make: string;
  initialData?: any; // Para la pestaña de vencimientos
  onEngineDataSave: (make: string, model: string, generationIndex: number, engineIndex: number, data: EngineData) => void;
}

interface MakeData {
    models: VehicleModel[];
}

export function VehicleMakeAccordion({ make, initialData, onEngineDataSave }: VehicleMakeAccordionProps) {
  const [makeData, setMakeData] = useState<MakeData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) {
        setMakeData(initialData);
        setLoading(false);
        return;
    }
    
    setLoading(true);
    const ref = doc(db, VEHICLE_COLLECTION, make);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setMakeData(snap.exists() ? (snap.data() as MakeData) : null);
        setLoading(false);
      },
      (err) => {
        console.error(`onSnapshot ${VEHICLE_COLLECTION}/${make}:`, err);
        setMakeData(null);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [make, initialData]);


  const { models, isMakeComplete } = useMemo(() => {
    if (!makeData || !Array.isArray(makeData.models)) return { models: [], isMakeComplete: false };
    
    const sortedModels = [...makeData.models].sort((a, b) => a.name.localeCompare(b.name));
    
    const allModelsComplete = sortedModels.every(model =>
        model.generations.every(gen => gen.engines.every(isEngineDataComplete))
    );

    return { models: sortedModels, isMakeComplete: allModelsComplete };
  }, [makeData]);

  return (
    <AccordionItem value={make} className="border rounded-md px-4 bg-card">
      <AccordionTrigger className="hover:no-underline font-semibold">
          <div className="flex items-center gap-2">
            {isMakeComplete && <CheckCircle className="h-5 w-5 text-green-500" />}
            <span>{make}</span>
          </div>
      </AccordionTrigger>
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
                        model={model as any}
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