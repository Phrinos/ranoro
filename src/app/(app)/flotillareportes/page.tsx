
"use client";

import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import type { RentalPayment, VehicleExpense, OwnerWithdrawal, CashDrawerTransaction, User, Vehicle } from '@/types';
import { rentalService, cashService, adminService, inventoryService } from '@/lib/services';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { OwnerWithdrawalDialog, type OwnerWithdrawalFormValues } from '../flotilla/components/OwnerWithdrawalDialog';
import { VehicleExpenseDialog, type VehicleExpenseFormValues } from '../flotilla/components/VehicleExpenseDialog';
import { useToast } from '@/hooks/use-toast';

const DetallesFlotillaContent = lazy(() => import('./components/detalles-flotilla-content'));
const MensualFlotillaContent = lazy(() => import('./components/mensual-flotilla-content'));

function FlotillaReportesPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const tab = searchParams.get('tab') || 'detalles';
  
  const [activeTab, setActiveTab] = useState(tab);
  const [isLoading, setIsLoading] = useState(true);
  
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      rentalService.onRentalPaymentsUpdate(setPayments),
      rentalService.onVehicleExpensesUpdate(setExpenses),
      rentalService.onOwnerWithdrawalsUpdate(setWithdrawals),
      cashService.onCashTransactionsUpdate(setCashTransactions),
      inventoryService.onVehiclesUpdate(setVehicles),
      adminService.onUsersUpdate((data) => {
        setUsers(data);
        setIsLoading(false);
      })
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const vehicleOwners = React.useMemo(() => {
    const ownerSet = new Set<string>();
    vehicles
      .filter(v => v.isFleetVehicle) 
      .forEach(v => {
        if (v.ownerName) ownerSet.add(v.ownerName);
      });
    return Array.from(ownerSet).sort();
  }, [vehicles]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    router.push(`${pathname}?tab=${newTab}`);
  };

  const handleSaveWithdrawal = async (data: OwnerWithdrawalFormValues) => {
    try {
        await rentalService.addOwnerWithdrawal({ ...data });
        toast({ title: "Retiro Registrado" });
        setIsWithdrawalDialogOpen(false);
    } catch (e) {
        toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleSaveExpense = async (data: VehicleExpenseFormValues) => {
    try {
        await rentalService.addVehicleExpense(data);
        toast({ title: "Gasto Registrado" });
        setIsExpenseDialogOpen(false);
    } catch (e) {
        toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
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
      content: (
        <DetallesFlotillaContent 
          payments={payments} 
          expenses={expenses} 
          withdrawals={withdrawals} 
          cashTransactions={cashTransactions} 
          onAddWithdrawal={() => setIsWithdrawalDialogOpen(true)}
          onAddExpense={() => setIsExpenseDialogOpen(true)}
        /> 
      )
    },
    { 
      value: "mensual", 
      label: "Resumen Mensual", 
      content: <MensualFlotillaContent payments={payments} expenses={expenses} withdrawals={withdrawals} cashTransactions={cashTransactions} /> 
    },
  ];

  return (
    <>
      <TabbedPageLayout
        title="Reportes de Flotilla"
        description="Control financiero detallado de rentas, gastos de unidades y retiros de socios."
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={tabs}
      />

      <OwnerWithdrawalDialog
        open={isWithdrawalDialogOpen}
        onOpenChange={setIsWithdrawalDialogOpen}
        owners={vehicleOwners}
        onSave={handleSaveWithdrawal}
      />

      <VehicleExpenseDialog
        open={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        vehicles={vehicles}
        onSave={handleSaveExpense}
      />
    </>
  );
}

export default withSuspense(FlotillaReportesPageInner);
