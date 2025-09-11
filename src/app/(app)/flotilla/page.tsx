
// src/app/(app)/flotilla/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle, Wallet, ArrowDownCircle, Printer, ArrowUpCircle, Copy, Share2 } from "lucide-react";
import type { User, Vehicle, Driver, RentalPayment, WorkshopInfo, VehicleExpense, OwnerWithdrawal, PaymentMethod, CashDrawerTransaction } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { inventoryService, personnelService, fleetService, cashService } from '@/lib/services';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { formatCurrency } from "@/lib/utils";
import { startOfMonth, endOfMonth, parseISO, isValid, isWithinInterval } from 'date-fns';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { RentalReceiptContent } from '@/app/(app)/rentas/components/rental-receipt-content';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import html2canvas from 'html2canvas';

// Lazy load dialogs and tab content
const ConductoresTab = lazy(() => import('./components/conductores-tab').then(module => ({ default: module.ConductoresTab })));
const VehiculosFlotillaTab = lazy(() => import('./components/vehiculos-flotilla-tab').then(module => ({ default: module.VehiculosFlotillaTab })));
const MovimientosFlotillaTab = lazy(() => import('./components/MovimientosFlotillaTab').then(module => ({ default: module.MovimientosFlotillaTab })));
const EstadoCuentaTab = lazy(() => import('../rentas/components/EstadoCuentaTab').then(module => ({ default: module.EstadoCuentaTab })));
const ReportesTab = lazy(() => import('../rentas/components/ReportesTab').then(module => ({ default: module.ReportesTab })));
const RegisterPaymentDialog = lazy(() => import('../rentas/components/register-payment-dialog').then(module => ({ default: module.RegisterPaymentDialog })));
const VehicleExpenseDialog = lazy(() => import('../rentas/components/vehicle-expense-dialog').then(module => ({ default: module.VehicleExpenseDialog })));
const OwnerWithdrawalDialog = lazy(() => import('../rentas/components/owner-withdrawal-dialog').then(module => ({ default: module.OwnerWithdrawalDialog })));
const CashEntryDialog = lazy(() => import('./components/CashEntryDialog').then(module => ({ default: module.CashEntryDialog })));
const CashEntryReceiptContent = lazy(() => import('./components/CashEntryReceiptContent').then(module => ({ default: module.CashEntryReceiptContent })));


export default function FlotillaPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'estado_cuenta';

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [allPayments, setAllPayments] = useState<RentalPayment[]>([]);
  const [allExpenses, setAllExpenses] = useState<VehicleExpense[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [fleetCashEntries, setFleetCashEntries] = useState<CashDrawerTransaction[]>([]);
  const [workshopInfo, setWorkshopInfo] = useState<Partial<WorkshopInfo>>({});

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isCashEntryDialogOpen, setIsCashEntryDialogOpen] = useState(false);

  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [paymentForReceipt, setPaymentForReceipt] = useState<RentalPayment | null>(null);
  const [cashEntryForReceipt, setCashEntryForReceipt] = useState<CashDrawerTransaction | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const receiptContentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setIsLoading(true);
    const authUserString = localStorage.getItem('authUser');
    if (authUserString) setCurrentUser(JSON.parse(authUserString));

    const unsubs = [
        inventoryService.onVehiclesUpdate(setAllVehicles),
        personnelService.onDriversUpdate(setAllDrivers),
        fleetService.onRentalPaymentsUpdate(setAllPayments),
        fleetService.onVehicleExpensesUpdate(setAllExpenses),
        cashService.onFleetCashEntriesUpdate(setFleetCashEntries),
        fleetService.onOwnerWithdrawalsUpdate((data) => {
            setAllWithdrawals(data);
            setIsLoading(false);
        }),
    ];
    
    const storedInfo = localStorage.getItem('workshopTicketInfo');
    if (storedInfo) setWorkshopInfo(JSON.parse(storedInfo));
    
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleSavePayment = async (driverId: string, amount: number, paymentMethod: PaymentMethod, note: string | undefined, mileage?: number, paymentDate?: Date) => {
    try {
        await fleetService.addRentalPayment(driverId, amount, paymentMethod, note, mileage, paymentDate);
        toast({ title: 'Pago Registrado' });
        setIsPaymentDialogOpen(false);
    } catch (e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleSaveExpense = async (data: any) => {
    try {
        await fleetService.addVehicleExpense(data);
        toast({ title: 'Gasto Registrado'});
        setIsExpenseDialogOpen(false);
    } catch(e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };
  
  const handleSaveWithdrawal = async (data: any) => {
    try {
        await fleetService.addOwnerWithdrawal(data);
        toast({ title: 'Retiro Registrado'});
        setIsWithdrawalDialogOpen(false);
    } catch(e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };
  
  const handleSaveCashEntry = async (data: { amount: number; concept: string }) => {
    if (!currentUser) {
        toast({ title: 'Error', description: 'No se ha podido identificar al usuario.', variant: 'destructive' });
        return;
    }
    try {
        await cashService.addCashTransaction({
            type: 'Entrada',
            amount: data.amount,
            concept: data.concept,
            userId: currentUser.id,
            userName: currentUser.name,
            relatedType: 'Flotilla' // Custom type for fleet-related entries
        });
        toast({ title: 'Ingreso Registrado'});
        setIsCashEntryDialogOpen(false);
    } catch(e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };
  
  const handlePrintPayment = (payment: RentalPayment) => {
    setCashEntryForReceipt(null);
    setPaymentForReceipt(payment);
    setIsReceiptDialogOpen(true);
  };
  
  const handlePrintCashEntry = (entry: CashDrawerTransaction) => {
    setPaymentForReceipt(null);
    setCashEntryForReceipt(entry);
    setIsReceiptDialogOpen(true);
  };

  const handleDeleteMovement = async (movement: any) => {
    try {
        switch (movement.type) {
            case 'Pago de Renta':
                await fleetService.deleteRentalPayment(movement.id);
                break;
            case 'Gasto de Vehículo':
                await fleetService.deleteVehicleExpense(movement.id);
                break;
            case 'Retiro de Propietario':
                await fleetService.deleteOwnerWithdrawal(movement.id);
                break;
            case 'Entrada de Caja':
                await cashService.deleteCashTransaction(movement.id);
                break;
            default:
                throw new Error("Tipo de movimiento desconocido.");
        }
        toast({ title: "Movimiento Eliminado" });
    } catch (e: any) {
        toast({ title: "Error al Eliminar", description: e.message, variant: "destructive" });
    }
  };


  const totalCashBalance = useMemo(() => {
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };

    const totalIncomeFromPayments = allPayments
      .filter(p => isValid(parseISO(p.paymentDate)) && isWithinInterval(parseISO(p.paymentDate), interval))
      .reduce((sum, p) => sum + p.amount, 0);

    const totalManualCashEntries = fleetCashEntries
      .filter(entry => isValid(parseISO(entry.date)) && isWithinInterval(parseISO(entry.date), interval))
      .reduce((sum, entry) => sum + entry.amount, 0);
      
    const totalIncome = totalIncomeFromPayments + totalManualCashEntries;
      
    const totalWithdrawals = allWithdrawals
      .filter(w => isValid(parseISO(w.date)) && isWithinInterval(parseISO(w.date), interval))
      .reduce((sum, w) => sum + w.amount, 0);
      
    const totalVehicleExpenses = allExpenses
      .filter(e => isValid(parseISO(e.date)) && isWithinInterval(parseISO(e.date), interval))
      .reduce((sum, e) => sum + e.amount, 0);
      
    return totalIncome - totalWithdrawals - totalVehicleExpenses;
  }, [allPayments, allWithdrawals, allExpenses, fleetCashEntries]);
  
  const handleCopyTicketAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!receiptContentRef.current) return null;
    try {
        const canvas = await html2canvas(receiptContentRef.current, { scale: 2.5, backgroundColor: null, useCORS: true });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error("No se pudo crear el blob de la imagen.");

        if (isForSharing) {
            const file = paymentForReceipt ? `recibo_pago_${paymentForReceipt.id}.png` : `recibo_ingreso_${cashEntryForReceipt!.id}.png`;
            return new File([blob], file, { type: 'image/png' });
        } else {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast({ title: "Copiado", description: "La imagen del recibo ha sido copiada." });
            return null;
        }
    } catch (e) {
        console.error("Error al manejar la imagen:", e);
        toast({ title: "Error", description: "No se pudo procesar la imagen del recibo.", variant: "destructive" });
        return null;
    }
  }, [paymentForReceipt, cashEntryForReceipt, toast]);
  
  const handleCopyWhatsAppMessage = useCallback(() => {
    if (!paymentForReceipt) return; // Only implement for payment receipts for now
    const message = `Comprobante de Pago
Folio: ${paymentForReceipt.id}
Conductor: ${paymentForReceipt.driverName}
Vehículo: ${paymentForReceipt.vehicleLicensePlate}
Monto: ${formatCurrency(paymentForReceipt.amount)}
¡Gracias por tu pago!`;

    navigator.clipboard.writeText(message).then(() => {
        toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado.' });
    });
  }, [paymentForReceipt, toast]);


  const handleShareReceipt = async () => {
    const imageFile = await handleCopyTicketAsImage(true);
    if (imageFile && navigator.share) {
        try {
            await navigator.share({
                files: [imageFile],
                title: 'Recibo',
                text: `Recibo de ${paymentForReceipt ? 'pago' : 'ingreso'}`,
            });
        } catch (error) {
            if (!String(error).includes('AbortError')) {
                toast({ title: 'No se pudo compartir', description: 'Copiando texto como alternativa.', variant: 'default' });
                handleCopyWhatsAppMessage();
            }
        }
    } else {
        handleCopyWhatsAppMessage();
    }
  };

  const handlePrintReceipt = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };


  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }

  const tabs = [
    { value: "estado_cuenta", label: "Estado de Cuenta", content: <Suspense fallback={<Loader2 className="animate-spin" />}><EstadoCuentaTab drivers={allDrivers} vehicles={allVehicles} payments={allPayments} /></Suspense> },
    { value: "movimientos", label: "Movimientos", content: <Suspense fallback={<Loader2 className="animate-spin" />}><MovimientosFlotillaTab payments={allPayments} expenses={allExpenses} withdrawals={allWithdrawals} cashEntries={fleetCashEntries} drivers={allDrivers} onPrintPayment={handlePrintPayment} onPrintCashEntry={handlePrintCashEntry} currentUser={currentUser} onDeleteMovement={handleDeleteMovement} /></Suspense> },
    { value: "conductores", label: "Conductores", content: <Suspense fallback={<Loader2 className="mx-auto my-8 h-8 w-8 animate-spin" />}><ConductoresTab allDrivers={allDrivers} allVehicles={allVehicles} /></Suspense> },
    { value: "vehiculos", label: "Vehículos", content: <Suspense fallback={<Loader2 className="mx-auto my-8 h-8 w-8 animate-spin" />}><VehiculosFlotillaTab allDrivers={allDrivers} allVehicles={allVehicles} /></Suspense> },
    { value: "reportes", label: "Reportes", content: <Suspense fallback={<Loader2 className="animate-spin" />}><ReportesTab vehicles={allVehicles} /></Suspense> },
  ];
  
  const pageActions = (
     <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={() => setIsCashEntryDialogOpen(true)} variant="outline" className="bg-white hover:bg-gray-100 text-black border-gray-300">
            <ArrowUpCircle className="mr-2 h-4 w-4 text-green-500"/> Ingreso a Caja
        </Button>
        <Button onClick={() => setIsWithdrawalDialogOpen(true)} variant="outline" className="bg-white hover:bg-gray-100 text-black border-gray-300">
          <ArrowDownCircle className="mr-2 h-4 w-4 text-red-500"/> Retiro
        </Button>
        <Button onClick={() => setIsExpenseDialogOpen(true)} variant="outline" className="bg-white hover:bg-gray-100 text-black border-gray-300">
           <ArrowDownCircle className="mr-2 h-4 w-4 text-red-500"/> Gasto
        </Button>
        <div className="flex items-center gap-2 p-2 h-10 rounded-md border bg-card text-card-foreground shadow-sm">
          <Wallet className="h-5 w-5 text-green-500" />
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground -mb-1">Caja (Este Mes)</span>
            <span className="font-bold">{formatCurrency(totalCashBalance)}</span>
          </div>
        </div>
        <Button onClick={() => setIsPaymentDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Registrar Pago
        </Button>
    </div>
  );

  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <TabbedPageLayout
        title="Gestión de Flotilla"
        description="Administra vehículos, conductores, pagos y reportes de tu flotilla."
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
        actions={pageActions}
      />
      <Suspense fallback={null}>
         <RegisterPaymentDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} drivers={allDrivers} vehicles={allVehicles} onSave={handleSavePayment} />
         <VehicleExpenseDialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen} fleetVehicles={allVehicles.filter(v => v.isFleetVehicle)} onSave={handleSaveExpense} />
         <OwnerWithdrawalDialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen} owners={Array.from(new Set(allVehicles.filter(v => v.isFleetVehicle).map(v => v.ownerName))).sort()} onSave={handleSaveWithdrawal}/>
         <CashEntryDialog open={isCashEntryDialogOpen} onOpenChange={setIsCashEntryDialogOpen} onSave={handleSaveCashEntry} />
         
          <UnifiedPreviewDialog
              open={isReceiptDialogOpen}
              onOpenChange={setIsReceiptDialogOpen}
              title={paymentForReceipt ? "Comprobante de Pago de Renta" : "Comprobante de Ingreso de Caja"}
              rentalPayment={paymentForReceipt ?? undefined}
              cashEntry={cashEntryForReceipt ?? undefined}
              footerContent={
                 <div className="flex w-full justify-end gap-2">
                    <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" onClick={() => handleCopyTicketAsImage(false)}><Copy className="h-6 w-6"/></Button></TooltipTrigger><TooltipContent><p>Copiar Imagen</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-green-100 text-green-700 border-green-200 hover:bg-green-200" onClick={handleShareReceipt}><Share2 className="h-6 w-6"/></Button></TooltipTrigger><TooltipContent><p>Compartir</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-red-100 text-red-700 border-red-200 hover:bg-red-200" onClick={handlePrintReceipt}><Printer className="h-6 w-6"/></Button></TooltipTrigger><TooltipContent><p>Imprimir</p></TooltipContent></Tooltip>
                    </TooltipProvider>
                </div>
              }
          >
            <div ref={receiptContentRef}>
              {paymentForReceipt ? (
                  <RentalReceiptContent 
                      payment={paymentForReceipt}
                      driver={allDrivers.find(d => d.id === paymentForReceipt.driverId)}
                      vehicle={allVehicles.find(v => v.licensePlate === paymentForReceipt.vehicleLicensePlate)}
                      allPaymentsForDriver={allPayments.filter(p => p.driverId === paymentForReceipt.driverId)}
                      workshopInfo={workshopInfo}
                  />
              ) : cashEntryForReceipt ? (
                  <CashEntryReceiptContent
                    entry={cashEntryForReceipt}
                    workshopInfo={workshopInfo}
                  />
              ) : null}
            </div>
          </UnifiedPreviewDialog>
         
      </Suspense>
    </Suspense>
  );
}
