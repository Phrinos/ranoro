
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion } from "@/components/ui/accordion";
import { VehicleMakeAccordion } from '@/app/(app)/precios/components/VehicleMakeAccordion';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import type { EngineData } from '@/lib/data/vehicle-database-types';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { VEHICLE_COLLECTION } from '@/lib/vehicle-constants';

interface CatalogTabProps {
  priceLists: any[];
}

export default function CatalogTab({ priceLists }: CatalogTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const filteredMakes = useMemo(() => {
    const makes = priceLists.map(pl => pl.make).sort();
    if (!searchTerm.trim()) return makes;
    const q = searchTerm.toLowerCase();
    return makes.filter(m => m.toLowerCase().includes(q));
  }, [priceLists, searchTerm]);

  const handleEngineDataSave = async (makeName: string, modelName: string, generationIndex: number, engineIndex: number, updatedEngineData: EngineData) => {
    if (!db) return;
    try {
        const makeDocRef = doc(db, VEHICLE_COLLECTION, makeName);
        const makeDocSnap = await getDoc(makeDocRef);
        if (!makeDocSnap.exists()) return;

        const makeDocData = makeDocSnap.data();
        const modelIndex = makeDocData.models.findIndex((m: any) => m.name === modelName);
        if (modelIndex === -1) return;
            
        const updatedModels = [...makeDocData.models];
        const updatedGenerations = [...updatedModels[modelIndex].generations];
        const updatedEngines = [...updatedGenerations[generationIndex].engines];
            
        updatedEngines[engineIndex] = updatedEngineData;
        updatedGenerations[generationIndex] = { ...updatedGenerations[generationIndex], engines: updatedEngines };
        updatedModels[modelIndex] = { ...updatedModels[modelIndex], generations: updatedGenerations };
            
        await setDoc(makeDocRef, { models: updatedModels }, { merge: true });
        toast({ title: 'Guardado', description: `Se actualizaron los datos para ${updatedEngineData.name}.` });
    } catch (error) {
        console.error("Error saving engine data:", error);
        toast({ title: 'Error', description: 'No se pudieron guardar los cambios.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar marca..."
          className="pl-8 bg-card"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {filteredMakes.length > 0 ? (
          <Accordion type="multiple" className="w-full space-y-2">
            {filteredMakes.map(make => (
              <VehicleMakeAccordion 
                key={make} 
                make={make} 
                onEngineDataSave={handleEngineDataSave}
              />
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
            {searchTerm ? "No se encontraron marcas con ese nombre." : "El catálogo está vacío. Crea tu primera marca."}
          </div>
        )}
      </div>
    </div>
  );
}
