// src/app/(app)/flotilla/layout.tsx
"use client";

import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { RentalPaymentTicket } from './caja/components/RentalPaymentTicket';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Share2, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import { getAuth, onAuthStateChanged } from "firebase/auth";

const FlotillaContext = React.createContext<{
    vehicles: Vehicle[];
    drivers: Driver[];
    dailyCharges: DailyRentalCharge[];
    payments: RentalPayment[];
    manualDebts: ManualDebtEntry[];
    withdrawals: OwnerWithdrawal[];
    expenses: VehicleExpense[];
    isLoading: boolean;
    handleShowTicket: (payment: RentalPayment) => void;
}>({
    vehicles: [],
    drivers: [],
    dailyCharges: [],
    payments: [],
    manualDebts: [],
    withdrawals: [],
    expenses: [],
    isLoading: true,
    handleShowTicket: () => {},
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
    const [selectedPayment, setSelectedPayment] = useState<RentalPayment | null>(null);
    const [isTicketOpen, setIsTicketOpen] = useState(false);
    const [selectedDriverBalance, setSelectedDriverBalance] = useState(0);

    const handleShowTicket = (payment: RentalPayment) => {
        const driver = drivers.find(d => d.id === payment.driverId);
        if (!driver) return;

        const driverPayments = payments.filter(p => p.driverId === driver.id);
        const driverDebts = manualDebts.filter(d => d.driverId === driver.id);
        const driverDailyCharges = dailyCharges.filter(c => c.driverId === driver.id);
        
        const totalPayments = driverPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalCharges = driverDailyCharges.reduce((sum, c) => sum + c.amount, 0);
        const totalManualDebts = driverDebts.reduce((sum, d) => sum + d.amount, 0);
        const balance = totalPayments - (totalCharges + totalManualDebts);

        setSelectedDriverBalance(balance);
        setSelectedPayment(payment);
        setIsTicketOpen(true);
    };

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

    const value = { vehicles, drivers, dailyCharges, payments, manualDebts, withdrawals, expenses, isLoading, handleShowTicket };

    return (
        <FlotillaContext.Provider value={value}>
            {children}
            {selectedPayment && (
                <PageTicket
                    isOpen={isTicketOpen}
                    onOpenChange={setIsTicketOpen}
                    payment={selectedPayment}
                    driverBalance={selectedDriverBalance}
                />
            )}
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
    const { vehicles, drivers, dailyCharges, payments, manualDebts, withdrawals, expenses, handleShowTicket } = useFlotillaData();
    const { toast } = useToast();
    const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'payment' | 'charge'>('payment');
    const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);

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
        { value: 'conductores', label: 'Conductores', content: <FlotillaConductoresTab drivers={drivers} /> },
        { value: 'vehiculos', label: 'Vehículos', content: <FlotillaVehiculosTab vehicles={vehicles.filter(v => v.isFleetVehicle)} /> },
        { value: 'caja', label: 'Caja', content: <FlotillaCajaTab payments={payments} withdrawals={withdrawals} expenses={expenses} drivers={drivers} vehicles={vehicles} allDailyCharges={dailyCharges} allManualDebts={manualDebts} onAddWithdrawal={() => setIsWithdrawalDialogOpen(true)} onAddExpense={() => setIsExpenseDialogOpen(true)} handleShowTicket={handleShowTicket} /> },
    ];
    
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
        </>
    )
}

function PageTicket({ isOpen, onOpenChange, payment, driverBalance }: { isOpen: boolean, onOpenChange: (open: boolean) => void, payment: RentalPayment, driverBalance: number }) {
    const { toast } = useToast();
    const ticketContentRef = useRef<HTMLDivElement>(null);
    const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
    const [cashierName, setCashierName] = useState<string | null>(null);
    const { drivers, vehicles } = useFlotillaData();

    useEffect(() => {
        const auth = getAuth();
        onAuthStateChanged(auth, (user) => user && setCashierName(user.displayName));

        const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
        if (storedWorkshopInfo) {
            try {
                setWorkshopInfo(JSON.parse(storedWorkshopInfo));
            } catch (e) {
                console.error("Failed to parse workshop info from localStorage", e);
            }
        }
    }, []);

    const handleCopyTicketAsImage = useCallback(async (isForSharing: boolean = false) => {
        if (!ticketContentRef.current) return null;
        try {
            const canvas = await html2canvas(ticketContentRef.current, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error("Could not create blob from canvas.");

            if (isForSharing) {
                return new File([blob], `ticket_pago_${payment.id}.png`, { type: 'image/png' });
            } else {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                toast({ title: "Copiado", description: "La imagen del ticket ha sido copiada." });
                return null;
            }
        } catch (e) {
            toast({ title: "Error", description: "No se pudo procesar la imagen del ticket.", variant: "destructive" });
            return null;
        }
    }, [payment, toast]);

    const handleShareTicket = async () => {
        const imageFile = await handleCopyTicketAsImage(true);
        if (imageFile && navigator.share) {
            try {
                await navigator.share({ files: [imageFile], title: 'Ticket de Pago', text: `Recibo de pago de ${payment?.driverName}.` });
            } catch (error) {
                if (!String(error).includes('AbortError')) {
                   toast({ title: 'No se pudo compartir', description: 'Ocurrió un error al intentar compartir.', variant: 'default' });
                }
            }
        } else if (imageFile) {
             const imageUrl = URL.createObjectURL(imageFile);
             window.open(imageUrl, '_blank');
        }
    };

    const handlePrintTicket = () => {
        if (ticketContentRef.current) {
            const printContents = ticketContentRef.current.innerHTML;
            const originalContents = document.body.innerHTML;
            document.body.innerHTML = printContents;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload();
        }
    };
    
    return (
        <UnifiedPreviewDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={`Ticket de Pago`}
            footerContent={
                <div className="flex w-full justify-end gap-2">
                    <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12" onClick={() => handleCopyTicketAsImage(false)}><Copy className="h-6 w-6" /></Button></TooltipTrigger><TooltipContent><p>Copiar Imagen</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12" onClick={handleShareTicket}><Share2 className="h-6 w-6" /></Button></TooltipTrigger><TooltipContent><p>Compartir</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12" onClick={handlePrintTicket}><Printer className="h-6 w-6" /></Button></TooltipTrigger><TooltipContent><p>Imprimir</p></TooltipContent></Tooltip>
                    </TooltipProvider>
                </div>
            }
        >
            <RentalPaymentTicket
                ref={ticketContentRef}
                payment={payment}
                driver={drivers.find(d => d.id === payment.driverId)}
                vehicle={vehicles.find(v => v.id === drivers.find(d => d.id === payment.driverId)?.assignedVehicleId)}
                driverBalance={driverBalance}
                previewWorkshopInfo={workshopInfo || undefined}
            />
        </UnifiedPreviewDialog>
    );
}

export default FlotillaLayoutWrapper;
