
"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams } from "next/navigation";
import React, { useState, useEffect, Suspense, useRef, useCallback, PropsWithChildren } from 'react';
import { inventoryService, personnelService, rentalService } from '@/lib/services';
import type { Vehicle, Driver, DailyRentalCharge, RentalPayment, ManualDebtEntry, OwnerWithdrawal, VehicleExpense, PaymentMethod } from '@/types';
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

// 1. Exportar el contexto para que el hook pueda usarlo
export const FlotillaContext = React.createContext<{
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

function FlotillaLayout({ children }: PropsWithChildren) {
    const { toast } = useToast();
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
        setIsLoading(true);
    
        const unsubs = [
            inventoryService.onVehiclesUpdate(setVehicles),
            personnelService.onDriversUpdate(setDrivers),
            rentalService.onDailyChargesUpdate(setDailyCharges),
            rentalService.onRentalPaymentsUpdate(setPayments),
            personnelService.onManualDebtsUpdate(setManualDebts),
            rentalService.onOwnerWithdrawalsUpdate(setWithdrawals),
            rentalService.onVehicleExpensesUpdate((data) => {
                setExpenses(data);
                setIsLoading(false);
            }),
        ];

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

function PageTicket({ isOpen, onOpenChange, payment, driverBalance }: { isOpen: boolean, onOpenChange: (open: boolean) => void, payment: RentalPayment, driverBalance: number }) {
    const { toast } = useToast();
    const ticketContentRef = useRef<HTMLDivElement>(null);
    const [cashierName, setCashierName] = useState<string | null>(null);
    const { drivers, vehicles } = React.useContext(FlotillaContext);

    useEffect(() => {
        const auth = getAuth();
        onAuthStateChanged(auth, (user) => user && setCashierName(user.displayName));
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
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" onClick={() => handleCopyTicketAsImage(false)}><Copy className="h-6 w-6" /></Button></TooltipTrigger><TooltipContent><p>Copiar Imagen</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-green-100 text-green-700 border-green-200 hover:bg-green-200" onClick={handleShareTicket}><Share2 className="h-6 w-6" /></Button></TooltipTrigger><TooltipContent><p>Compartir</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-red-100 text-red-700 border-red-200 hover:bg-red-200" onClick={handlePrintTicket}><Printer className="h-6 w-6" /></Button></TooltipTrigger><TooltipContent><p>Imprimir</p></TooltipContent></Tooltip>
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
            />
        </UnifiedPreviewDialog>
    );
}
function FlotillaClientLayoutInner({ children }: { children: React.ReactNode }) {
  const sp = useSearchParams();
  return (
        <FlotillaLayout>
            {children}
        </FlotillaLayout>
    );
}

const FlotillaClientLayout = withSuspense(FlotillaClientLayoutInner, null);
export default FlotillaClientLayout;
