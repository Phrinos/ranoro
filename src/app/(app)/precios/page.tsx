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
    const [priceLists, setPriceLists] = useState<VehiclePriceList[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dbState, setDbState] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        const unsubs = [
            inventoryService.onPriceListsUpdate(setPriceLists),
            inventoryService.onVehicleDataUpdate((data) => {
                setDbState(data);
                setIsLoading(false);
            })
        ];
        return () => unsubs.forEach(unsub => unsub());
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
        if (!db) {
            toast({ title: "Error de conexión", description: "No se pudo conectar a la base de datos.", variant: "destructive" });
            setIsSaving(false);
            return;
        }

        try {
            const batch = db.batch(); // Assuming 'db' is your Firestore instance
            dbState.forEach(makeData => {
                const { make, ...data } = makeData;
                const docRef = doc(db, 'vehicleData', make);
                batch.set(docRef, data);
            });
            await batch.commit();
            
            toast({
                title: "Guardado en Base de Datos",
                description: "La base de datos de vehículos ha sido actualizada en Firestore.",
                duration: 5000,
            });
        } catch (error) {
            console.error("Error saving to Firestore:", error);
            toast({ title: 'Error', description: 'No se pudieron guardar los cambios en la base de datos.', variant: 'destructive'});
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
