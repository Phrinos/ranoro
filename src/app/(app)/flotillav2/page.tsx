"use client";

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { withSuspense } from "@/lib/withSuspense";
import { Loader2 } from 'lucide-react';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { RegistrarAbono } from './components/RegistrarAbono';
import { inventoryService, personnelService, rentalService, cashService } from '@/lib/services';
import type { Driver, Vehicle, DailyRentalCharge, RentalPayment, ManualDebtEntry, OwnerWithdrawal, VehicleExpense, CashDrawerTransaction } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Lazy loading the tab contents for performance
const BalanceTab = lazy(() => import('./components/BalanceTab'));
const ConductoresTab = lazy(() => import('./components/ConductoresTab'));
const VehiculosTab = lazy(() => import('./components/VehiculosTab'));
const DetallesReporteTab = lazy(() => import('./components/DetallesReporteTab'));
const ResumenMensualTab = lazy(() => import('./components/ResumenMensualTab'));

function FlotillaV2Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'balance');

  // Data states
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dailyCharges, setDailyCharges] = useState<DailyRentalCharge[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [manualDebts, setManualDebts] = useState<ManualDebtEntry[]>([]);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      inventoryService.onVehiclesUpdate(setVehicles),
      personnelService.onDriversUpdate(setDrivers),
      rentalService.onDailyChargesUpdate(setDailyCharges),
      rentalService.onRentalPaymentsUpdate(setPayments),
      personnelService.onManualDebtsUpdate(setManualDebts),
      rentalService.onOwnerWithdrawalsUpdate(setWithdrawals),
      rentalService.onVehicleExpensesUpdate(setExpenses),
      cashService.onCashTransactionsUpdate((data) => {
        setCashTransactions(data);
        setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/flotillav2?tab=${tab}`, { scroll: false });
  };

  const tabs = [
    { 
      value: 'balance', 
      label: 'Balance', 
      content: <BalanceTab drivers={drivers} dailyCharges={dailyCharges} payments={payments} manualDebts={manualDebts} /> 
    },
    { 
      value: 'conductores', 
      label: 'Conductores', 
      content: <ConductoresTab drivers={drivers} /> 
    },
    { 
      value: 'vehiculos', 
      label: 'Vehículos', 
      content: <VehiculosTab vehicles={vehicles} /> 
    },
    { 
      value: 'detalles', 
      label: 'Detalle Reporte', 
      content: <DetallesReporteTab payments={payments} expenses={expenses} withdrawals={withdrawals} cashTransactions={cashTransactions} vehicles={vehicles} /> 
    },
    { 
      value: 'resumen', 
      label: 'Resumen Mensual', 
      content: <ResumenMensualTab payments={payments} expenses={expenses} withdrawals={withdrawals} cashTransactions={cashTransactions} /> 
    },
  ];

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  return (
    <TabbedPageLayout
      title="Flotilla 2.0"
      description="Gestión integral de unidades, conductores y finanzas de flotilla."
      activeTab={activeTab}
      onTabChange={handleTabChange}
      tabs={tabs}
      actions={<RegistrarAbono drivers={drivers} vehicles={vehicles} />}
    />
  );
}

export default withSuspense(FlotillaV2Page);
