// src/app/(app)/flotilla/page.tsx
"use client";

import React, { useState, useCallback, Suspense, lazy, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, PlusCircle, CalendarPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { Button } from '@/components/ui/button';
import { withSuspense } from '@/lib/withSuspense';

import type { Driver, PaymentMethod, User } from '@/types';
import { personnelService, rentalService, inventoryService } from '@/lib/services';
import { useFlotillaData } from './useFlotillaData';

import { GlobalTransactionDialog, type GlobalTransactionFormValues } from './components/GlobalTransactionDialog';
import { OwnerWithdrawalDialog, type OwnerWithdrawalFormValues } from './components/OwnerWithdrawalDialog';
import { VehicleExpenseDialog, type VehicleExpenseFormValues } from './components/VehicleExpenseDialog';
import { DriverDialog } from './conductores/components/DriverDialog';
import type { DriverFormValues } from '@/schemas/driver-form-schema';
import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import { VehicleSelectionDialog } from '@/app/(app)/servicios/components/VehicleSelectionDialog';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';

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
  const [isBackfilling, setIsBackfilling] = useState(false);
  
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  
  const [isAddVehicleDialogOpen, setIsAddVehicleDialogOpen] = useState(false);
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (authUserString) {
      try {
        setCurrentUser(JSON.parse(authUserString));
      } catch (e) {
        console.error("Error parsing user for flotilla page", e);
      }
    }
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

  const handleBackfillCharges = async () => {
    if (!currentUser) {
        toast({ title: "Error", description: "Sesión no iniciada.", variant: "destructive" });
        return;
    }
    setIsBackfilling(true);
    try {
        // Generar para el 3 de febrero de 2025
        const targetDate = new Date(2025, 1, 3, 12, 0, 0); 
        const count = await rentalService.generateManualDailyCharges(targetDate, currentUser);
        toast({ 
            title: count > 0 ? "Cargos generados" : "Sin cambios", 
            description: count > 0 
                ? `Se han creado ${count} cargos pendientes para el 3 de febrero.` 
                : "No se encontraron cargos nuevos para generar (posiblemente ya están registrados)." 
        });
    } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
        setIsBackfilling(false);
    }
  };

  const handleAddDriver = () => {
    setEditingDriver(null);
    setIsDriverDialogOpen(true);
  };
  
  const handleSaveDriver = async (data: DriverFormValues) => {
    const payload: Partial<Driver> = {
      ...data,
      contractDate: data.contractDate ? data.contractDate.toISOString() : undefined,
    };
    await personnelService.saveDriver(payload, editingDriver?.id);
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
    <div className="flex flex-wrap gap-2">
      <Button 
        variant="outline" 
        onClick={handleBackfillCharges} 
        disabled={isBackfilling}
        className="w-full sm:w-auto bg-white border-orange-500 text-black font-bold hover:bg-orange-50"
      >
        {isBackfilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4 text-orange-600" />}
        Cargar 3 Feb
      </Button>
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
        onSave={async (data) => { await handleSaveTransaction(data); }}
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
