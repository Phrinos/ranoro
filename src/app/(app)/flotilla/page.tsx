// src/app/(app)/flotilla/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { inventoryService, personnelService, rentalService } from '@/lib/services';
import type { Vehicle, Driver, DailyRentalCharge, RentalPayment, ManualDebtEntry, OwnerWithdrawal, VehicleExpense, PaymentMethod, WorkshopInfo } from '@/types';
import { Loader2, MinusCircle, PlusCircle } from 'lucide-react';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { FlotillaVehiculosTab } from './vehiculos/components/FlotillaVehiculosTab';
import { FlotillaConductoresTab } from './conductores/components/FlotillaConductoresTab';
import { FlotillaBalanceTab } from './balance/components/FlotillaBalanceTab';
import { FlotillaCajaTab } from './caja/components/FlotillaCajaTab';
import { Button } from '@/components/ui/button';
import { GlobalTransactionDialog, type GlobalTransactionFormValues } from './components/GlobalTransactionDialog';
import { OwnerWithdrawalDialog, type OwnerWithdrawalFormValues } from './components/OwnerWithdrawalDialog';
import { VehicleExpenseDialog, type VehicleExpenseFormValues } from './components/VehicleExpenseDialog';
import { useToast } from '@/hooks/use-toast';
import { useFlotillaData } from './layout';
import { EditContactInfoDialog, type ContactInfoFormValues } from './components/EditContactInfoDialog';


function FlotillaPageComponent() {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');
    const defaultTab = tab || 'balance';
    const [activeTab, setActiveTab] = useState(defaultTab);
    const { vehicles, drivers, dailyCharges, payments, manualDebts, withdrawals, expenses, handleShowTicket, isLoading } = useFlotillaData();
    const { toast } = useToast();
    const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'payment' | 'charge'>('payment');
    const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
    const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);


    const handleOpenTransactionDialog = (type: 'payment' | 'charge') => {
        setTransactionType(type);
        setIsTransactionDialogOpen(true);
    };
    
    const handleSaveDriver = async (values: ContactInfoFormValues) => {
        try {
            await personnelService.saveDriver({ ...values, isArchived: false });
            toast({ title: "Conductor Creado" });
            setIsDriverDialogOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "No se pudo crear el conductor.", variant: "destructive"});
        }
    };


    const handleSaveTransaction = async (values: GlobalTransactionFormValues) => {
        try {
            const driver = drivers.find(d => d.id === values.driverId);
            if (!driver) throw new Error("Driver not found.");

            if (transactionType === 'payment') {
                const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
                if (!vehicle) throw new Error("Vehicle not found for payment.");
                const newPayment = await rentalService.addRentalPayment(driver, vehicle, values.amount, values.note, values.date, values.paymentMethod as PaymentMethod);
                toast({ title: "Pago Registrado" });
                if (newPayment) {
                    handleShowTicket(newPayment);
                }
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
        { value: 'balance', label: 'Balance', content: <FlotillaBalanceTab drivers={drivers} vehicles={vehicles} dailyCharges={dailyCharges} payments={payments} manualDebts={manualDebts} /> },
        { value: 'conductores', label: 'Conductores', content: <FlotillaConductoresTab drivers={drivers} onAddDriver={() => setIsDriverDialogOpen(true)} /> },
        { value: 'vehiculos', label: 'Vehículos', content: <FlotillaVehiculosTab vehicles={vehicles.filter(v => v.isFleetVehicle)} /> },
        { value: 'caja', label: 'Caja', content: <FlotillaCajaTab payments={payments} withdrawals={withdrawals} expenses={expenses} drivers={drivers} vehicles={vehicles} allDailyCharges={dailyCharges} allManualDebts={manualDebts} onAddWithdrawal={() => setIsWithdrawalDialogOpen(true)} onAddExpense={() => setIsExpenseDialogOpen(true)} handleShowTicket={handleShowTicket} /> },
    ];
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    return (
        <>
            <TabbedPageLayout
                title="Gestión de Flotilla"
                description="Administra vehículos, conductores y finanzas de la flotilla."
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
            <EditContactInfoDialog
                open={isDriverDialogOpen}
                onOpenChange={setIsDriverDialogOpen}
                driver={{} as Driver}
                onSave={handleSaveDriver}
            />
        </>
    )
}


export default function FlotillaPage() {
    return <FlotillaPageComponent />;
}
