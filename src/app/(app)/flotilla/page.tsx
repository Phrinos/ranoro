
// src/app/(app)/flotilla/page.tsx
"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { Button } from '@/components/ui/button';
import { withSuspense } from '@/lib/withSuspense';

import type { Vehicle, Driver, DailyRentalCharge, RentalPayment, ManualDebtEntry, OwnerWithdrawal, VehicleExpense, PaymentMethod } from '@/types';
import { inventoryService, personnelService, rentalService } from '@/lib/services';
import { useFlotillaData } from './useFlotillaData';

import { GlobalTransactionDialog, type GlobalTransactionFormValues } from './components/GlobalTransactionDialog';
import { OwnerWithdrawalDialog, type OwnerWithdrawalFormValues } from './components/OwnerWithdrawalDialog';
import { VehicleExpenseDialog, type VehicleExpenseFormValues } from './components/VehicleExpenseDialog';

import { FlotillaVehiculosTab } from './vehiculos/components/FlotillaVehiculosTab';
import { FlotillaConductoresTab } from './conductores/components/FlotillaConductoresTab';
import { FlotillaBalanceTab } from './balance/components/FlotillaBalanceTab';
import { FlotillaCajaTab } from './caja/components/FlotillaCajaTab';

function PageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const {
    vehicles,
    drivers,
    dailyCharges,
    payments,
    manualDebts,
    withdrawals,
    expenses,
    isLoading,
    handleShowTicket,
  } = useFlotillaData();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'balance');

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    router.push(`/flotilla?tab=${tab}`, { scroll: false });
  }, [router]);

  const handleSaveTransaction = async (data: GlobalTransactionFormValues) => {
    const driver = drivers.find(d => d.id === data.driverId);
    if (!driver) return toast({ title: "Error", description: "Conductor no encontrado.", variant: "destructive" });
    
    const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
    if (!vehicle) return toast({ title: "Error", description: "El conductor no tiene un vehículo asignado.", variant: "destructive" });

    try {
        await rentalService.addRentalPayment(driver, vehicle, data.amount, data.note, data.paymentDate, data.paymentMethod as PaymentMethod);
        toast({ title: "Pago Registrado" });
        setIsPaymentDialogOpen(false);
        setIsChargeDialogOpen(false);
    } catch(e) {
        toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleSaveWithdrawal = async (data: OwnerWithdrawalFormValues) => {
    const ownerName = "Socio";
    try {
        await rentalService.addOwnerWithdrawal({ ...data, ownerName });
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

  const handleAddDriver = () => {
    router.push('/personal?tab=usuarios');
  };

  const handleAddVehicle = () => {
    router.push('/vehiculos?tab=vehiculos');
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pageActions = (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setIsPaymentDialogOpen(true)} className="w-full sm:w-auto bg-white border-green-500 text-black font-bold hover:bg-green-50">
        <PlusCircle className="mr-2 h-4 w-4 text-green-600" />
        Registrar Abono
      </Button>
    </div>
  );

  const tabs = [
    { value: 'balance', label: 'Balance', content: <FlotillaBalanceTab drivers={drivers} vehicles={vehicles} dailyCharges={dailyCharges} payments={payments} manualDebts={manualDebts} /> },
    { value: 'caja', label: 'Caja', content: <FlotillaCajaTab payments={payments} withdrawals={withdrawals} expenses={expenses} drivers={drivers} vehicles={vehicles} allManualDebts={manualDebts} allDailyCharges={dailyCharges} onAddWithdrawal={() => setIsWithdrawalDialogOpen(true)} onAddExpense={() => setIsExpenseDialogOpen(true)} handleShowTicket={handleShowTicket} /> },
    { value: 'conductores', label: 'Conductores', content: <FlotillaConductoresTab drivers={drivers} onAddDriver={handleAddDriver} /> },
    { value: 'vehiculos', label: 'Vehículos', content: <FlotillaVehiculosTab vehicles={vehicles} onAddVehicle={handleAddVehicle}/> },
  ];

  return (
    <>
      <TabbedPageLayout
        title="Gestión de Flotilla"
        description="Administra los vehículos, conductores y finanzas de tu flotilla."
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={tabs}
        actions={pageActions}
      />
      
      <GlobalTransactionDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        drivers={drivers}
        onSave={handleSaveTransaction}
        transactionType="payment"
      />

      <OwnerWithdrawalDialog
        open={isWithdrawalDialogOpen}
        onOpenChange={setIsWithdrawalDialogOpen}
        vehicles={vehicles}
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

export default withSuspense(PageInner);
