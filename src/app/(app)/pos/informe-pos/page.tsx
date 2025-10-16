

"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import type { SaleReceipt, InventoryItem, ServiceRecord, CashDrawerTransaction, InitialCashBalance } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { inventoryService, saleService, serviceService, cashService } from '@/lib/services';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { InformePosContent } from '../components/informe-pos-content';
import { CorteDeCajaContent } from '../components/corte-de-caja-content';
import { Button } from "@/components/ui/button";

function PageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
    
  const { toast } = useToast();
  const defaultTab = tab || 'resumen';
  const [activeTab, setActiveTab] = useState(defaultTab);
    
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [initialBalance, setInitialBalance] = useState<InitialCashBalance | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [
      saleService.onSalesUpdate(setAllSales),
      serviceService.onServicesUpdate(setAllServices),
      inventoryService.onItemsUpdate(setAllInventory),
      cashService.onCashTransactionsUpdate(setCashTransactions),
    ];
    
    cashService.getInitialBalance().then(balance => {
        setInitialBalance(balance);
        setIsLoading(false);
    });

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleUpdateBalance = async (newBalance: number) => {
    const authUserString = localStorage.getItem('authUser');
    const user = authUserString ? JSON.parse(authUserString) : null;
    if (!user) {
        toast({ title: 'Error', description: 'No se pudo identificar al usuario.', variant: 'destructive'});
        return;
    }
    await cashService.setInitialBalance(newBalance, user.id, user.name);
    const updatedBalance = await cashService.getInitialBalance();
    setInitialBalance(updatedBalance);
    toast({ title: 'Saldo Inicial Actualizado' });
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
    
  const tabs = [
    { value: "resumen", label: "Resumen de Ventas", content: <InformePosContent allSales={allSales} allServices={allServices} allInventory={allInventory} /> },
    { value: "corte", label: "Corte de Caja", content: <CorteDeCajaContent allSales={allSales} cashTransactions={cashTransactions} initialBalance={initialBalance} onUpdateBalance={handleUpdateBalance} /> },
  ];

  return (
    <TabbedPageLayout
      title="Informes"
      description="Analiza tus ventas de mostrador y realiza tu corte de caja diario."
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={tabs}
    />
  );
}

export default withSuspense(PageInner, null);
