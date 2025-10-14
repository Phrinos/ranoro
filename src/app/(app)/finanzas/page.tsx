// src/app/(app)/finanzas/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { useSearchParams } from 'next/navigation';
import type { User, ServiceRecord, SaleReceipt, MonthlyFixedExpense, Personnel, AppRole, FinancialSummary } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Shield, TrendingUp, BookOpen, DatabaseZap } from 'lucide-react';
import { adminService, inventoryService, serviceService, saleService } from '@/lib/services';
import { AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin, placeholderAppRoles } from '@/lib/placeholder-data';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth } from 'date-fns';

const MovimientosContent = lazy(() => import('./components/movimientos-content'));
const EgresosContent = lazy(() => import('./components/egresos-content').then(m => ({ default: m.EgresosContent })));
const CajaContent = lazy(() => import('./components/caja-content'));

function FinanzasPage() {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');
    
    const { toast } = useToast();
    const defaultTab = tab || 'movimientos';
    const [activeTab, setActiveTab] = useState(defaultTab);
    
    const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
    const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
    const [allExpenses, setAllExpenses] = useState<MonthlyFixedExpense[]>([]);
    const [allUsers, setAllUsers] = useState<Personnel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const now = new Date();
        return { from: startOfMonth(now), to: endOfMonth(now) };
    });

    useEffect(() => {
      setIsLoading(true);
      const unsubs: (() => void)[] = [
        serviceService.onServicesUpdate(setAllServices),
        saleService.onSalesUpdate(setAllSales),
        inventoryService.onFixedExpensesUpdate(setAllExpenses),
        adminService.onUsersUpdate((users) => {
          setAllUsers(users);
          setIsLoading(false);
        })
      ];
      return () => unsubs.forEach(unsub => unsub());
    }, []);

    const handleDateRangeChange = useCallback((range?: DateRange) => {
        setDateRange(range);
    }, []);

    if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }
    
    const tabs = [
      { value: "movimientos", label: "Movimientos", content: <Suspense fallback={<Loader2 className="animate-spin" />}><MovimientosContent allServices={allServices} allSales={allSales} allExpenses={allExpenses} allInventory={[]} dateRange={dateRange} onDateRangeChange={handleDateRangeChange} /></Suspense> },
      { value: "egresos", label: "Egresos", content: (
        <Suspense fallback={<Loader2 className="animate-spin" />}>
          <EgresosContent 
            financialSummary={{} as FinancialSummary} 
            fixedExpenses={allExpenses} 
            personnel={allUsers}
            onExpensesUpdated={setAllExpenses}
          />
        </Suspense>
      )},
      { value: "caja", label: "Caja", content: <Suspense fallback={<Loader2 className="animate-spin" />}><CajaContent /></Suspense> },
    ];

    return (
      <TabbedPageLayout
        title="Finanzas"
        description="Seguimiento de ingresos, egresos, y estado de caja."
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
      />
    );
}

export default function FinanzasPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <FinanzasPage />
    </Suspense>
  );
}
