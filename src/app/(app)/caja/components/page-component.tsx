
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import type { SaleReceipt, InventoryItem, WorkshopInfo, ServiceRecord, CashDrawerTransaction, InitialCashBalance, User } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { operationsService, inventoryService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { CajaPosContent } from '../../pos/caja/components/caja-pos-content';
import { MovimientosPosContent } from '../../pos/components/movimientos-pos-content';

export function CajaPageComponent({ tab }: { tab?: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(tab || 'caja');
  const [isLoading, setIsLoading] = useState(true);

  // States for data from Firestore
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allCashTransactions, setAllCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [initialCashBalance, setInitialCashBalance] = useState<InitialCashBalance | null>(null);
  
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);

    unsubs.push(operationsService.onSalesUpdate(setAllSales));
    unsubs.push(operationsService.onServicesUpdate(setAllServices));
    unsubs.push(operationsService.onCashTransactionsUpdate(setAllCashTransactions));
    unsubs.push(operationsService.onInitialCashBalanceUpdate((data) => {
        setInitialCashBalance(data);
        setIsLoading(false);
    }));

    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const posTabs = [
    { value: "caja", label: "Caja", content: <CajaPosContent allSales={allSales} allServices={allServices} allCashTransactions={allCashTransactions} initialCashBalance={initialCashBalance} /> },
    { value: "movimientos", label: "Movimientos", content: <MovimientosPosContent allCashTransactions={allCashTransactions} allSales={allSales} allServices={allServices} initialCashBalance={initialCashBalance} /> },
  ];

  if (isLoading) { return <div className="flex h-[50vh] w-full items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" /><p className="text-lg ml-4">Cargando datos...</p></div>; }
  
  return (
    <>
      <TabbedPageLayout
        title="Caja y Movimientos"
        description="Gestiona el flujo de efectivo de tu taller y consulta el historial de transacciones."
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={posTabs}
      />
    </>
  );
}
