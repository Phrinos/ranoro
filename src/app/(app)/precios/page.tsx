
"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import type { EngineData } from '@/lib/data/vehicle-database-types';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { VEHICLE_COLLECTION } from '@/lib/vehicle-constants';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { VehicleCatalogEditor } from './components/VehicleCatalogEditor';

const PriceListManagementContent = lazy(() => import('./components/price-list-management-content'));
const VencimientosContent = lazy(() => import('./components/VencimientosContent'));

function PageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'lista');
    
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = inventoryService.onVehicleDataUpdate((data) => {
        setPriceLists(data);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const allMakes = useMemo(() => {
    return [...new Set(priceLists.map((list) => list.make))].sort();
  }, [priceLists]);
    
  const handleEngineDataSave = async (makeName: string, modelName: string, generationIndex: number, engineIndex: number, updatedEngineData: EngineData) => {
    if (!db) return toast({ title: "Error de conexión", variant: "destructive" });
    
    try {
        const makeDocRef = doc(db, VEHICLE_COLLECTION, makeName);
        const makeDocSnap = await getDoc(makeDocRef);

        if (!makeDocSnap.exists()) throw new Error("Marca no encontrada en la base de datos.");
        const makeDocData = makeDocSnap.data();

        const modelIndex = makeDocData.models.findIndex((m: any) => m.name === modelName);
        if (modelIndex === -1) throw new Error("Modelo no encontrado");
            
        const updatedModels = [...makeDocData.models];
        const updatedGenerations = [...updatedModels[modelIndex].generations];
        const updatedEngines = [...updatedGenerations[genIndex].engines];
            
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

  const makeQueryParam = searchParams.get('make');

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  const tabs = [
    { value: 'lista', label: 'Lista de Precios', content: 
        <PriceListManagementContent 
            priceLists={priceLists}
            allMakes={allMakes}
            onEngineDataSave={handleEngineDataSave}
        /> 
    },
    { value: 'vencimientos', label: 'Vencimientos', content: 
        <VencimientosContent 
            priceLists={priceLists} 
            onEngineDataSave={handleEngineDataSave} 
        /> 
    },
    { value: 'editor', label: 'Editor de Catálogo', content: 
        makeQueryParam ? <VehicleCatalogEditor make={makeQueryParam} /> : <div>Seleccione una marca en la pestaña de Lista de Precios para editar.</div>
    }
  ];
    
  return (
    <TabbedPageLayout
        title="Precotizaciones"
        description="Gestiona los costos de servicios e insumos para cada vehículo."
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
    />
  );
}

export default withSuspense(PageInner, null);
