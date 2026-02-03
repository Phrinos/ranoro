
"use client";

import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import type { RentalPayment, VehicleExpense, OwnerWithdrawal, CashDrawerTransaction, User } from '@/types';
import { rentalService, cashService, adminService } from '@/lib/services';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';

const DetallesFlotillaContent = lazy(() => import('./components/detalles-flotilla-content'));
const MensualFlotillaContent = lazy(() => import('./components/mensual-flotilla-content'));

function FlotillaReportesPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'detalles';
  
  const [activeTab, setActiveTab] = useState(tab);
  const [isLoading, setIsLoading] = useState(true);
  
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      rentalService.onRentalPaymentsUpdate(setPayments),
      rentalService.onVehicleExpensesUpdate(setExpenses),
      rentalService.onOwnerWithdrawalsUpdate(setWithdrawals),
      cashService.onCashTransactionsUpdate(setCashTransactions),
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
      label: "Detalles de Flotilla", 
      content: <DetallesFlotillaContent payments={payments} expenses={expenses} withdrawals={withdrawals} cashTransactions={cashTransactions} /> 
    },
    { 
      value: "mensual", 
      label: "Resumen Mensual", 
      content: <MensualFlotillaContent payments={payments} expenses={expenses} withdrawals={withdrawals} cashTransactions={cashTransactions} /> 
    },
  ];

  return (
    <TabbedPageLayout
      title="Reportes de Flotilla"
      description="Control financiero detallado de rentas, gastos de unidades y retiros de socios."
      activeTab={activeTab}
      onTabChange={handleTabChange}
      tabs={tabs}
    />
  );
}

export default withSuspense(FlotillaReportesPageInner);
