
"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React,
{ 
    useState, 
    Suspense 
} from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFlotillaData } from './useFlotillaData'; // <-- CORREGIDO
import type { Vehicle, Driver, PaymentMethod } from '@/types';
import { personnelService, rentalService, inventoryService } from '@/lib/services';
import { Loader2, MinusCircle, PlusCircle } from 'lucide-react';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { Button } from '@/components/ui/button';
import { GlobalTransactionDialog, type GlobalTransactionFormValues } from './components/GlobalTransactionDialog';
import { OwnerWithdrawalDialog, type OwnerWithdrawalFormValues } from './components/OwnerWithdrawalDialog';
import { VehicleExpenseDialog, type VehicleExpenseFormValues } from './components/VehicleExpenseDialog';
import { EditContactInfoDialog, type ContactInfoFormValues } from './components/EditContactInfoDialog';
import { VehicleSelectionDialog } from '@/app/(app)/servicios/components/VehicleSelectionDialog';
import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import type { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';

// Importar los componentes de las pestañas de forma dinámica (lazy loading)
const FlotillaBalanceTab = React.lazy(() => import('./balance/components/FlotillaBalanceTab').then(m => ({ default: m.FlotillaBalanceTab })));
const FlotillaConductoresTab = React.lazy(() => import('./conductores/components/FlotillaConductoresTab').then(m => ({ default: m.FlotillaConductoresTab })));
const FlotillaVehiculosTab = React.lazy(() => import('./vehiculos/components/FlotillaVehiculosTab').then(m => ({ default: m.FlotillaVehiculosTab })));
const FlotillaCajaTab = React.lazy(() => import('./caja/components/FlotillaCajaTab').then(m => ({ default: m.FlotillaCajaTab })));


// 1) Componente interno con los hooks:
function PageInner() {
  const router = useRouter();
  const pathname = typeof usePathname === "function" ? usePathname() : "/";
  const sp = useSearchParams();
  const { toast } = useToast();
    
    // El hook useFlotillaData ahora viene del contexto centralizado
    const { vehicles, drivers, dailyCharges, payments, manualDebts, withdrawals, expenses, handleShowTicket, isLoading } = useFlotillaData();

    const [activeTab, setActiveTab] = useState(() => sp.get('tab') || 'balance');
    const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'payment' | 'charge'>('payment');
    const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
    const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
    const [isVehicleSelectionDialogOpen, setIsVehicleSelectionDialogOpen] = useState(false);
    const [isVehicleFormDialogOpen, setIsVehicleFormDialogOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        router.push(`/flotilla?tab=${tab}`);
    };

    // --- Lógica de Handlers (guardar, abrir diálogos, etc.) ---
    
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
                if (newPayment) handleShowTicket(newPayment);
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
  
    const handleVehicleSelect = async (vehicleId: string) => {
        try {
            await inventoryService.saveVehicle({ isFleetVehicle: true }, vehicleId);
            toast({ title: 'Vehículo Añadido a la Flotilla' });
            setIsVehicleSelectionDialogOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar el vehículo.", variant: "destructive"});
        }
    };

    const handleNewVehicleRequest = (plate?: string) => {
        setEditingVehicle(plate ? { licensePlate: plate, isFleetVehicle: true } : { isFleetVehicle: true });
        setIsVehicleSelectionDialogOpen(false);
        setIsVehicleFormDialogOpen(true);
    };
    
    const handleSaveVehicle = async (data: VehicleFormValues) => {
        try {
            await inventoryService.saveVehicle({ ...data, isFleetVehicle: true }, editingVehicle?.id);
            toast({ title: `Vehículo ${editingVehicle?.id ? 'Actualizado' : 'Creado'}` });
            setIsVehicleFormDialogOpen(false);
            setEditingVehicle(null);
        } catch (error) {
            toast({ title: "Error", description: "No se pudo guardar el vehículo.", variant: "destructive"});
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    // --- Renderizado ---

    const pageActions = (
        <div className="flex flex-row gap-2">
            <Button onClick={() => handleOpenTransactionDialog('charge')} variant="outline" className="flex-1 sm:flex-initial sm:w-auto bg-white border-red-500 text-black font-bold hover:bg-red-50">
                <MinusCircle className="mr-2 h-4 w-4 text-red-500" /> Generar Cargo
            </Button>
            <Button onClick={() => handleOpenTransactionDialog('payment')} variant="outline" className="flex-1 sm:flex-initial sm:w-auto bg-white border-green-500 text-black font-bold hover:bg-green-50">
                <PlusCircle className="mr-2 h-4 w-4 text-green-700" /> Registrar Pago
            </Button>
        </div>
    );
    
    const tabs = [
        { value: 'balance', label: 'Balance', content: <FlotillaBalanceTab drivers={drivers} vehicles={vehicles} dailyCharges={dailyCharges} payments={payments} manualDebts={manualDebts} /> },
        { value: 'conductores', label: 'Conductores', content: <FlotillaConductoresTab drivers={drivers} onAddDriver={() => setIsDriverDialogOpen(true)} /> },
        { value: 'vehiculos', label: 'Vehículos', content: <FlotillaVehiculosTab vehicles={vehicles} onAddVehicle={() => setIsVehicleSelectionDialogOpen(true)} /> },
        { value: 'caja', label: 'Caja', content: <FlotillaCajaTab payments={payments} withdrawals={withdrawals} expenses={expenses} drivers={drivers} vehicles={vehicles} allDailyCharges={dailyCharges} allManualDebts={manualDebts} handleShowTicket={handleShowTicket} onAddWithdrawal={() => setIsWithdrawalDialogOpen(true)} onAddExpense={() => setIsExpenseDialogOpen(true)} /> },
    ];
    
    return (
        <>
            <TabbedPageLayout
                title="Gestión de Flotilla"
                description="Administra vehículos, conductores y finanzas de la flotilla."
                activeTab={activeTab}
                onTabChange={handleTabChange}
                tabs={tabs}
                actions={pageActions}
            >
                <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    {activeTab === 'balance' && <FlotillaBalanceTab drivers={drivers} vehicles={vehicles} dailyCharges={dailyCharges} payments={payments} manualDebts={manualDebts} />}
                    {activeTab === 'conductores' && <FlotillaConductoresTab drivers={drivers} onAddDriver={() => setIsDriverDialogOpen(true)} />}
                    {activeTab === 'vehiculos' && <FlotillaVehiculosTab vehicles={vehicles} onAddVehicle={() => setIsVehicleSelectionDialogOpen(true)} />}
                    {activeTab === 'caja' && <FlotillaCajaTab payments={payments} withdrawals={withdrawals} expenses={expenses} drivers={drivers} vehicles={vehicles} allDailyCharges={dailyCharges} allManualDebts={manualDebts} handleShowTicket={handleShowTicket} onAddWithdrawal={() => setIsWithdrawalDialogOpen(true)} onAddExpense={() => setIsExpenseDialogOpen(true)} />}
                </Suspense>
            </TabbedPageLayout>
            
            {/* --- Dialogos --- */}
            <GlobalTransactionDialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen} onSave={handleSaveTransaction} transactionType={transactionType} drivers={drivers.filter(d => !d.isArchived)} />
            <OwnerWithdrawalDialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen} vehicles={vehicles} onSave={handleSaveWithdrawal} />
            <VehicleExpenseDialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen} vehicles={vehicles} onSave={handleSaveExpense} />
            <EditContactInfoDialog open={isDriverDialogOpen} onOpenChange={setIsDriverDialogOpen} driver={{} as Driver} onSave={handleSaveDriver} />
            <VehicleSelectionDialog open={isVehicleSelectionDialogOpen} onOpenChange={setIsVehicleSelectionDialogOpen} vehicles={vehicles} onSelectVehicle={handleVehicleSelect} onNewVehicle={handleNewVehicleRequest} />
            <VehicleDialog open={isVehicleFormDialogOpen} onOpenChange={setIsVehicleFormDialogOpen} vehicle={editingVehicle} onSave={handleSaveVehicle} />
        </>
    )
}

// 2) Exporta la página envuelta en Suspense:
export default withSuspense(PageInner, null);
