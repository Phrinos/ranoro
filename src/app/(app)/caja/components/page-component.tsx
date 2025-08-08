

"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import type { SaleReceipt, InventoryItem, WorkshopInfo, ServiceRecord, CashDrawerTransaction, User } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { saleService, serviceService, cashService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { db } from '@/lib/firebaseClient';
import { query, collection, orderBy, limit, onSnapshot, where, doc } from 'firebase/firestore';
import { format, startOfDay, isSameDay, startOfMonth, endOfMonth, isWithinInterval, isValid, parseISO } from 'date-fns';
import { parseDate } from '@/lib/forms';
import { CajaPosContent } from '../../pos/caja/components/caja-pos-content';


const MovimientosCajaContent = lazy(() => import('./movimientos-caja-content').then(module => ({ default: module.MovimientosCajaContent })));


export function CajaPageComponent({ tab }: { tab?: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(tab || 'caja');
  const [isLoading, setIsLoading] = useState(true);

  // States for data from Firestore
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allCashTransactions, setAllCashTransactions] = useState<CashDrawerTransaction[]>([]);
  
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);

    unsubs.push(saleService.onSalesUpdate(setAllSales));
    unsubs.push(serviceService.onServicesUpdate(setAllServices));
    unsubs.push(cashService.onCashTransactionsUpdate((data) => {
        setAllCashTransactions(data);
        setIsLoading(false);
    }));

    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const allCashOperations = useMemo(() => {
    return [...allCashTransactions].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [allCashTransactions]);
  
  const cajaSummaryData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const transactionsInMonth = allCashOperations.filter(t => {
      const transactionDate = parseDate(t.date);
      return transactionDate && isValid(transactionDate) && isWithinInterval(transactionDate, { start: monthStart, end: monthEnd });
    });
    
    const totalCashInMonth = transactionsInMonth.reduce((sum, t) => {
      if (t.type === 'Entrada') return sum + t.amount;
      if (t.type === 'Salida') return sum - t.amount;
      return sum;
    }, 0);
    
    const dailyStart = startOfDay(new Date());
    const dailyEnd = endOfDay(new Date());
    
    const transactionsToday = allCashOperations.filter(t => {
       const transactionDate = parseDate(t.date);
       return transactionDate && isValid(transactionDate) && isWithinInterval(transactionDate, { start: dailyStart, end: dailyEnd });
    });
    
    const dailyCashIn = transactionsToday.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
    const dailyCashOut = transactionsToday.filter(t => t.type === 'Salida').reduce((sum, t) => sum + t.amount, 0);

    return {
        totalCashInMonth,
        dailyCashIn,
        dailyCashOut,
    }
  }, [allCashOperations]);

  const posTabs = [
    { value: "caja", label: "Caja", content: <CajaPosContent allSales={allSales} allServices={allServices} allCashTransactions={allCashTransactions} initialCashBalance={null} /> },
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
