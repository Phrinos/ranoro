// src/app/(app)/precios/page.tsx
"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import type { VehiclePriceList } from '@/types';
import { PriceListManagementContent } from './components/price-list-management-content';
import initialVehicleDatabase from '@/lib/data/vehicle-database.json';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import type { EngineData } from '@/lib/data/vehicle-database-types';

function PreciosPageComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [priceLists, setPriceLists] = useState<VehiclePriceList[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dbState, setDbState] = useState(JSON.parse(JSON.stringify(initialVehicleDatabase)));
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = inventoryService.onPriceListsUpdate((data) => {
            setPriceLists(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const allMakes = useMemo(() => {
        return [...new Set(dbState.map((v: any) => v.make))].sort();
    }, [dbState]);

    const handleEngineDataSave = (makeName: string, modelName: string, generationIndex: number, engineIndex: number, updatedEngineData: EngineData) => {
        setDbState((currentDb: any[]) => {
            return currentDb.map(make => {
                if (make.make === makeName) {
                    const models = make.models.map((model: any) => {
                        if (model.name === modelName) {
                            const generations = [...model.generations];
                            if (generations[generationIndex]) {
                                const engines = [...generations[generationIndex].engines];
                                engines[engineIndex] = updatedEngineData;
                                generations[generationIndex] = { ...generations[generationIndex], engines };
                                return { ...model, generations };
                            }
                        }
                        return model;
                    });
                    return { ...make, models };
                }
                return make;
            });
        });
        toast({ title: 'Cambios guardados localmente', description: 'Haz clic en "Guardar en Base de Datos" para persistir los cambios.' });
    };

    const handleSaveToDatabase = async () => {
        setIsSaving(true);
        try {
            // NOTE: In a real scenario, this would be an API call to a secure backend endpoint
            // to write the file. Client-side file writing is not possible for security reasons.
            console.log(JSON.stringify(dbState, null, 2));
            toast({
                title: "Simulación de Guardado",
                description: "Los datos actualizados se han impreso en la consola. La escritura de archivos en el servidor no está permitida en este entorno.",
                duration: 7000,
            });
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudieron guardar los cambios.', variant: 'destructive'});
        } finally {
            setIsSaving(false);
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
                     <Button onClick={handleSaveToDatabase} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? 'Guardando...' : 'Guardar en Base de Datos'}
                    </Button>
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
