
"use client";

import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useEffect, Suspense, lazy, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import type { User, ServiceRecord, SaleReceipt, CashDrawerTransaction, InventoryItem, MonthlyFixedExpense, FinancialSummary } from '@/types';
import { inventoryService, serviceService, saleService, cashService, adminService } from '@/lib/services';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval, isValid, getDaysInMonth, differenceInDays } from 'date-fns';
import { parseDate } from '@/lib/forms';
import { calcEffectiveProfit, calcSuppliesCostFromItems } from '@/lib/money-helpers';

const DetallesReporteContent = lazy(() => import('./components/detalles-reporte-content'));
const MensualReporteContent = lazy(() => import('./components/mensual-reporte-content'));
const EgresosContent = lazy(() => import('../finanzas/components/egresos-content').then(m => ({ default: m.EgresosContent })));

interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

function ReportesPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'detalles';
  
  const [activeTab, setActiveTab] = useState(tab);
  const [isLoading, setIsLoading] = useState(true);
  
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [sales, setSales] = useState<SaleReceipt[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<MonthlyFixedExpense[]>([]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      serviceService.onServicesUpdate(setServices),
      saleService.onSalesUpdate(setSales),
      cashService.onCashTransactionsUpdate(setCashTransactions),
      inventoryService.onItemsUpdate(setInventory),
      inventoryService.onFixedExpensesUpdate(setExpenses),
      adminService.onUsersUpdate((data) => {
        setUsers(data);
        setIsLoading(false);
      })
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    router.push(`${pathname}?tab=${newTab}`);
  };

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
    const deliveredServices = services.filter(s => {
      const d = parseDate(s.deliveryDateTime);
      return s.status === 'Entregado' && d && isValid(d) && isWithinInterval(d, interval);
    });

    const completedSales = sales.filter(s => {
      const d = parseDate(s.saleDate);
      return s.status !== 'Cancelado' && d && isValid(d) && isWithinInterval(d, interval);
    });

    const serviceRevenue = deliveredServices.reduce((sum, s) => sum + (Number(s.totalCost) || 0), 0);
    const serviceCOGS = deliveredServices.reduce((sum, s) => sum + calcSuppliesCostFromItems(s.serviceItems, inventory), 0);
    
    const saleRevenue = completedSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const saleCOGS = completedSales.reduce((sum, s) => {
        const cost = s.items.reduce((acc, it: any) => {
            const inv = inventory.find(x => x.id === it.itemId || x.id === it.inventoryItemId);
            return acc + (inv?.unitPrice ?? 0) * (it.quantity ?? 1);
        }, 0);
        return sum + cost;
    }, 0);

    const totalRevenue = serviceRevenue + saleRevenue;
    const totalCOGS = serviceCOGS + saleCOGS;

    // 2. Gastos Fijos (Nómina y Gastos de Taller)
    const activePersonnel = users.filter(p => !p.isArchived);
    const totalTechnicianSalaries = activePersonnel
      .filter(p => (p as any).functions?.includes('tecnico') || (p as any).role.toLowerCase().includes('tecnico'))
      .reduce((sum, p) => sum + ((p as any).monthlySalary || 0), 0);
  
    const totalAdministrativeSalaries = activePersonnel
      .filter(p => !((p as any).functions?.includes('tecnico') || (p as any).role.toLowerCase().includes('tecnico')))
      .reduce((sum, p) => sum + ((p as any).monthlySalary || 0), 0);
  
    const totalFixedWorkshopExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalBaseMonthly = totalTechnicianSalaries + totalAdministrativeSalaries + totalFixedWorkshopExpenses;
    const totalBaseExpensesApplied = totalBaseMonthly * periodFactor;
  
    // 3. Comisiones Variables
    const totalVariableCommissions = deliveredServices.reduce((sum, s) => {
      const profit = calcEffectiveProfit(s, inventory);
      if (profit <= 0) return sum;
  
      let commission = 0;
      const advisor = activePersonnel.find(p => p.id === s.serviceAdvisorId);
      if ((advisor as any)?.commissionRate) commission += profit * ((advisor as any).commissionRate / 100);
        
      if(s.serviceItems)
        s.serviceItems.forEach(item => {
          const tech = activePersonnel.find(p => p.id === (item as any).technicianId);
          if ((tech as any)?.commissionRate) {
            const itemSuppliesCost = inventory.find(inv => inv.id === (item as any).supplyId)?.unitPrice ?? 0;
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
  }, [dateRange, services, sales, users, expenses, inventory]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const tabs = [
    { 
      value: "detalles", 
      label: "Detalles de Movimientos", 
      content: <DetallesReporteContent services={services} sales={sales} cashTransactions={cashTransactions} users={users} /> 
    },
    { 
      value: "mensual", 
      label: "Resumen Mensual", 
      content: <MensualReporteContent services={services} sales={sales} cashTransactions={cashTransactions} inventory={inventory} /> 
    },
    { 
      value: "egresos", 
      label: "Gastos Fijos", 
      content: (
        <Suspense fallback={<Loader2 className="animate-spin" />}>
          <EgresosContent 
            financialSummary={financialSummary} 
            fixedExpenses={expenses} 
            personnel={users}
            onExpensesUpdated={setExpenses}
          />
        </Suspense>
      )
    },
  ];

  return (
    <TabbedPageLayout
      title="Reportes Financieros"
      description="Control total de ingresos, egresos y flujo de efectivo de tu taller."
      activeTab={activeTab}
      onTabChange={handleTabChange}
      tabs={tabs}
    />
  );
}

export default withSuspense(ReportesPageInner);
