
"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { Loader2 } from 'lucide-react';
import type { InventoryItem, ServiceRecord } from '@/types';
import { inventoryService, serviceService } from '@/lib/services';

const AnalisisIaContent = lazy(() => import('@/app/(app)/ai/components/analisis-ia-content').then(module => ({ default: module.AnalisisIaContent })));
const AsistenteComprasContent = lazy(() => import('@/app/(app)/ai/components/asistente-compras-content'));

function PageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const defaultTab = sp.get('tab') || 'analisis';
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isLoading, setIsLoading] = useState(true);
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      inventoryService.onItemsUpdate(setInventoryItems),
      serviceService.onServicesUpdate((services) => {
          setServiceRecords(services);
          setIsLoading(false);
      })
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(sp.toString());
    newParams.set('tab', tab);
    router.push(`${pathname}?${newParams.toString()}`);
  };

  const tabs = [
    { value: 'analisis', label: 'Análisis de Inventario', content: (
        isLoading 
            ? <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
            : <AnalisisIaContent inventoryItems={inventoryItems} serviceRecords={serviceRecords} />
    )},
    { value: 'compras', label: 'Asistente de Compras', content: <AsistenteComprasContent /> },
  ];

  return (
    <TabbedPageLayout
      title="Asistentes de I.A."
      description="Herramientas inteligentes para optimizar las operaciones de tu taller."
      activeTab={activeTab}
      onTabChange={handleTabChange}
      tabs={tabs}
    />
  );
}

export default withSuspense(PageInner, null);
