// src/app/(app)/flotilla/caja/components/FlotillaCajaTab.tsx
"use client";

import React, { useMemo, useState, useRef, useCallback } from 'react';
import type { RentalPayment, OwnerWithdrawal, VehicleExpense, Driver, Vehicle, WorkshopInfo, ManualDebtEntry, DailyRentalCharge, PaymentMethod } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn, capitalizeWords } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowDown, Printer, Copy, Share2, Wallet, CreditCard, Landmark, TrendingUp, TrendingDown as TrendingDownIcon, Wrench } from 'lucide-react';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { RentalPaymentTicket } from './RentalPaymentTicket';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type CashBoxTransaction =
    | (RentalPayment & { transactionType: 'income' })
    | (OwnerWithdrawal & { transactionType: 'withdrawal' })
    | (VehicleExpense & { transactionType: 'expense' });

interface FlotillaCajaTabProps {
  payments: RentalPayment[];
  withdrawals: OwnerWithdrawal[];
  expenses: VehicleExpense[];
  drivers: Driver[];
  vehicles: Vehicle[];
  allManualDebts: ManualDebtEntry[];
  allDailyCharges: DailyRentalCharge[];
  onAddWithdrawal: () => void;
  onAddExpense: () => void;
}

const paymentMethodIcons: Record<PaymentMethod, React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Tarjeta MSI": CreditCard,
  "Transferencia": Landmark,
};

const generateMonthOptions = () => {
    const options = [{ value: 'all', label: 'Todos los meses' }];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const value = format(date, 'yyyy-MM');
        const label = capitalizeWords(format(date, 'MMMM yyyy', { locale: es }));
        options.push({ value, label });
    }
    return options;
};

export function FlotillaCajaTab({
    payments,
    withdrawals,
    expenses,
    drivers,
    vehicles,
    allManualDebts,
    allDailyCharges,
    onAddWithdrawal,
    onAddExpense
}: FlotillaCajaTabProps) {
  const { toast } = useToast();
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<RentalPayment | null>(null);
  const [selectedDriverBalance, setSelectedDriverBalance] = useState(0);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);

  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));


  React.useEffect(() => {
    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
     if (storedWorkshopInfo) {
      try {
        setWorkshopInfo(JSON.parse(storedWorkshopInfo));
      } catch (e) {
        console.error("Failed to parse workshop info from localStorage", e);
      }
    }
  }, []);

  const { transactions, summary } = useMemo(() => {
    const paymentsWithDate = payments
      .filter(p => p.paymentDate)
      .map(p => ({ ...p, date: p.paymentDate })) as Array<RentalPayment & { date: string }>;
  
    const withdrawalsWithDate = withdrawals
      .filter(w => w.date)
      .map(w => ({ ...w, date: w.date })) as Array<OwnerWithdrawal & { date: string }>;
  
    const expensesWithDate = expenses
      .filter(e => e.date)
      .map(e => ({ ...e, date: e.date })) as Array<VehicleExpense & { date: string }>;
  
    const filterByMonth = <T extends { date: string }>(items: T[]): T[] => {
      if (selectedMonth === 'all') return items;
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(startDate);
      return items.filter(item => {
        if (!item.date) return false;
        const d = parseISO(item.date);
        return isValid(d) && isWithinInterval(d, { start: startDate, end: endDate });
      });
    };
  
    const monthlyPayments = filterByMonth(paymentsWithDate);
    const monthlyWithdrawals = filterByMonth(withdrawalsWithDate);
    const monthlyExpenses = filterByMonth(expensesWithDate);
  
    const allTransactions: CashBoxTransaction[] = [
      ...monthlyPayments.map(p => ({ ...p, transactionType: 'income' as const })),
      ...monthlyWithdrawals.map(w => ({ ...w, transactionType: 'withdrawal' as const })),
      ...monthlyExpenses.map(e => ({ ...e, transactionType: 'expense' as const })),
    ];
  
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
    const totalCash = monthlyPayments
      .filter(p => p.paymentMethod === 'Efectivo')
      .reduce((sum, p) => sum + p.amount, 0);
  
    const totalTransfers = monthlyPayments
      .filter(p => p.paymentMethod === 'Transferencia')
      .reduce((sum, p) => sum + p.amount, 0);
  
    const totalWithdrawals = monthlyWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  
    const cashBalance = totalCash - totalWithdrawals - totalExpenses;
  
    return {
      transactions: allTransactions,
      summary: {
        totalBalance: cashBalance,
        totalWithdrawals,
        totalExpenses,
        totalCash,
        totalTransfers,
      },
    };
  }, [payments, withdrawals, expenses, selectedMonth]);

    const currentCashBalance = useMemo(() => {
        const totalCashIncome = payments
            .filter(p => p.paymentMethod === 'Efectivo' && p.paymentDate)
            .reduce((sum, p) => sum + p.amount, 0);
        const totalWithdrawals = withdrawals
            .filter(w => w.date)
            .reduce((sum, w) => sum + w.amount, 0);
        const totalExpenses = expenses
            .filter(e => e.date)
            .reduce((sum, e) => sum + e.amount, 0);
        return totalCashIncome - totalWithdrawals - totalExpenses;
    }, [payments, withdrawals, expenses]);


  const getTransactionDetails = (t: CashBoxTransaction) => {
    switch (t.transactionType) {
      case 'income':
        const Icon = paymentMethodIcons[t.paymentMethod as PaymentMethod] || Wallet;
        return { variant: t.paymentMethod === 'Transferencia' ? 'info' : 'success', label: 'Ingreso', description: `Pago de ${t.driverName}`, methodIcon: <Icon className="h-4 w-4" />, methodName: t.paymentMethod };
      case 'withdrawal':
        return { variant: 'destructive', label: 'Retiro', description: `Retiro de ${t.ownerName}`, methodIcon: null, methodName: 'N/A' };
      case 'expense':
        return { variant: 'secondary', label: 'Gasto', description: `${t.description} (${t.vehicleLicensePlate})`, methodIcon: null, methodName: 'N/A' };
    }
  };

  const handleShowTicket = (payment: RentalPayment) => {
    const driver = drivers.find(d => d.id === payment.driverId);
    if (!driver) return;

    const driverPayments = payments.filter(p => p.driverId === driver.id);
    const driverDebts = allManualDebts.filter(d => d.driverId === driver.id);
    const driverDailyCharges = allDailyCharges.filter(c => c.driverId === driver.id);
    
    const totalPayments = driverPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalCharges = driverDailyCharges.reduce((sum, c) => sum + c.amount, 0);
    const totalManualDebts = driverDebts.reduce((sum, d) => sum + d.amount, 0);

    const balance = totalPayments - (totalCharges + totalManualDebts);

    setSelectedDriverBalance(balance);
    setSelectedPayment(payment);
    setIsTicketOpen(true);
  };
  
    const handleCopyTicketAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!ticketContentRef.current || !selectedPayment) return null;
    try {
      const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null, useCORS: true });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("No se pudo crear el blob de la imagen.");

      if (isForSharing) {
          return new File([blob], `ticket_pago_${selectedPayment.id}.png`, { type: 'image/png' });
      } else {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          toast({ title: "Copiado", description: "La imagen del ticket ha sido copiada." });
          return null;
      }
    } catch (e) {
      console.error("Error al manejar la imagen:", e);
      toast({ title: "Error", description: "No se pudo procesar la imagen del ticket.", variant: "destructive" });
      return null;
    }
    }, [selectedPayment, toast]);

    const handleShareTicket = async () => {
        const imageFile = await handleCopyTicketAsImage(true);
        if (imageFile && navigator.share) {
            try {
                await navigator.share({
                    files: [imageFile],
                    title: 'Ticket de Pago',
                    text: `Recibo de pago de ${selectedPayment?.driverName}.`,
                });
            } catch (error) {
                if (!String(error).includes('AbortError')) {
                   toast({ title: 'No se pudo compartir', description: 'Ocurrió un error al intentar compartir.', variant: 'default' });
                }
            }
        } else {
            toast({ title: 'No disponible', description: 'La función de compartir no está disponible en este navegador.', variant: 'default' });
        }
    };


  const handlePrintTicket = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };


  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end gap-2 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-auto bg-card">
              <SelectValue placeholder="Seleccionar mes..." />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={onAddWithdrawal} variant="outline" className="bg-white border-red-500 text-black font-bold hover:bg-red-50">
            <TrendingDownIcon className="mr-2 h-4 w-4 text-red-500" /> Retiro
          </Button>
          <Button onClick={onAddExpense} variant="outline" className="bg-white border-red-500 text-black font-bold hover:bg-red-50">
            <Wrench className="mr-2 h-4 w-4 text-red-500" /> Gasto
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Total de Ingresos (Mensual)</CardTitle>
                    <CardDescription>Suma de todos los ingresos del mes seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold text-center text-black">
                        {formatCurrency(summary.totalCash + summary.totalTransfers)}
                    </div>
                </CardContent>
            </Card>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Balance de Caja (Mensual)</CardTitle>
                    <CardDescription>Balance de efectivo del mes seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className={cn("text-4xl font-bold text-center", summary.totalBalance >= 0 ? 'text-green-600' : 'text-destructive')}>
                        {formatCurrency(summary.totalBalance)}
                    </div>
                </CardContent>
            </Card>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Balance de Caja (Actual)</CardTitle>
                    <CardDescription>Dinero total disponible en caja.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className={cn("text-4xl font-bold text-center", currentCashBalance >= 0 ? 'text-blue-600' : 'text-destructive')}>
                        {formatCurrency(currentCashBalance)}
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Wallet className="h-4 w-4 text-green-600"/>Ingresos Efectivo</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalCash)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Landmark className="h-4 w-4 text-blue-600"/>Ingresos Transferencia</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalTransfers)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingDownIcon className="h-4 w-4 text-red-500"/>Total Retiros</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-500">{formatCurrency(summary.totalWithdrawals)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Wrench className="h-4 w-4 text-orange-500"/>Total Gastos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-500">{formatCurrency(summary.totalExpenses)}</div></CardContent></Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Movimientos de Caja</CardTitle>
            <CardDescription>Historial de todos los ingresos y salidas de dinero del mes seleccionado.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-black">
                  <TableRow>
                    <TableHead className="text-white font-bold">Fecha</TableHead>
                    <TableHead className="text-white font-bold">Tipo</TableHead>
                    <TableHead className="text-white font-bold">Descripción</TableHead>
                    <TableHead className="text-center text-white font-bold">Método Pago</TableHead>
                    <TableHead className="text-right text-white font-bold">Monto</TableHead>
                    <TableHead className="text-right text-white font-bold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length > 0 ? (
                    transactions.map(t => {
                      const details = getTransactionDetails(t);
                      return (
                        <TableRow key={`${t.transactionType}-${t.id}`}>
                          <TableCell>{format(parseISO(t.date), "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                          <TableCell>
                            <Badge variant={details.variant as any}>{details.label}</Badge>
                          </TableCell>
                          <TableCell>{details.description}</TableCell>
                           <TableCell className="text-center">
                            {details.methodName !== 'N/A' && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div className="flex items-center justify-center">
                                                {details.methodIcon}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{details.methodName}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                           </TableCell>
                          <TableCell className={cn("text-right font-semibold", details.variant === 'success' ? 'text-green-600' : details.variant === 'info' ? 'text-blue-600' : 'text-destructive')}>
                            {details.variant !== 'destructive' && details.variant !== 'secondary' ? '+' : '-'} {formatCurrency(t.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {t.transactionType === 'income' && (
                                <Button variant="ghost" size="icon" onClick={() => handleShowTicket(t as RentalPayment)}>
                                    <Printer className="h-4 w-4"/>
                                </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">No hay movimientos de caja para el mes seleccionado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
       {selectedPayment && (
          <UnifiedPreviewDialog
            open={isTicketOpen}
            onOpenChange={setIsTicketOpen}
            title={`Ticket de Pago`}
            rentalPayment={selectedPayment}
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
                payment={selectedPayment}
                driver={drivers.find(d => d.id === selectedPayment.driverId)}
                vehicle={vehicles.find(v => v.id === drivers.find(d => d.id === selectedPayment.driverId)?.assignedVehicleId)}
                driverBalance={selectedDriverBalance}
                previewWorkshopInfo={workshopInfo || undefined}
            />
          </UnifiedPreviewDialog>
      )}
    </>
  );
}
