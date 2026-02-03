
"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import type { User, ServiceRecord, SaleReceipt, MonthlyFixedExpense, Personnel, AppRole, FinancialSummary, InventoryItem } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { adminService, inventoryService, serviceService, saleService } from '@/lib/services';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { startOfMonth, endOfMonth, isWithinInterval, isValid, getDaysInMonth, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { parseDate } from '@/lib/forms';
import { calcEffectiveProfit, calcSuppliesCostFromItems, calculateSaleProfit } from '@/lib/money-helpers';

interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

const MovimientosContent = lazy(() => import('./components/movimientos-content'));
const EgresosContent = lazy(() => import('./components/egresos-content').then(m => ({ default: m.EgresosContent })));
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
  const [allExpenses, setAllExpenses] = useState<MonthlyFixedExpense[]>([]);
  const [allUsers, setAllUsers] = useState<Personnel[]>([]);
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
      inventoryService.onFixedExpensesUpdate(setAllExpenses),
      adminService.onUsersUpdate((users) => {
        setAllUsers(users as any);
      }),
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

  const financialSummary = useMemo<FinancialSummary & { totalRevenue: number, totalCOGS: number, netProfit: number }>(() => {
    if (!dateRange?.from) return { totalTechnicianSalaries: 0, totalAdministrativeSalaries: 0, totalFixedExpenses: 0, totalVariableCommissions: 0, totalBaseExpenses: 0, totalRevenue: 0, totalCOGS: 0, netProfit: 0 };
  
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
    const interval = { start: from, end: to };
  
    const daysInMonth = getDaysInMonth(from);
    const periodDays = Math.min(daysInMonth, differenceInDays(to, from) + 1);
    const periodFactor = periodDays / daysInMonth;
  
    // 1. Ingresos y Costos de Insumos (COGS)
    const deliveredServices = allServices.filter(s => {
      const d = parseDate(s.deliveryDateTime);
      return s.status === 'Entregado' && d && isValid(d) && isWithinInterval(d, interval);
    });

    const completedSales = allSales.filter(s => {
      const d = parseDate(s.saleDate);
      return s.status !== 'Cancelado' && d && isValid(d) && isWithinInterval(d, interval);
    });

    const serviceRevenue = deliveredServices.reduce((sum, s) => sum + (Number(s.totalCost) || 0), 0);
    const serviceCOGS = deliveredServices.reduce((sum, s) => sum + calcSuppliesCostFromItems(s.serviceItems, inventoryItems), 0);
    
    const saleRevenue = completedSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const saleCOGS = completedSales.reduce((sum, s) => {
        const cost = s.items.reduce((acc, it: any) => {
            const inv = inventoryItems.find(x => x.id === it.itemId || x.id === it.inventoryItemId);
            return acc + (inv?.unitPrice ?? 0) * (it.quantity ?? 1);
        }, 0);
        return sum + cost;
    }, 0);

    const totalRevenue = serviceRevenue + saleRevenue;
    const totalCOGS = serviceCOGS + saleCOGS;

    // 2. Gastos Fijos (Nómina y Gastos de Taller)
    const activePersonnel = allUsers.filter(p => !p.isArchived);
    const totalTechnicianSalaries = activePersonnel
      .filter(p => (p as any).functions?.includes('tecnico') || (p as any).role.toLowerCase().includes('tecnico'))
      .reduce((sum, p) => sum + ((p as any).monthlySalary || 0), 0);
  
    const totalAdministrativeSalaries = activePersonnel
      .filter(p => !((p as any).functions?.includes('tecnico') || (p as any).role.toLowerCase().includes('tecnico')))
      .reduce((sum, p) => sum + ((p as any).monthlySalary || 0), 0);
  
    const totalFixedWorkshopExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalBaseMonthly = totalTechnicianSalaries + totalAdministrativeSalaries + totalFixedWorkshopExpenses;
    const totalBaseExpensesApplied = totalBaseMonthly * periodFactor;
  
    // 3. Comisiones Variables
    const totalVariableCommissions = deliveredServices.reduce((sum, s) => {
      const profit = calcEffectiveProfit(s, inventoryItems);
      if (profit <= 0) return sum;
  
      let commission = 0;
      const advisor = activePersonnel.find(p => p.id === s.serviceAdvisorId);
      if ((advisor as any)?.commissionRate) commission += profit * ((advisor as any).commissionRate / 100);
        
      if(s.serviceItems)
        s.serviceItems.forEach(item => {
          const tech = activePersonnel.find(p => p.id === (item as any).technicianId);
          if ((tech as any)?.commissionRate) {
            const itemSuppliesCost = inventoryItems.find(inv => inv.id === (item as any).supplyId)?.unitPrice ?? 0;
            const itemProfit = (item.sellingPrice || 0) - itemSuppliesCost;
            if (itemProfit > 0) commission += itemProfit * ((tech as any).commissionRate / 100);
          }
        });
      return sum + commission;
    }, 0);
  
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalBaseExpensesApplied - totalVariableCommissions;

    return {
      totalRevenue,
      totalCOGS,
      totalTechnicianSalaries,
      totalAdministrativeSalaries,
      totalFixedExpenses: totalFixedWorkshopExpenses,
      totalVariableCommissions,
      totalBaseExpenses: totalBaseExpensesApplied,
      netProfit,
    };
  }, [dateRange, allServices, allSales, allUsers, allExpenses, inventoryItems]);

  const onTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/finanzas?tab=${tab}`);
  };

  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }
    
  const tabs = [
    { value: "caja", label: "Caja", content: <Suspense fallback={<Loader2 className="animate-spin" />}><CajaContent /></Suspense> },
    { value: "movimientos", label: "Movimientos", content: <Suspense fallback={<Loader2 className="animate-spin" />}><MovimientosContent allSales={allSales} allServices={allServices} allInventory={inventoryItems} allExpenses={allExpenses} dateRange={dateRange} onDateRangeChange={handleDateRangeChange} /></Suspense> },
    { value: "egresos", label: "Egresos", content: (
      <Suspense fallback={<Loader2 className="animate-spin" />}>
        <EgresosContent 
          financialSummary={financialSummary} 
          fixedExpenses={allExpenses} 
          personnel={allUsers}
          onExpensesUpdated={setAllExpenses}
        />
      </Suspense>
    )},
  ];

  return (
    <TabbedPageLayout
      title="Finanzas"
      description="Analiza los movimientos de ingresos, egresos y el estado de resultados de tu taller."
      activeTab={activeTab}
      onTabChange={onTabChange}
      tabs={tabs}
    />
  );
}

export default withSuspense(PageInner, null);
