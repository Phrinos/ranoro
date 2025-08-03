// src/app/(app)/informes/components/page-component.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { inventoryService, operationsService } from '@/lib/services';
import type { InventoryItem, SaleReceipt, ServiceRecord } from '@/types';
import { Loader2 } from 'lucide-react';
import { InformePosContent } from '../../pos/components/informe-pos-content';

export function InformesPageComponent() {
    const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
    const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
    const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        setIsLoading(true);
        const unsubs = [
            operationsService.onSalesUpdate(setAllSales),
            operationsService.onServicesUpdate(setAllServices),
            inventoryService.onItemsUpdate((items) => {
                setAllInventory(items);
                setIsLoading(false);
            }),
        ];
        return () => unsubs.forEach(unsub => unsub());
    }, []);
    
    if (isLoading) {
        return <div className="flex h-64 justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
             <PageHeader
                title="Informes"
                description="Analiza el rendimiento de tus operaciones de ventas y servicios."
            />
            <InformePosContent
                allSales={allSales}
                allServices={allServices}
                allInventory={allInventory}
            />
        </div>
    )
}
