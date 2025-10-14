// src/app/(app)/precios/page.tsx
"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import type { VehiclePriceList } from '@/types';
import { PriceListManagementContent } from './components/price-list-management-content';
import vehicleDatabase from '@/lib/data/vehicle-database.json';

function PreciosPageComponent() {
    const searchParams = useSearchParams();
    const [priceLists, setPriceLists] = useState<VehiclePriceList[]>([]);
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
        return [...new Set(vehicleDatabase.map(v => v.make))].sort();
    }, []);

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
                <h1 className="text-3xl font-bold tracking-tight">Precotizaciones</h1>
                <p className="text-primary-foreground/80 mt-1">
                    Gestiona los costos de servicios e insumos para cada vehículo.
                </p>
            </div>
            <PriceListManagementContent 
                priceLists={priceLists}
                allMakes={allMakes}
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
