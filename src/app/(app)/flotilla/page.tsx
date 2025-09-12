// src/app/(app)/flotilla/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inventoryService, personnelService, rentalService } from '@/lib/services';
import type { Vehicle, Driver, DailyRentalCharge, RentalPayment, ManualDebtEntry, OwnerWithdrawal, VehicleExpense } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

import { FlotillaVehiculosTab } from './vehiculos/components/FlotillaVehiculosTab';
import { FlotillaConductoresTab } from './conductores/components/FlotillaConductoresTab';
import { FlotillaBalanceTab } from './balance/components/FlotillaBalanceTab';
import { FlotillaCajaTab } from './caja/components/FlotillaCajaTab';
import { FlotillaHeader } from './components/FlotillaHeader';

import { GlobalTransactionDialog, type GlobalTransactionFormValues } from './components/GlobalTransactionDialog';
import { OwnerWithdrawalDialog, type OwnerWithdrawalFormValues } from './components/OwnerWithdrawalDialog';
import { VehicleExpenseDialog, type VehicleExpenseFormValues } from './components/VehicleExpenseDialog';

export default function FlotillaPage() {
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
        await rentalService.addRentalPayment(driver, vehicle, values.amount, values.note, values.date);
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

  return (
    <>
      <PageHeader
        title="Gestión de Flotilla"
        description="Administra tus vehículos, conductores y finanzas de la flotilla."
      />
      
      <FlotillaHeader 
        onAddPayment={() => handleOpenTransactionDialog('payment')}
        onAddCharge={() => handleOpenTransactionDialog('charge')}
      />

      <Tabs defaultValue="balance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="balance">Balance General</TabsTrigger>
          <TabsTrigger value="conductores">Conductores</TabsTrigger>
          <TabsTrigger value="vehiculos">Vehículos</TabsTrigger>
          <TabsTrigger value="caja">Caja</TabsTrigger>
        </TabsList>
        <TabsContent value="balance" className="mt-6">
          {isLoading ? <Skeleton className="h-96" /> : <FlotillaBalanceTab drivers={drivers} vehicles={vehicles} dailyCharges={dailyCharges} payments={payments} manualDebts={manualDebts} />}
        </TabsContent>
        <TabsContent value="conductores" className="mt-6">
          {isLoading ? <Skeleton className="h-96" /> : <FlotillaConductoresTab drivers={drivers} />}
        </TabsContent>
        <TabsContent value="vehiculos" className="mt-6">
          {isLoading ? <Skeleton className="h-96" /> : <FlotillaVehiculosTab vehicles={vehicles.filter(v => v.isFleetVehicle)} />}
        </TabsContent>
        <TabsContent value="caja" className="mt-6">
            {isLoading ? <Skeleton className="h-96" /> : 
              <FlotillaCajaTab 
                payments={payments} 
                withdrawals={withdrawals} 
                expenses={expenses}
                onAddWithdrawal={() => setIsWithdrawalDialogOpen(true)}
                onAddExpense={() => setIsExpenseDialogOpen(true)}
              />
            }
        </TabsContent>
      </Tabs>
      
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
