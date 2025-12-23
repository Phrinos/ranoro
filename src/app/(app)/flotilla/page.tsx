
// src/app/(app)/flotilla/page.tsx
"use client";

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { Button } from '@/components/ui/button';
import { withSuspense } from '@/lib/withSuspense';

import type { Vehicle, Driver, PaymentMethod, InventoryItem } from '@/types';
import { personnelService, rentalService, inventoryService } from '@/lib/services';
import { useFlotillaData } from './useFlotillaData';

import { GlobalTransactionDialog, type GlobalTransactionFormValues } from './components/GlobalTransactionDialog';
import { OwnerWithdrawalDialog, type OwnerWithdrawalFormValues } from './components/OwnerWithdrawalDialog';
import { VehicleExpenseDialog, type VehicleExpenseFormValues } from './components/VehicleExpenseDialog';
import { DriverDialog } from './conductores/components/DriverDialog';
import type { DriverFormValues } from '@/schemas/driver-form-schema';
import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import { VehicleSelectionDialog } from '@/app/(app)/servicios/components/VehicleSelectionDialog';

const FlotillaVehiculosTab = lazy(() => import('./vehiculos/components/FlotillaVehiculosTab').then(m => ({ default: m.FlotillaVehiculosTab })));
const FlotillaConductoresTab = lazy(() => import('./conductores/components/FlotillaConductoresTab').then(m => ({ default: m.FlotillaConductoresTab })));
const FlotillaBalanceTab = lazy(() => import('./balance/components/FlotillaBalanceTab').then(m => ({ default: m.FlotillaBalanceTab })));
const FlotillaCajaTab = lazy(() => import('./caja/components/FlotillaCajaTab').then(m => ({ default: m.FlotillaCajaTab })));


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
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  
  const [isAddVehicleDialogOpen, setIsAddVehicleDialogOpen] = useState(false);
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false);

  const vehicleOwners = React.useMemo(() => {
    const ownerSet = new Set<string>();
    vehicles.forEach(v => {
      if (v.ownerName) ownerSet.add(v.ownerName);
    });
    return Array.from(ownerSet).sort();
  }, [vehicles]);


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
        await rentalService.addRentalPayment(driver, vehicle, data.amount, data.note, data.date, data.paymentMethod as PaymentMethod);
        toast({ title: "Pago Registrado" });
        setIsPaymentDialogOpen(false);
    } catch(e) {
        toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
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

  const handleAddDriver = () => {
    setEditingDriver(null);
    setIsDriverDialogOpen(true);
  };
  
  const handleSaveDriver = async (data: DriverFormValues) => {
    await personnelService.saveDriver(data, editingDriver?.id);
    toast({ title: `Conductor ${editingDriver ? 'actualizado' : 'creado'}.`});
    setIsDriverDialogOpen(false);
  }

  const handleAddVehicleToFleet = async (vehicleId: string) => {
    try {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (!vehicle) throw new Error('Vehicle not found');
      await inventoryService.saveVehicle({ isFleetVehicle: true }, vehicle.id);
      toast({ title: 'Vehículo Añadido', description: `${vehicle.make} ${vehicle.model} ahora es parte de la flotilla.` });
      setIsAddVehicleDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo añadir el vehículo a la flotilla.', variant: 'destructive'});
    }
  };

  const handleCreateAndAddVehicle = () => {
      setIsAddVehicleDialogOpen(false);
      setIsNewVehicleDialogOpen(true);
  };

  const handleSaveNewVehicle = async (data: any) => {
      try {
          const newVehicleData = { ...data, isFleetVehicle: true };
          await inventoryService.saveVehicle(newVehicleData);
          toast({ title: 'Vehículo Creado y Añadido', description: 'El nuevo vehículo se ha añadido a la flotilla.' });
          setIsNewVehicleDialogOpen(false);
      } catch (error) {
          toast({ title: 'Error', description: 'No se pudo crear el vehículo.', variant: 'destructive'});
      }
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
    { value: 'balance', label: 'Balance', content: <Suspense fallback={<Loader2 className="animate-spin m-auto"/>}><FlotillaBalanceTab drivers={drivers} vehicles={vehicles} dailyCharges={dailyCharges} payments={payments} manualDebts={manualDebts} /></Suspense> },
    { value: 'caja', label: 'Caja', content: <Suspense fallback={<Loader2 className="animate-spin m-auto"/>}><FlotillaCajaTab payments={payments} withdrawals={withdrawals} expenses={expenses} drivers={drivers} vehicles={vehicles} allManualDebts={manualDebts} allDailyCharges={dailyCharges} onAddWithdrawal={() => setIsWithdrawalDialogOpen(true)} onAddExpense={() => setIsExpenseDialogOpen(true)} handleShowTicket={handleShowTicket} /></Suspense> },
    { value: 'conductores', label: 'Conductores', content: <Suspense fallback={<Loader2 className="animate-spin m-auto"/>}><FlotillaConductoresTab drivers={drivers} onAddDriver={handleAddDriver} /></Suspense> },
    { value: 'vehiculos', label: 'Vehículos', content: <Suspense fallback={<Loader2 className="animate-spin m-auto"/>}><FlotillaVehiculosTab vehicles={vehicles} onAddVehicle={() => setIsAddVehicleDialogOpen(true)} /></Suspense> },
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
        owners={vehicleOwners}
        onSave={handleSaveWithdrawal}
      />

      <VehicleExpenseDialog
        open={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        vehicles={vehicles}
        onSave={handleSaveExpense}
      />

      <DriverDialog
        open={isDriverDialogOpen}
        onOpenChange={setIsDriverDialogOpen}
        onSave={handleSaveDriver}
        driver={editingDriver}
      />
      
      <VehicleSelectionDialog
        open={isAddVehicleDialogOpen}
        onOpenChange={setIsAddVehicleDialogOpen}
        vehicles={vehicles.filter(v => !v.isFleetVehicle)}
        onSelectVehicle={handleAddVehicleToFleet}
        onNewVehicle={handleCreateAndAddVehicle}
      />

      <VehicleDialog 
        open={isNewVehicleDialogOpen}
        onOpenChange={setIsNewVehicleDialogOpen}
        onSave={handleSaveNewVehicle}
      />
    </>
  );
}

export default withSuspense(PageInner);
