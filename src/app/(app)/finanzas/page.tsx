
"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import type { ServiceRecord, SaleReceipt, MonthlyFixedExpense, Personnel, InventoryItem } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { adminService, inventoryService, serviceService, saleService } from '@/lib/services';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { startOfMonth, endOfMonth } from 'date-fns';

interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

const MovimientosContent = lazy(() => import('./components/movimientos-content'));
const CajaContent = lazy(() => import('./components/caja-content'));

function PageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
    
  const { toast } = useToast();
  const defaultTab = tab || 'caja';
  const [activeTab, setActiveTab] = useState(defaultTab);
    
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
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
      inventoryService.onItemsUpdate((items) => {
        setInventoryItems(items);
        setIsLoading(false);
      })
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleDateRangeChange = useCallback((range?: DateRange) => {
    setDateRange(range);
  }, []);

  const onTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/finanzas?tab=${tab}`);
  };

  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }
    
  const tabs = [
    { value: "caja", label: "Caja", content: <Suspense fallback={<Loader2 className="animate-spin" />}><CajaContent /></Suspense> },
    { value: "movimientos", label: "Movimientos", content: <Suspense fallback={<Loader2 className="animate-spin" />}><MovimientosContent allSales={allSales} allServices={allServices} allInventory={inventoryItems} allExpenses={[]} dateRange={dateRange} onDateRangeChange={handleDateRangeChange} /></Suspense> },
  ];

  return (
    <TabbedPageLayout
      title="Finanzas"
      description="Controla el efectivo de tu caja y revisa los movimientos diarios."
      activeTab={activeTab}
      onTabChange={onTabChange}
      tabs={tabs}
    />
  );
}

export default withSuspense(PageInner, null);
