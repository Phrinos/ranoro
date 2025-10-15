// src/app/(app)/precios/page.tsx
"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import type { VehiclePriceList } from '@/types';
import { PriceListManagementContent } from './components/price-list-management-content';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import type { EngineData } from '@/lib/data/vehicle-database-types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

function PreciosPageComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [priceLists, setPriceLists] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = inventoryService.onPriceListsUpdate((data) => {
            setPriceLists(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const allMakes = useMemo(() => {
        return [...new Set(priceLists.map((list) => list.id))].sort();
    }, [priceLists]);
    
    const handleEngineDataSave = async (makeName: string, modelName: string, generationIndex: number, engineIndex: number, updatedEngineData: EngineData) => {
        if (!db) return toast({ title: "Error de conexión", variant: "destructive" });
    
        try {
            const makeDoc = priceLists.find(m => m.id === makeName);
            if (!makeDoc) throw new Error("Marca no encontrada");
    
            const modelIndex = makeDoc.models.findIndex((m: any) => m.name === modelName);
            if (modelIndex === -1) throw new Error("Modelo no encontrado");
            
            const updatedModels = [...makeDoc.models];
            const updatedGenerations = [...updatedModels[modelIndex].generations];
            const updatedEngines = [...updatedGenerations[generationIndex].engines];
            
            updatedEngines[engineIndex] = updatedEngineData;
            updatedGenerations[generationIndex] = { ...updatedGenerations[generationIndex], engines: updatedEngines };
            updatedModels[modelIndex] = { ...updatedModels[modelIndex], generations: updatedGenerations };
            
            const docRef = doc(db, 'vehiclePriceLists', makeName);
            await setDoc(docRef, { models: updatedModels }, { merge: true });
    
            toast({ title: 'Guardado', description: `Se actualizaron los datos para ${updatedEngineData.name}.` });
        } catch (error) {
            console.error("Error saving engine data:", error);
            toast({ title: 'Error', description: 'No se pudieron guardar los cambios.', variant: 'destructive' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <>
             <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Precotizaciones</h1>
                        <p className="text-primary-foreground/80 mt-1">
                            Gestiona los costos de servicios e insumos para cada vehículo.
                        </p>
                    </div>
                </div>
            </div>
            <PriceListManagementContent 
                priceLists={priceLists}
                allMakes={allMakes}
                onEngineDataSave={handleEngineDataSave}
            />
        </>
    );
}


export default function PreciosPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PreciosPageComponent />
    </Suspense>
  );
}
