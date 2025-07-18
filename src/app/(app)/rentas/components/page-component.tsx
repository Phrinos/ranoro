
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { PlusCircle, UserCheck, UserX, Search } from "lucide-react";
import { RegisterPaymentDialog } from "./register-payment-dialog";
import type { RentalPayment, Driver, Vehicle, WorkshopInfo, VehicleExpense, OwnerWithdrawal, User as RanoroUser } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, compareDesc, isValid, startOfMonth, endOfMonth, isWithinInterval, isSameDay, subDays, startOfWeek, endOfWeek, getDate, isAfter, differenceInCalendarDays, compareAsc } from 'date-fns';
import { es } from 'date-fns/locale';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { RentalReceiptContent } from './rental-receipt-content';
import { formatCurrency, calculateDriverDebt, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import html2canvas from 'html2canvas';
import { inventoryService, operationsService, personnelService } from '@/lib/services';
import { VehicleExpenseDialog, type VehicleExpenseFormValues } from './vehicle-expense-dialog';
import { OwnerWithdrawalDialog, type OwnerWithdrawalFormValues } from './owner-withdrawal-dialog';
import { useRouter } from 'next/navigation';
import { EditPaymentNoteDialog } from './edit-payment-note-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Loader2, DollarSign as DollarSignIcon, CalendarIcon as CalendarDateIcon, BadgeCent, Edit, User, TrendingDown, DollarSign, AlertCircle, ArrowUpCircle, ArrowDownCircle, Coins, BarChart2, Wallet, Wrench, Landmark, LayoutGrid, CalendarDays, FileText, Receipt, Package, Truck, Settings, Shield, LineChart, Printer, Copy, MessageSquare, ChevronRight, ListFilter, Badge, Share2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import type { DateRange } from 'react-day-picker';
import { parseDate } from '@/lib/forms';


interface MonthlyBalance {
  driverId: string;
  driverName: string;
  vehicleInfo: string;
  payments: number;
  charges: number;
  daysPaid: number;
  daysOwed: number;
  balance: number;
  realBalance: number;
}
type BalanceSortOption = 'driverName_asc' | 'driverName_desc' | 'daysOwed_desc' | 'daysOwed_asc' | 'balance_desc' | 'balance_asc';

function RentasPageComponent({ tab, action }: { tab?: string, action?: string | null }) {
  const defaultTab = tab || 'resumen';
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [workshopInfo, setWorkshopInfo] = useState<Partial<WorkshopInfo>>({});
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isEditNoteDialogOpen, setIsEditNoteDialogOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<RentalPayment | null>(null);
  const [balanceSortOption, setBalanceSortOption] = useState<BalanceSortOption>('daysOwed_desc');
  
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (action === 'registrar') {
      setIsPaymentDialogOpen(true);
    }
  }, [action]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);

    unsubs.push(personnelService.onDriversUpdate(setDrivers));
    unsubs.push(inventoryService.onVehiclesUpdate(setVehicles));
    unsubs.push(operationsService.onVehicleExpensesUpdate(setExpenses));
    unsubs.push(operationsService.onOwnerWithdrawalsUpdate(setWithdrawals));
    unsubs.push(operationsService.onRentalPaymentsUpdate((data) => {
        setPayments(data);
        setIsLoading(false);
    }));

    const storedInfo = localStorage.getItem('workshopTicketInfo');
    if (storedInfo) setWorkshopInfo(JSON.parse(storedInfo));

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const [paymentForReceipt, setPaymentForReceipt] = useState<RentalPayment | null>(null);
  
  const monthlyBalances = useMemo((): MonthlyBalance[] => {
    if (isLoading) return [];
    
    const today = new Date();
    const monthStart = startOfMonth(today);
    
    const balances = drivers.filter(d => !d.isArchived).map(driver => {
        const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
        const dailyRate = vehicle?.dailyRentalCost || 0;
        
        const paymentsThisMonth = payments
            .filter(p => p.driverId === driver.id && isWithinInterval(parseISO(p.paymentDate), { start: monthStart, end: today }))
            .reduce((sum, p) => sum + p.amount, 0);
            
        const daysPaidThisMonth = dailyRate > 0 ? paymentsThisMonth / dailyRate : 0;
        
        const contractStartDate = driver.contractDate ? parseISO(driver.contractDate) : today;
        const calculationStartDate = isAfter(contractStartDate, monthStart) ? contractStartDate : monthStart;
        
        const daysToChargeThisMonth = !isAfter(calculationStartDate, today) ? differenceInCalendarDays(today, calculationStartDate) + 1 : 0;
        const chargesThisMonth = dailyRate * daysToChargeThisMonth;
        
        const balance = paymentsThisMonth - chargesThisMonth;
        
        const { totalDebt } = calculateDriverDebt(driver, payments, vehicles);
        const realBalance = balance + (driver.depositAmount || 0) - (driver.requiredDepositAmount || 0) - (driver.manualDebts || []).reduce((sum,d) => sum + d.amount, 0);
        
        const rentalDebtThisMonth = Math.max(0, -balance);
        const daysOwed = dailyRate > 0 ? rentalDebtThisMonth / dailyRate : 0;
        
        return {
            driverId: driver.id,
            driverName: driver.name,
            vehicleInfo: vehicle ? `${vehicle.licensePlate} (${formatCurrency(dailyRate)}/día)` : 'N/A',
            payments: paymentsThisMonth,
            charges: chargesThisMonth,
            daysPaid: daysPaidThisMonth,
            daysOwed,
            balance,
            realBalance,
        };
    });

    return balances.sort((a, b) => {
        switch (balanceSortOption) {
            case 'driverName_asc': return a.driverName.localeCompare(b.driverName);
            case 'driverName_desc': return b.driverName.localeCompare(a.driverName);
            case 'daysOwed_desc': return b.daysOwed - a.daysOwed;
            case 'daysOwed_asc': return a.daysOwed - b.daysOwed;
            case 'balance_desc': return b.realBalance - a.realBalance;
            case 'balance_asc': return a.realBalance - b.realBalance;
            default: return b.daysOwed - a.daysOwed;
        }
    });

  }, [isLoading, drivers, vehicles, payments, balanceSortOption]);

  const handleSavePayment = async (driverId: string, amount: number, note: string | undefined, mileage?: number) => {
    try {
        const newPayment = await operationsService.addRentalPayment(driverId, amount, note, mileage);
        toast({ title: 'Pago Registrado' });
        setIsPaymentDialogOpen(false);
        setPaymentForReceipt(newPayment);
    } catch (e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };
  
  const handleUpdatePaymentNote = async (paymentId: string, note: string) => {
    try {
        await operationsService.updateRentalPayment(paymentId, { note });
        toast({ title: 'Concepto Actualizado' });
        setIsEditNoteDialogOpen(false);
    } catch (e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleSaveExpense = async (data: VehicleExpenseFormValues) => {
    try {
        await operationsService.addVehicleExpense(data);
        toast({ title: 'Gasto Registrado'});
        setIsExpenseDialogOpen(false);
    } catch(e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };
  
  const handleSaveWithdrawal = async (data: OwnerWithdrawalFormValues) => {
    try {
        await operationsService.addOwnerWithdrawal(data);
        toast({ title: 'Retiro Registrado'});
        setIsWithdrawalDialogOpen(false);
    } catch(e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };
  
  const handleCopyAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!receiptRef.current || !paymentForReceipt) return null;
    try {
        const canvas = await html2canvas(receiptRef.current, { scale: 2.5, backgroundColor: null });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error("No se pudo crear el blob de la imagen.");

        if (isForSharing) {
            return new File([blob], `recibo_renta_${paymentForReceipt.id}.png`, { type: 'image/png' });
        } else {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast({ title: "Copiado", description: "La imagen del recibo ha sido copiada." });
            return null;
        }
    } catch (e) {
        console.error("Error handling image:", e);
        toast({ title: "Error", description: "No se pudo procesar la imagen del recibo.", variant: "destructive" });
        return null;
    }
  }, [paymentForReceipt, toast]);

  const handleShare = async () => {
    const imageFile = await handleCopyAsImage(true);
    if (imageFile && navigator.share) {
      try {
        await navigator.share({
          files: [imageFile],
          title: 'Recibo de Renta',
          text: `Recibo de pago de renta de ${workshopInfo?.name || 'nuestro taller'}.`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        toast({ title: 'Error al compartir', variant: 'destructive' });
      }
    } else if (imageFile) {
        // Fallback for desktop browsers that don't support navigator.share with files
        const driver = drivers.find(d => d.id === paymentForReceipt?.driverId);
        const phone = driver?.phone;
        const message = `Recibo de tu pago en ${workshopInfo?.name || 'nuestro taller'}. ¡Gracias!`;
        const whatsappUrl = `https://wa.me/${phone ? phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        toast({ title: 'Copiado', description: 'Usa Ctrl+V o Cmd+V para pegar la imagen en WhatsApp.' });
    }
  };
  
  const handlePrint = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };
  
  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => compareDesc(parseDate(a.paymentDate)!, parseDate(b.paymentDate)!));
  }, [payments]);
  
  const sortedExpenses = useMemo(() => {
      return [...expenses].sort((a,b) => compareDesc(parseDate(a.date)!, parseDate(b.date)!));
  }, [expenses]);
  
  const sortedWithdrawals = useMemo(() => {
      return [...withdrawals].sort((a,b) => compareDesc(parseDate(a.date)!, parseDate(b.date)!));
  }, [withdrawals]);

  const uniqueOwners = useMemo(() => Array.from(new Set(vehicles.filter(v => v.isFleetVehicle).map(v => v.ownerName))).sort(), [vehicles]);

  const summaryData = useMemo(() => {
    if (!filterDateRange?.from) {
        return { totalCollected: 0, totalDebt: 0, totalMonthlyBalance: 0, driverWithMostDebt: null, totalExpenses: 0 };
    }
    const { from, to } = filterDateRange;
    const interval = { start: startOfDay(from), end: endOfDay(to || from) };

    const totalCollectedThisPeriod = payments
        .filter(p => isWithinInterval(parseDate(p.paymentDate)!, interval))
        .reduce((sum, p) => sum + p.amount, 0);

    const totalExpensesThisPeriod = expenses
        .filter(e => isWithinInterval(parseDate(e.date)!, interval))
        .reduce((sum, e) => sum + e.amount, 0);

    const { totalDebt, totalMonthlyBalance } = monthlyBalances.reduce((acc, curr) => {
        acc.totalDebt += curr.realBalance < 0 ? curr.realBalance : 0;
        acc.totalMonthlyBalance += curr.balance;
        return acc;
    }, { totalDebt: 0, totalMonthlyBalance: 0 });

    const driverWithMostDebt = monthlyBalances.length > 0
        ? monthlyBalances.reduce((prev, curr) => (prev.daysOwed > curr.daysOwed ? prev : curr))
        : null;

    return {
        totalCollected: totalCollectedThisPeriod,
        totalDebt: Math.abs(totalDebt),
        totalMonthlyBalance,
        driverWithMostDebt,
        totalExpenses: totalExpensesThisPeriod
    };
  }, [filterDateRange, payments, expenses, monthlyBalances]);


  const totalCashBalance = useMemo(() => {
    if (!filterDateRange?.from) return 0;
    const { from, to } = filterDateRange;
    const interval = { start: startOfDay(from), end: endOfDay(to || from) };

    const totalIncome = payments
      .filter(p => isWithinInterval(parseDate(p.paymentDate)!, interval))
      .reduce((sum, p) => sum + p.amount, 0);
      
    const totalWithdrawals = withdrawals
      .filter(w => isWithinInterval(parseDate(w.date)!, interval))
      .reduce((sum, w) => sum + w.amount, 0);
      
    const totalVehicleExpenses = expenses
      .filter(e => isWithinInterval(parseDate(e.date)!, interval))
      .reduce((sum, e) => sum + e.amount, 0);
      
    return totalIncome - totalWithdrawals - totalVehicleExpenses;
  }, [filterDateRange, payments, withdrawals, expenses]);

  
  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Ingresos de Flotilla</h1>
        <p className="text-primary-foreground/80 mt-1">Registra y consulta los pagos de renta, gastos y retiros.</p>
      </div>
      
       <div className="flex justify-end gap-2 mb-6">
          <Button onClick={() => setIsWithdrawalDialogOpen(true)} variant="outline" className="bg-white hover:bg-gray-100 text-black border-gray-300 w-full sm:w-auto">
            <ArrowDownCircle className="mr-2 h-4 w-4 text-red-500"/>
            Retiro
          </Button>
          <Button onClick={() => setIsExpenseDialogOpen(true)} variant="outline" className="bg-white hover:bg-gray-100 text-black border-gray-300 w-full sm:w-auto">
             <ArrowDownCircle className="mr-2 h-4 w-4 text-red-500"/>
             Gasto
          </Button>
          <div className="flex items-center gap-2 p-2 h-10 rounded-md border bg-card text-card-foreground shadow-sm">
            <Wallet className="h-5 w-5 text-green-500" />
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground -mb-1">Saldo en Caja</span>
              <span className="font-bold">{formatCurrency(totalCashBalance)}</span>
            </div>
          </div>
          <Button onClick={() => setIsPaymentDialogOpen(true)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Registrar Pago
          </Button>
      </div>
      
       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full mb-6">
                <TabsList className="h-auto flex flex-wrap w-full gap-2 sm:gap-4 p-0 bg-transparent">
                    <TabsTrigger value="resumen" className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Resumen</TabsTrigger>
                    <TabsTrigger value="estado_cuenta" className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Estado de Cuenta</TabsTrigger>
                    <TabsTrigger value="historial" className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Historial</TabsTrigger>
                    <TabsTrigger value="gastos_retiros" className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Gastos y Retiros</TabsTrigger>
                    <TabsTrigger value="reportes" className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Reportes</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="resumen" className="space-y-6">
                <div className="flex justify-end">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full sm:w-[280px] justify-start text-left font-normal bg-card",!filterDateRange && "text-muted-foreground")}>
                                <CalendarDateIcon className="mr-2 h-4 w-4" />
                                {filterDateRange?.from ? (filterDateRange.to ? (`${format(filterDateRange.from, "LLL dd, y", { locale: es })} - ${format(filterDateRange.to, "LLL dd, y", { locale: es })}`) : format(filterDateRange.from, "LLL dd, y", { locale: es })) : (<span>Seleccione rango</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar initialFocus mode="range" defaultMonth={filterDateRange?.from} selected={filterDateRange} onSelect={setFilterDateRange} numberOfMonths={2} locale={es} />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Recaudado (Periodo)</CardTitle><DollarSign className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(summaryData.totalCollected)}</div><p className="text-xs text-muted-foreground">Total de pagos de renta en el periodo</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Deuda Total Pendiente</CardTitle><AlertCircle className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{formatCurrency(summaryData.totalDebt)}</div><p className="text-xs text-muted-foreground">Suma de balances reales de todos.</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Balance del Mes (Flotilla)</CardTitle><LineChart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className={cn("text-2xl font-bold", summaryData.totalMonthlyBalance >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(summaryData.totalMonthlyBalance)}</div><p className="text-xs text-muted-foreground">Pagos vs. cargos del mes actual.</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gastos de Flotilla (Periodo)</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(summaryData.totalExpenses)}</div><p className="text-xs text-muted-foreground">Gastos de vehículos en el periodo.</p></CardContent></Card>
                </div>
            </TabsContent>
            <TabsContent value="estado_cuenta">
                <Card>
                  <CardHeader>
                      <div className="flex justify-between items-center">
                          <div>
                              <CardTitle>Estado de Cuenta Mensual</CardTitle>
                              <CardDescription>Resumen de saldos de todos los conductores para el mes de {format(new Date(), "MMMM", { locale: es })}.</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm">
                                          <ListFilter className="mr-2 h-4 w-4" />
                                          Ordenar por
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                                      <DropdownMenuRadioGroup value={balanceSortOption} onValueChange={(v) => setBalanceSortOption(v as BalanceSortOption)}>
                                          <DropdownMenuRadioItem value="daysOwed_desc">Mayor Adeudo</DropdownMenuRadioItem>
                                          <DropdownMenuRadioItem value="daysOwed_asc">Menor Adeudo</DropdownMenuRadioItem>
                                          <DropdownMenuRadioItem value="driverName_asc">Conductor (A-Z)</DropdownMenuRadioItem>
                                          <DropdownMenuRadioItem value="driverName_desc">Conductor (Z-A)</DropdownMenuRadioItem>
                                          <DropdownMenuRadioItem value="balance_desc">Mejor Balance (Mes)</DropdownMenuRadioItem>
                                          <DropdownMenuRadioItem value="balance_asc">Peor Balance (Mes)</DropdownMenuRadioItem>
                                      </DropdownMenuRadioGroup>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                              <span className="text-sm text-muted-foreground">Día {getDate(new Date())} del mes</span>
                          </div>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <div className="rounded-md border overflow-x-auto">
                          <Table>
                              <TableHeader className="bg-black">
                                  <TableRow>
                                      <TableHead className="text-white">Conductor</TableHead>
                                      <TableHead className="text-white">Vehículo</TableHead>
                                      <TableHead className="text-right text-white">Pagos (Mes)</TableHead>
                                      <TableHead className="text-right text-white">Cargos (Mes)</TableHead>
                                      <TableHead className="text-right text-white">Balance (Mes)</TableHead>
                                      <TableHead className="text-right text-white">Balance Real</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {monthlyBalances.length > 0 ? (
                                      monthlyBalances.map(mb => (
                                          <TableRow 
                                              key={mb.driverId} 
                                              className={cn("cursor-pointer hover:bg-muted/50", mb.realBalance < 0 && "bg-red-50 dark:bg-red-900/30")}
                                              onClick={() => router.push(`/conductores/${mb.driverId}`)}
                                          >
                                              <TableCell className="font-semibold">{mb.driverName}</TableCell>
                                              <TableCell>{mb.vehicleInfo}</TableCell>
                                              <TableCell className="text-right text-green-600">{formatCurrency(mb.payments)}</TableCell>
                                              <TableCell className="text-right text-red-600">{formatCurrency(mb.charges)}</TableCell>
                                              <TableCell className={cn("text-right font-bold", mb.balance >= 0 ? "text-green-700" : "text-red-700")}>{formatCurrency(mb.balance)}</TableCell>
                                              <TableCell className={cn("text-right font-bold", mb.realBalance >= 0 ? "text-green-700" : "text-red-700")}>{formatCurrency(mb.realBalance)}</TableCell>
                                          </TableRow>
                                      ))
                                  ) : (
                                      <TableRow><TableCell colSpan={7} className="h-24 text-center">No hay conductores activos.</TableCell></TableRow>
                                  )}
                              </TableBody>
                          </Table>
                      </div>
                  </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="historial">
                 <Card>
                  <CardHeader><CardTitle>Historial de Pagos de Renta</CardTitle></CardHeader>
                  <CardContent>
                     <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-black">
                            <TableRow>
                                <TableHead className="text-white">Folio</TableHead>
                                <TableHead className="text-white">Registrado por</TableHead>
                                <TableHead className="text-white">Fecha</TableHead>
                                <TableHead className="text-white">Conductor</TableHead>
                                <TableHead className="text-white">Vehículo</TableHead>
                                <TableHead className="text-right text-white">Monto</TableHead>
                                <TableHead className="text-white">Concepto</TableHead>
                                <TableHead className="text-right text-white">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                             {sortedPayments.length > 0 ? (
                                sortedPayments.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-mono">{p.id.slice(-6)}</TableCell>
                                        <TableCell>{p.registeredBy || 'Sistema'}</TableCell>
                                        <TableCell>{format(parseISO(p.paymentDate), "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                                        <TableCell className="font-semibold">{p.driverName}</TableCell>
                                        <TableCell>{p.vehicleLicensePlate}</TableCell>
                                        <TableCell className="text-right font-bold">
                                            <p>{formatCurrency(p.amount)}</p>
                                            {p.paymentMethod && <Badge variant="outline" className="mt-1 text-xs">{p.paymentMethod}</Badge>}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{p.note || 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => { setPaymentToEdit(p); setIsEditNoteDialogOpen(true); }}>
                                                <Edit className="h-4 w-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setPaymentForReceipt(p)}>
                                                <Printer className="h-4 w-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => { setPaymentForReceipt(p); handleCopyAsImage(false); }}>
                                                <Copy className="h-4 w-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => { setPaymentForReceipt(p); setTimeout(handleShare, 100); }}>
                                                <Share2 className="h-4 w-4"/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                             ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24">
                                        No hay pagos registrados.
                                    </TableCell>
                                </TableRow>
                             )}
                          </TableBody>
                        </Table>
                    </div>
                  </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="gastos_retiros">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Historial de Gastos</CardTitle></CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Vehículo</TableHead><TableHead>Desc.</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {sortedExpenses.length > 0 ? sortedExpenses.map(e => (<TableRow key={e.id}><TableCell>{format(parseISO(e.date), "dd/MM/yy")}</TableCell><TableCell>{e.vehicleLicensePlate}</TableCell><TableCell>{e.description}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(e.amount)}</TableCell></TableRow>)) : <TableRow><TableCell colSpan={4} className="h-24 text-center">Sin gastos</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Historial de Retiros</CardTitle></CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Propietario</TableHead><TableHead>Razón</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {sortedWithdrawals.length > 0 ? sortedWithdrawals.map(w => (<TableRow key={w.id}><TableCell>{format(parseISO(w.date), "dd/MM/yy")}</TableCell><TableCell>{w.ownerName}</TableCell><TableCell>{w.reason || 'N/A'}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(w.amount)}</TableCell></TableRow>)) : <TableRow><TableCell colSpan={4} className="h-24 text-center">Sin retiros</TableCell></TableRow>}
                          </TableBody>
                        </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="reportes" className="mt-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div><h2 className="text-2xl font-semibold tracking-tight">Reporte de Ingresos de Flotilla</h2><p className="text-muted-foreground">Seleccione un propietario para ver el detalle de ingresos de sus vehículos.</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{uniqueOwners.map(owner => (<Link key={owner} href={`/flotilla/reporte-ingresos/${encodeURIComponent(owner)}`} passHref><Card className="hover:bg-muted hover:border-primary/50 transition-all shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div className="flex items-center gap-3"><User className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">{owner}</span></div><ChevronRight className="h-5 w-5 text-muted-foreground" /></CardContent></Card></Link>))}</div>
            </TabsContent>
      </Tabs>
      
      <RegisterPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        drivers={drivers}
        vehicles={vehicles}
        onSave={handleSavePayment}
      />
      
      <VehicleExpenseDialog
        open={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        fleetVehicles={vehicles.filter(v => v.isFleetVehicle)}
        onSave={handleSaveExpense}
      />

      <OwnerWithdrawalDialog
        open={isWithdrawalDialogOpen}
        onOpenChange={setIsWithdrawalDialogOpen}
        owners={uniqueOwners}
        onSave={handleSaveWithdrawal}
      />
      
      <EditPaymentNoteDialog
        open={isEditNoteDialogOpen}
        onOpenChange={setIsEditNoteDialogOpen}
        payment={paymentToEdit}
        onSave={handleUpdatePaymentNote}
      />
      
      <PrintTicketDialog
        open={!!paymentForReceipt}
        onOpenChange={(isOpen) => !isOpen && setPaymentForReceipt(null)}
        title="Recibo de Pago de Renta"
        footerActions={
          <>
            <Button onClick={() => handleCopyAsImage(false)} className="w-full bg-white hover:bg-gray-100 text-black border"><Copy className="mr-2 h-4 w-4"/>Copiar Imagen</Button>
            <Button onClick={handleShare} className="w-full bg-green-100 hover:bg-green-200 text-green-800"><Share2 className="mr-2 h-4 w-4" /> Compartir</Button>
            <Button onClick={handlePrint} className="w-full"><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
          </>
        }
      >
        <div id="printable-ticket">
          {paymentForReceipt && (
             <RentalReceiptContent 
                ref={receiptRef} 
                payment={paymentForReceipt} 
                workshopInfo={workshopInfo} 
                driver={drivers.find(d => d.id === paymentForReceipt.driverId)}
                allPaymentsForDriver={payments.filter(p => p.driverId === paymentForReceipt.driverId)}
                vehicle={vehicles.find(v => v.licensePlate === paymentForReceipt.vehicleLicensePlate)}
             />
          )}
        </div>
      </PrintTicketDialog>
    </>
  );
}

export { RentasPageComponent };
