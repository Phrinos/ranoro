// src/app/(app)/ai/page.tsx

"use client";

import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { Loader2, PlusCircle, Printer, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { SaleReceipt, InventoryItem, User, WorkshopInfo, ServiceRecord, CashDrawerTransaction, InitialCashBalance } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { inventoryService, saleService, serviceService, adminService, cashService } from '@/lib/services';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { TicketContent } from '@/components/ticket-content';
import { formatCurrency } from '@/lib/utils';
import html2canvas from 'html2canvas';
import ReactDOMServer from 'react-dom/server';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


const AnalisisIaContent = lazy(() => import('@/app/(app)/ai/components/analisis-ia-content').then(module => ({ default: module.AnalisisIaContent })));
const AsistenteComprasContent = lazy(() => import('@/app/(app)/ai/components/asistente-compras-content'));


function AiPageComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultTab = searchParams.get('tab') || 'analisis';
  
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
    router.push(`/ai?tab=${tab}`);
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
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <TabbedPageLayout
        title="Asistentes de I.A."
        description="Herramientas inteligentes para optimizar las operaciones de tu taller."
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={tabs}
      />
    </Suspense>
  );
}

export default function AiPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <AiPageComponent />
        </Suspense>
    )
}
