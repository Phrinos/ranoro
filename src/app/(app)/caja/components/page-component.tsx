

"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import type { SaleReceipt, InventoryItem, WorkshopInfo, ServiceRecord, CashDrawerTransaction, InitialCashBalance, User } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { saleService, serviceService, cashService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { db } from '@/lib/firebaseClient';
import { query, collection, orderBy, limit, onSnapshot, where, doc } from 'firebase/firestore';
import { format, startOfDay, isSameDay, startOfMonth, endOfMonth, isWithinInterval, isValid, parseISO } from 'date-fns';
import { parseDate } from '@/lib/forms';

const CajaPosContent = lazy(() => import('../../pos/caja/components/caja-pos-content').then(module => ({ default: module.CajaPosContent })));
const MovimientosCajaContent = lazy(() => import('./movimientos-caja-content').then(module => ({ default: module.MovimientosCajaContent })));


export function CajaPageComponent({ tab }: { tab?: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(tab || 'caja');
  const [isLoading, setIsLoading] = useState(true);

  // States for data from Firestore
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allCashTransactions, setAllCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [initialCashBalance, setInitialCashBalance] = useState<InitialCashBalance | null>(null); // For selected day
  const [latestInitialBalance, setLatestInitialBalance] = useState<InitialCashBalance | null>(null); // For running total
  
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);

    unsubs.push(saleService.onSalesUpdate(setAllSales));
    unsubs.push(serviceService.onServicesUpdate(setAllServices));
    unsubs.push(cashService.onCashTransactionsUpdate(setAllCashTransactions));

    // Listener for today's initial balance
    const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const todayBalanceRef = doc(db, "initialCashBalances", todayStr);
    unsubs.push(onSnapshot(todayBalanceRef, (snapshot) => {
        setInitialCashBalance(snapshot.exists() ? snapshot.data() as InitialCashBalance : null);
    }));

    // Query for the single latest initial balance for running total
    const latestBalanceQuery = query(collection(db, "initialCashBalances"), orderBy("date", "desc"), limit(1));
    unsubs.push(onSnapshot(latestBalanceQuery, (snapshot) => {
      if (!snapshot.empty) {
        setLatestInitialBalance(snapshot.docs[0].data() as InitialCashBalance);
      } else {
        setLatestInitialBalance(null);
      }
      setIsLoading(false);
    }));

    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const allCashOperations = useMemo(() => {
    // Only use the manual transactions here, as service/sale transactions are now added via `operationsService`
    return [...allCashTransactions].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [allCashTransactions]);

  const posTabs = [
    { value: "caja", label: "Caja", content: <CajaPosContent allCashOperations={allCashOperations} initialCashBalance={initialCashBalance} latestInitialBalance={latestInitialBalance} /> },
    { value: "movimientos", label: "Movimientos", content: <MovimientosCajaContent allCashTransactions={allCashOperations} allSales={allSales} allServices={allServices} /> },
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
