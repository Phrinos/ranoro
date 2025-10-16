


"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import type { User, ServiceRecord, SaleReceipt, MonthlyFixedExpense, Personnel, AppRole, FinancialSummary, InventoryItem } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { adminService, inventoryService, serviceService, saleService } from "@/lib/services";
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { startOfMonth, endOfMonth, isWithinInterval, isValid, getDaysInMonth, differenceInDays } from 'date-fns';
import { parseDate } from '@/lib/forms';
import { calcEffectiveProfit } from '@/lib/money-helpers';

interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

const MovimientosContent = lazy(() => import('./components/movimientos-content'));
const EgresosContent = lazy(() => import('./components/egresos-content').then(m => ({ default: m.EgresosContent })));

function PageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
    
  const { toast } = useToast();
  const defaultTab = tab || 'movimientos';
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
        setAllUsers(users);
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

  const financialSummary = useMemo<FinancialSummary>(() => {
    if (!dateRange?.from) return { totalTechnicianSalaries: 0, totalAdministrativeSalaries: 0, totalFixedExpenses: 0, totalVariableCommissions: 0, totalBaseExpenses: 0 };
  
    const from = startOfMonth(dateRange.from);
    const to = endOfMonth(dateRange.to ?? dateRange.from);
  
    const periodDays = differenceInDays(to, from) + 1;
    const daysInMonth = getDaysInMonth(from);
    const periodFactor = periodDays / daysInMonth;
  
    const activePersonnel = allUsers.filter(p => {
      if ((p as any).isArchived) return false;
      const hireDate = (p as any).hireDate ? parseDate((p as any).hireDate) : null;
      return !hireDate || (hireDate && isValid(hireDate) && hireDate <= to);
    });
  
    const activeExpenses = allExpenses.filter(e => {
      const createdAt = (e as any).createdAt ? parseDate((e as any).createdAt) : null;
      return !createdAt || (createdAt && isValid(createdAt) && createdAt <= to);
    });
  
    const totalTechnicianSalaries = activePersonnel
      .filter(p => (p as any).functions?.includes('tecnico') || (p as any).role.toLowerCase().includes('tecnico'))
      .reduce((sum, p) => sum + ((p as any).monthlySalary || 0), 0);
  
    const totalAdministrativeSalaries = activePersonnel
      .filter(p => !((p as any).functions?.includes('tecnico') || (p as any).role.toLowerCase().includes('tecnico')))
      .reduce((sum, p) => sum + ((p as any).monthlySalary || 0), 0);
  
    const totalFixedExpenses = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  
    const deliveredServices = allServices.filter(s => {
      const d = s.deliveryDateTime ? parseDate(s.deliveryDateTime) : null;
      return s.status === 'Entregado' && d && isValid(d) && isWithinInterval(d, { start: from, end: to });
    });
  
    const totalVariableCommissions = deliveredServices.reduce((sum, s) => {
      const profit = calcEffectiveProfit(s);
      if (profit <= 0) return sum;
  
      let commission = 0;
      const advisor = activePersonnel.find(p => p.id === s.serviceAdvisorId);
      if ((advisor as any)?.commissionRate) commission += profit * ((advisor as any).commissionRate / 100);
        
      s.serviceItems.forEach(item => {
        const tech = activePersonnel.find(p => p.id === (item as any).technicianId);
        if ((tech as any)?.commissionRate) {
          const itemProfit = (item.sellingPrice || 0) - (inventoryService.getSuppliesCostForItem(item, inventoryItems) || 0);
          if (itemProfit > 0) commission += itemProfit * ((tech as any).commissionRate / 100);
        }
      });
      return sum + commission;
    }, 0);
  
    return {
      totalTechnicianSalaries,
      totalAdministrativeSalaries,
      totalFixedExpenses,
      totalVariableCommissions,
      totalBaseExpenses: (totalTechnicianSalaries + totalAdministrativeSalaries + totalFixedExpenses) * periodFactor,
    };
  }, [dateRange, allServices, allUsers, allExpenses, inventoryItems]);

  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }
    
  const tabs = [
    { value: "movimientos", label: "Movimientos", content: <Suspense fallback={<Loader2 className="animate-spin" />}><MovimientosContent allServices={allServices} allSales={allSales} allExpenses={allExpenses} allInventory={inventoryItems} dateRange={dateRange} onDateRangeChange={handleDateRangeChange} /></Suspense> },
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
      description="Analiza los movimientos de ingresos, egresos y el estado de caja de tu taller."
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={tabs}
    />
  );
}

export default withSuspense(PageInner, null);
