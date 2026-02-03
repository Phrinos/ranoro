
"use client";

import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import type { User, ServiceRecord, SaleReceipt, CashDrawerTransaction, InventoryItem } from '@/types';
import { inventoryService, serviceService, saleService, cashService, adminService } from '@/lib/services';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';

const DetallesReporteContent = lazy(() => import('./components/detalles-reporte-content'));
const MensualReporteContent = lazy(() => import('./components/mensual-reporte-content'));

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

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      serviceService.onServicesUpdate(setServices),
      saleService.onSalesUpdate(setSales),
      cashService.onCashTransactionsUpdate(setCashTransactions),
      inventoryService.onItemsUpdate(setInventory),
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
