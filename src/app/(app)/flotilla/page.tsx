// src/app/(app)/flotilla/page.tsx
"use client";

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inventoryService, personnelService, rentalService } from '@/lib/services';
import type { Vehicle, Driver, DailyRentalCharge, RentalPayment, ManualDebtEntry, OwnerWithdrawal, VehicleExpense } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { Button } from '@/components/ui/button';
import { Loader2, MinusCircle, PlusCircle } from 'lucide-react';

import { FlotillaVehiculosTab } from './vehiculos/components/FlotillaVehiculosTab';
import { FlotillaConductoresTab } from './conductores/components/FlotillaConductoresTab';
import { FlotillaBalanceTab } from './balance/components/FlotillaBalanceTab';
import { FlotillaCajaTab } from './caja/components/FlotillaCajaTab';

import { GlobalTransactionDialog, type GlobalTransactionFormValues } from './components/GlobalTransactionDialog';
import { OwnerWithdrawalDialog, type OwnerWithdrawalFormValues } from './components/OwnerWithdrawalDialog';
import { VehicleExpenseDialog, type VehicleExpenseFormValues } from './components/VehicleExpenseDialog';

function FlotillaPageComponent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dailyCharges, setDailyCharges] = useState<DailyRentalCharge[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [manualDebts, setManualDebts] = useState<ManualDebtEntry[]>([]);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'payment' | 'charge'>('payment');
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const defaultTab = tab || 'balance';
  const [activeTab, setActiveTab] = useState(defaultTab);


  useEffect(() => {
    const unsubs = [
      inventoryService.onVehiclesUpdate(setVehicles),
      personnelService.onDriversUpdate(setDrivers),
      rentalService.onDailyChargesUpdate(setDailyCharges),
      rentalService.onRentalPaymentsUpdate(setPayments),
      personnelService.onManualDebtsUpdate(setManualDebts),
      rentalService.onOwnerWithdrawalsUpdate(setWithdrawals),
      rentalService.onVehicleExpensesUpdate(setExpenses),
    ];
    
    Promise.all([
        inventoryService.onVehiclesUpdatePromise(),
        personnelService.onDriversUpdatePromise(),
    ]).then(() => setIsLoading(false));

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleOpenTransactionDialog = (type: 'payment' | 'charge') => {
    setTransactionType(type);
    setIsTransactionDialogOpen(true);
  };

  const handleSaveTransaction = async (values: GlobalTransactionFormValues) => {
    try {
      const driver = drivers.find(d => d.id === values.driverId);
      if (!driver) throw new Error("Driver not found.");
      
      if (transactionType === 'payment') {
        const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
        if (!vehicle) throw new Error("Vehicle not found for payment.");
        await rentalService.addRentalPayment(driver, vehicle, values.amount, values.note, values.date, values.paymentMethod);
        toast({ title: "Pago Registrado" });
      } else {
        await personnelService.saveManualDebt(values.driverId, { ...values, date: values.date.toISOString() });
        toast({ title: "Cargo Registrado" });
      }
      setIsTransactionDialogOpen(false);
    } catch (error) {
       toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  };
  
  const handleSaveWithdrawal = async (values: OwnerWithdrawalFormValues) => {
    try {
      await rentalService.addOwnerWithdrawal(values);
      toast({ title: "Retiro Registrado" });
      setIsWithdrawalDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo registrar el retiro.", variant: "destructive" });
    }
  };
  
  const handleSaveExpense = async (values: VehicleExpenseFormValues) => {
     try {
      await rentalService.addVehicleExpense(values);
      toast({ title: "Gasto Registrado" });
      setIsExpenseDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo registrar el gasto.", variant: "destructive" });
    }
  };
  
  const pageActions = (
    <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={() => handleOpenTransactionDialog('charge')} variant="outline" className="w-full sm:w-auto bg-white border-red-500 text-black font-bold hover:bg-red-50">
            <MinusCircle className="mr-2 h-4 w-4 text-red-500" /> Generar Cargo
        </Button>
        <Button onClick={() => handleOpenTransactionDialog('payment')} variant="outline" className="w-full sm:w-auto bg-white border-green-500 text-black font-bold hover:bg-green-50">
            <PlusCircle className="mr-2 h-4 w-4 text-green-700" /> Registrar Pago
        </Button>
    </div>
  );

  const tabs = [
    { value: 'balance', label: 'Balance General', content: isLoading ? <Skeleton className="h-96" /> : <FlotillaBalanceTab drivers={drivers} vehicles={vehicles} dailyCharges={dailyCharges} payments={payments} manualDebts={manualDebts} /> },
    { value: 'conductores', label: 'Conductores', content: isLoading ? <Skeleton className="h-96" /> : <FlotillaConductoresTab drivers={drivers} /> },
    { value: 'vehiculos', label: 'Vehículos', content: isLoading ? <Skeleton className="h-96" /> : <FlotillaVehiculosTab vehicles={vehicles.filter(v => v.isFleetVehicle)} /> },
    { value: 'caja', label: 'Caja', content: isLoading ? <Skeleton className="h-96" /> : <FlotillaCajaTab payments={payments} withdrawals={withdrawals} expenses={expenses} drivers={drivers} vehicles={vehicles} allDailyCharges={dailyCharges} allManualDebts={manualDebts} onAddWithdrawal={() => setIsWithdrawalDialogOpen(true)} onAddExpense={() => setIsExpenseDialogOpen(true)} /> },
  ];

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <>
       <TabbedPageLayout
            title="Gestión de Flotilla"
            description="Administra tus vehículos, conductores y finanzas de la flotilla."
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={tabs}
            actions={pageActions}
        />
      
      <GlobalTransactionDialog
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
        onSave={handleSaveTransaction}
        transactionType={transactionType}
        drivers={drivers.filter(d => !d.isArchived)}
      />
      <OwnerWithdrawalDialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen} vehicles={vehicles} onSave={handleSaveWithdrawal} />
      <VehicleExpenseDialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen} vehicles={vehicles} onSave={handleSaveExpense} />
    </>
  );
}

export default function FlotillaPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <FlotillaPageComponent />
    </Suspense>
  );
}
