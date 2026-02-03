
// src/app/(app)/pos/informe-pos/page.tsx
"use client";

import { withSuspense } from "@/lib/withSuspense";
import React, { useState, useEffect } from 'react';
import type { SaleReceipt, InventoryItem, ServiceRecord } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { inventoryService, saleService, serviceService, cashService } from '@/lib/services';
import InformePosContent from '../components/informe-pos-content';

function PageInner() {
  const { toast } = useToast();
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [
      saleService.onSalesUpdate(setAllSales),
      serviceService.onServicesUpdate(setAllServices),
      inventoryService.onItemsUpdate((items) => {
        setAllInventory(items);
        setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
    
  return <InformePosContent allSales={allSales} allServices={allServices} allInventory={allInventory} />;
}

export default withSuspense(PageInner);
