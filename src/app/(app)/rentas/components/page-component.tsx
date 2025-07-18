

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
import { format, parseISO, compareDesc, isValid, startOfMonth, endOfMonth, isWithinInterval, isSameDay, subDays, startOfWeek, endOfWeek } from 'date-fns';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Loader2, DollarSign as DollarSignIcon, CalendarIcon as CalendarDateIcon, BadgeCent, Edit, User, TrendingDown, DollarSign, AlertCircle, ArrowUpCircle, ArrowDownCircle, Coins, BarChart2, Wallet, Wrench, Landmark, LayoutGrid, CalendarDays, FileText, Receipt, Package, Truck, Settings, Shield, LineChart, Printer, Copy, MessageSquare } from 'lucide-react';


function RentasPageComponent({ tab }: { tab?: string }) {
  const defaultTab = tab || 'resumen';
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [workshopInfo, setWorkshopInfo] = useState<Partial<WorkshopInfo>>({});
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isEditNoteDialogOpen, setIsEditNoteDialogOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<RentalPayment | null>(null);


  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);

    unsubs.push(personnelService.onDriversUpdate(setDrivers));
    unsubs.push(inventoryService.onVehiclesUpdate(setVehicles));
    unsubs.push(operationsService.onVehicleExpensesUpdate(setExpenses));
    unsubs.push(operationsService.onRentalPaymentsUpdate((data) => {
        setPayments(data);
        setIsLoading(false);
    }));

    const storedInfo = localStorage.getItem('workshopTicketInfo');
    if (storedInfo) setWorkshopInfo(JSON.parse(storedInfo));

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  
  const [paymentForReceipt, setPaymentForReceipt] = useState<RentalPayment | null>(null);

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
  
  const handleCopyAsImage = useCallback(async () => {
    if (!receiptRef.current) return;
    try {
        const canvas = await html2canvas(receiptRef.current, { scale: 2.5, backgroundColor: null });
        canvas.toBlob((blob) => {
            if (blob) {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                toast({ title: "Copiado", description: "La imagen del recibo ha sido copiada." });
            }
        });
    } catch (e) {
        console.error("Error copying image:", e);
        toast({ title: "Error", description: "No se pudo copiar la imagen del recibo.", variant: "destructive" });
    }
  }, [toast]);
  
  const handlePrint = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };
  
  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => compareDesc(parseISO(a.paymentDate), parseISO(b.paymentDate)));
  }, [payments]);

  const uniqueOwners = useMemo(() => Array.from(new Set(vehicles.filter(v => v.isFleetVehicle).map(v => v.ownerName))).sort(), [vehicles]);

  const summaryData = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const paymentsThisMonth = payments.filter(p => isValid(parseISO(p.paymentDate)) && isWithinInterval(parseISO(p.paymentDate), { start: monthStart, end: monthEnd }));
    const totalCollected = paymentsThisMonth.reduce((sum, p) => sum + p.amount, 0);

    const expensesThisMonth = expenses.filter(e => isValid(parseISO(e.date)) && isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd }));
    const totalExpenses = expensesThisMonth.reduce((sum, e) => sum + e.amount, 0);

    const driverDebts = drivers.map(driver => ({
        ...driver,
        debt: calculateDriverDebt(driver, payments, vehicles).totalDebt
    }));
    
    const totalDebt = driverDebts.reduce((sum, d) => sum + d.debt, 0);
    const driverWithMostDebt = driverDebts.length > 0 ? driverDebts.reduce((prev, curr) => (prev.debt > curr.debt ? prev : curr)) : null;

    return { totalCollected, totalDebt, driverWithMostDebt, totalExpenses };
  }, [payments, drivers, vehicles, expenses]);

  
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
          <Button onClick={() => setIsPaymentDialogOpen(true)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Registrar Pago
          </Button>
      </div>
      
       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full mb-6">
                <TabsList className="h-auto flex flex-wrap w-full gap-2 sm:gap-4 p-0 bg-transparent">
                    <TabsTrigger value="resumen" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Resumen Mensual</TabsTrigger>
                    <TabsTrigger value="historial" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Historial de Pagos</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="resumen" className="space-y-6">
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Recaudado (Mes Actual)</CardTitle><DollarSign className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(summaryData.totalCollected)}</div><p className="text-xs text-muted-foreground">{format(new Date(), "MMMM yyyy", {locale: es})}</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Deuda Total Pendiente</CardTitle><AlertCircle className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{formatCurrency(summaryData.totalDebt)}</div><p className="text-xs text-muted-foreground">Suma de adeudos de todos los conductores.</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Mayor Deudor</CardTitle><User className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-xl font-bold truncate">{summaryData.driverWithMostDebt?.name || 'N/A'}</div><p className="text-xs text-muted-foreground">Debe {formatCurrency(summaryData.driverWithMostDebt?.debt || 0)}</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gastos de Flotilla (Mes)</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(summaryData.totalExpenses)}</div><p className="text-xs text-muted-foreground">Gastos de vehículos este mes.</p></CardContent></Card>
                </div>
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
                                        <TableCell>{p.registeredBy}</TableCell>
                                        <TableCell>{format(parseISO(p.paymentDate), "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                                        <TableCell className="font-semibold">{p.driverName}</TableCell>
                                        <TableCell>{p.vehicleLicensePlate}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(p.amount)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{p.note || 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => { setPaymentToEdit(p); setIsEditNoteDialogOpen(true); }}>
                                                <Edit className="h-4 w-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setPaymentForReceipt(p)}>
                                                <Printer className="h-4 w-4"/>
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
            <Button onClick={handleCopyAsImage} className="w-full bg-white hover:bg-gray-100 text-black border"><Copy className="mr-2 h-4 w-4"/>Copiar Imagen</Button>
            <Button onClick={() => {}} className="w-full bg-green-100 hover:bg-green-200 text-green-800"><MessageSquare className="mr-2 h-4 w-4" /> Enviar por WhatsApp</Button>
            <Button onClick={handlePrint} className="w-full"><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
          </>
        }
      >
        <div id="printable-ticket">
          {paymentForReceipt && <RentalReceiptContent ref={receiptRef} payment={paymentForReceipt} workshopInfo={workshopInfo} />}
        </div>
      </PrintTicketDialog>
    </>
  );
}

export { RentasPageComponent };

