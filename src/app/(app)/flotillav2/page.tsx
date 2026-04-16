
"use client";

import React, { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { withSuspense } from "@/lib/withSuspense";
import { Loader2, Users, Car, TrendingUp, HandCoins, PlusCircle, TrendingDown, ChevronDown } from 'lucide-react';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { inventoryService, personnelService, rentalService } from '@/lib/services';
import type { Driver, Vehicle, DailyRentalCharge, RentalPayment, ManualDebtEntry, OwnerWithdrawal, VehicleExpense, PaymentMethod } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalTransactionDialog, type GlobalTransactionFormValues } from './components/GlobalTransactionDialog';
import { VehicleExpenseDialog } from './components/VehicleExpenseDialog';
import { OwnerWithdrawalDialog } from './components/OwnerWithdrawalDialog';
import { usePermissions } from '@/hooks/usePermissions';

const BalanceTab = lazy(() => import('./components/BalanceTab'));
const ConductoresTab = lazy(() => import('./components/ConductoresTab'));
const VehiculosTab = lazy(() => import('./components/VehiculosTab'));

type QuickAction = 'abono' | 'cargo' | 'salida' | null;

function FlotillaV2Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'balance');
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const permissions = usePermissions();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dailyCharges, setDailyCharges] = useState<DailyRentalCharge[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [manualDebts, setManualDebts] = useState<ManualDebtEntry[]>([]);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Handle ?action= URL param from sidebar nav
  useEffect(() => {
    const action = searchParams.get('action') as QuickAction;
    if (action) {
      setQuickAction(action);
      // Clean up the URL without re-navigating
      router.replace(`/flotillav2?tab=${activeTab}`, { scroll: false });
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIsLoading(true);
    let loaded = 0;
    const checkLoaded = () => { loaded++; if (loaded >= 7) setIsLoading(false); };
    const unsubs = [
      inventoryService.onVehiclesUpdate((d) => { setVehicles(d); checkLoaded(); }),
      personnelService.onDriversUpdate((d) => { setDrivers(d); checkLoaded(); }),
      rentalService.onDailyChargesUpdate((d) => { setDailyCharges(d); checkLoaded(); }),
      rentalService.onRentalPaymentsUpdate((d) => { setPayments(d); checkLoaded(); }),
      personnelService.onManualDebtsUpdate((d) => { setManualDebts(d); checkLoaded(); }),
      rentalService.onOwnerWithdrawalsUpdate((d) => { setWithdrawals(d); checkLoaded(); }),
      rentalService.onVehicleExpensesUpdate((d) => { setExpenses(d); checkLoaded(); }),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/flotillav2?tab=${tab}`, { scroll: false });
  };

  // Quick action handlers
  const handleAbonoSave = async (data: GlobalTransactionFormValues) => {
    const driver = drivers.find(d => d.id === data.driverId);
    if (!driver) { toast({ title: 'Conductor no encontrado', variant: 'destructive' }); return; }
    const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
    if (!vehicle) { toast({ title: 'Sin vehículo asignado', variant: 'destructive' }); return; }
    await rentalService.addRentalPayment(driver, vehicle, data.amount, data.note, data.date, data.paymentMethod as PaymentMethod);
    toast({ title: '✅ Abono Registrado', description: `${formatCurrency(data.amount)} a nombre de ${driver.name}.` });
    setQuickAction(null);
  };

  const handleCargoSave = async (data: GlobalTransactionFormValues) => {
    if (!data.driverId) { toast({ title: 'Selecciona un conductor', variant: 'destructive' }); return; }
    await personnelService.saveManualDebt(data.driverId, { date: data.date instanceof Date ? data.date.toISOString() : data.date, amount: data.amount, note: data.note || 'Cargo manual' });
    toast({ title: '✅ Cargo Registrado' });
    setQuickAction(null);
  };

  const handleSalidaSave = async (data: any) => {
    const fleetVehiclesList = vehicles.filter(v => v.isFleetVehicle);
    if (data.type === 'expense') {
      await rentalService.addVehicleExpense(data);
    } else {
      await rentalService.addOwnerWithdrawal(data);
    }
    toast({ title: '✅ Salida Registrada' });
    setQuickAction(null);
  };

  const fleetVehiclesList = useMemo(() => vehicles.filter(v => v.isFleetVehicle), [vehicles]);
  const ownersList = useMemo(() => [...new Set(fleetVehiclesList.map(v => v.ownerName).filter(Boolean) as string[])], [fleetVehiclesList]);

  const tabs = [
    {
      value: 'balance',
      label: 'Balance',
      content: (
        <BalanceTab
          drivers={drivers} vehicles={vehicles}
          dailyCharges={dailyCharges} payments={payments} manualDebts={manualDebts}
          expenses={expenses} withdrawals={withdrawals}
        />
      ),
    },
    { value: 'conductores', label: 'Conductores', content: <ConductoresTab drivers={drivers} vehicles={vehicles} /> },
    { value: 'vehiculos', label: 'Vehículos', content: <VehiculosTab vehicles={vehicles} drivers={drivers} /> },
  ];

  const activeDriversCount = useMemo(() => drivers.filter(d => !d.isArchived).length, [drivers]);
  const fleetVehiclesCount = useMemo(() => fleetVehiclesList.length, [fleetVehiclesList]);
  const monthIncome = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return payments.filter(p => { const d = new Date(p.paymentDate || p.date); return d >= start; }).reduce((s, p) => s + p.amount, 0);
  }, [payments]);

  const statsRow = (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full border border-border">
        <Users className="h-3 w-3" />{activeDriversCount} conductores
      </span>
      <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full border border-border">
        <Car className="h-3 w-3" />{fleetVehiclesCount} unidades
      </span>
      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
        <TrendingUp className="h-3 w-3" />{formatCurrency(monthIncome)} este mes
      </span>
    </div>
  );

  // Quick-action dropdown in header
  const headerActions = permissions.has('fleet:manage_rentals') ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow-sm gap-2 border border-zinc-700">
          Acciones Rápidas
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setQuickAction('abono')}>
          <HandCoins className="h-4 w-4 text-emerald-600" />
          <div>
            <p className="font-semibold text-sm">Registrar Abono</p>
            <p className="text-xs text-muted-foreground">Pago de conductor</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setQuickAction('cargo')}>
          <PlusCircle className="h-4 w-4 text-amber-600" />
          <div>
            <p className="font-semibold text-sm">Registrar Cargo</p>
            <p className="text-xs text-muted-foreground">Adeudo manual a conductor</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setQuickAction('salida')}>
          <TrendingDown className="h-4 w-4 text-red-600" />
          <div>
            <p className="font-semibold text-sm">Registrar Salida</p>
            <p className="text-xs text-muted-foreground">Gasto de vehículo o retiro</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  return (
    <>
      <TabbedPageLayout
        title="Flotilla"
        description={statsRow}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={tabs}
        actions={headerActions}
      />

      {/* Global quick-action dialogs */}
      <GlobalTransactionDialog
        open={quickAction === 'abono'}
        onOpenChange={(o) => { if (!o) setQuickAction(null); }}
        drivers={drivers.filter(d => !d.isArchived)}
        onSave={handleAbonoSave}
        transactionType="payment"
      />
      <GlobalTransactionDialog
        open={quickAction === 'cargo'}
        onOpenChange={(o) => { if (!o) setQuickAction(null); }}
        drivers={drivers.filter(d => !d.isArchived)}
        onSave={handleCargoSave}
        transactionType="charge"
      />
      <VehicleExpenseDialog
        open={quickAction === 'salida'}
        onOpenChange={(o) => { if (!o) setQuickAction(null); }}
        onSave={async (data) => { await rentalService.addVehicleExpense(data); toast({ title: '✅ Gasto de vehículo registrado' }); setQuickAction(null); }}
        vehicles={fleetVehiclesList}
      />
    </>
  );
}

export default withSuspense(FlotillaV2Page);
