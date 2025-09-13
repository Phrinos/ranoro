// src/app/(app)/flotilla/layout.tsx
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { inventoryService, personnelService, rentalService } from '@/lib/services';
import type { Vehicle, Driver, DailyRentalCharge, RentalPayment, ManualDebtEntry, OwnerWithdrawal, VehicleExpense } from '@/types';
import { Loader2 } from 'lucide-react';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { FlotillaVehiculosTab } from './vehiculos/components/FlotillaVehiculosTab';
import { FlotillaConductoresTab } from './conductores/components/FlotillaConductoresTab';
import { FlotillaBalanceTab } from './balance/components/FlotillaBalanceTab';
import { FlotillaCajaTab } from './caja/components/FlotillaCajaTab';

// Context to provide flotilla data to child components
const FlotillaContext = React.createContext<{
    vehicles: Vehicle[];
    drivers: Driver[];
    dailyCharges: DailyRentalCharge[];
    payments: RentalPayment[];
    manualDebts: ManualDebtEntry[];
    withdrawals: OwnerWithdrawal[];
    expenses: VehicleExpense[];
    isLoading: boolean;
}>({
    vehicles: [],
    drivers: [],
    dailyCharges: [],
    payments: [],
    manualDebts: [],
    withdrawals: [],
    expenses: [],
    isLoading: true,
});

export const useFlotillaData = () => React.useContext(FlotillaContext);

function FlotillaLayout({ children }: { children: React.ReactNode }) {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [dailyCharges, setDailyCharges] = useState<DailyRentalCharge[]>([]);
    const [payments, setPayments] = useState<RentalPayment[]>([]);
    const [manualDebts, setManualDebts] = useState<ManualDebtEntry[]>([]);
    const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
    const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    const value = { vehicles, drivers, dailyCharges, payments, manualDebts, withdrawals, expenses, isLoading };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <FlotillaContext.Provider value={value}>
            {children}
        </FlotillaContext.Provider>
    );
}

function FlotillaLayoutWrapper() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
        <FlotillaLayout>
          <PageContent />
        </FlotillaLayout>
    </Suspense>
  );
}

function PageContent() {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');
    const defaultTab = tab || 'balance';
    const [activeTab, setActiveTab] = useState(defaultTab);
    const { vehicles, drivers, dailyCharges, payments, manualDebts, withdrawals, expenses } = useFlotillaData();
    const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);

    const tabs = [
        { value: 'balance', label: 'Balance', content: <FlotillaBalanceTab drivers={drivers} vehicles={vehicles} dailyCharges={dailyCharges} payments={payments} manualDebts={manualDebts} /> },
        { value: 'conductores', label: 'Conductores', content: <FlotillaConductoresTab drivers={drivers} /> },
        { value: 'vehiculos', label: 'Vehículos', content: <FlotillaVehiculosTab vehicles={vehicles.filter(v => v.isFleetVehicle)} /> },
        { value: 'caja', label: 'Caja', content: <FlotillaCajaTab payments={payments} withdrawals={withdrawals} expenses={expenses} drivers={drivers} vehicles={vehicles} allDailyCharges={dailyCharges} allManualDebts={manualDebts} onAddWithdrawal={() => setIsWithdrawalDialogOpen(true)} onAddExpense={() => setIsExpenseDialogOpen(true)} /> },
    ];
    
    return (
         <TabbedPageLayout
            title="Gestión de Flotilla"
            description="Administra vehículos, conductores y finanzas de la flotilla."
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={tabs}
        />
    )
}

export default FlotillaLayoutWrapper;
