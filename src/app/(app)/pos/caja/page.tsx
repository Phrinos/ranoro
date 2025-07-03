
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import {
  placeholderSales,
  placeholderServiceRecords,
  placeholderCashDrawerTransactions,
  placeholderInitialCashBalance,
  persistToFirestore,
  hydrateReady,
  AUTH_USER_LOCALSTORAGE_KEY
} from "@/lib/placeholder-data";
import type { SaleReceipt, ServiceRecord, CashDrawerTransaction, InitialCashBalance, User } from '@/types';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, isValid, startOfMonth, endOfMonth } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { CalendarIcon, DollarSign, ArrowUpCircle, ArrowDownCircle, Coins, Receipt, Wrench, BarChart2, Printer, Wallet } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn, formatCurrency } from '@/lib/utils';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { CorteDiaContent } from './components/corte-caja-content';


const cashTransactionSchema = z.object({
  concept: z.string().min(3, "El concepto debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});
type CashTransactionFormValues = z.infer<typeof cashTransactionSchema>;

export default function CajaPage() {
  const { toast } = useToast();
  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isInitialBalanceDialogOpen, setIsInitialBalanceDialogOpen] = useState(false);
  const [initialBalanceAmount, setInitialBalanceAmount] = useState<number | ''>('');

  const [isCorteDialogOpen, setIsCorteDialogOpen] = useState(false);

  useEffect(() => {
    hydrateReady.then(() => {
      setHydrated(true);
      setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
    });
    const forceUpdate = () => setVersion(v => v + 1);
    window.addEventListener('databaseUpdated', forceUpdate);
    return () => window.removeEventListener('databaseUpdated', forceUpdate);
  }, []);

  const summaryData = useMemo(() => {
    if (!hydrated || !dateRange?.from) {
      return {
        initialBalance: 0,
        totalCashSales: 0,
        totalCashIn: 0,
        totalCashOut: 0,
        finalCashBalance: 0,
        salesByPaymentMethod: {} as Record<string, number>,
        totalSales: 0,
        totalServices: 0,
      };
    }

    const start = startOfDay(dateRange.from);
    const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    const initialBalanceRecord = placeholderInitialCashBalance;
    const initialBalance = (initialBalanceRecord && isWithinInterval(parseISO(initialBalanceRecord.date), { start, end })) ? initialBalanceRecord.amount : 0;
    
    const transactionsInRange = placeholderCashDrawerTransactions.filter(t => {
        const tDate = parseISO(t.date);
        return isValid(tDate) && isWithinInterval(tDate, { start, end });
    });

    const salesInRange = placeholderSales.filter(s => {
        const sDate = parseISO(s.saleDate);
        return s.status !== 'Cancelado' && isValid(sDate) && isWithinInterval(sDate, { start, end });
    });

    const servicesInRange = placeholderServiceRecords.filter(s => {
        const sDate = s.deliveryDateTime ? parseISO(s.deliveryDateTime) : parseISO(s.serviceDate);
        return s.status === 'Completado' && isValid(sDate) && isWithinInterval(sDate, { start, end });
    });
    
    const totalCashSales = salesInRange
        .filter(s => s.paymentMethod === 'Efectivo' || s.paymentMethod === 'Efectivo+Transferencia')
        .reduce((sum, s) => sum + s.totalAmount, 0)
        + servicesInRange
        .filter(s => s.paymentMethod === 'Efectivo' || s.paymentMethod === 'Efectivo+Transferencia')
        .reduce((sum, s) => sum + s.totalCost, 0);

    const totalCashIn = transactionsInRange.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
    const totalCashOut = transactionsInRange.filter(t => t.type === 'Salida').reduce((sum, t) => sum + t.amount, 0);
    
    const finalCashBalance = initialBalance + totalCashSales + totalCashIn - totalCashOut;
    
    const salesByPaymentMethod: Record<string, number> = {};
    [...salesInRange, ...servicesInRange].forEach(op => {
      const method = op.paymentMethod || 'Efectivo';
      const amount = 'totalAmount' in op ? op.totalAmount : op.totalCost;
      salesByPaymentMethod[method] = (salesByPaymentMethod[method] || 0) + amount;
    });

    return {
      initialBalance,
      totalCashSales,
      totalCashIn,
      totalCashOut,
      finalCashBalance,
      salesByPaymentMethod,
      totalSales: salesInRange.length,
      totalServices: servicesInRange.length,
    };

  }, [hydrated, dateRange, version]);

  const handleSetInitialBalance = async () => {
    const amount = Number(initialBalanceAmount);
    if (isNaN(amount) || amount < 0) {
        toast({ title: 'Monto inválido', variant: 'destructive' });
        return;
    }
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;

    if (!currentUser) {
        toast({ title: 'Usuario no encontrado', variant: 'destructive' });
        return;
    }
    
    placeholderInitialCashBalance = {
      date: new Date().toISOString(),
      amount: amount,
      userId: currentUser.id,
      userName: currentUser.name,
    };
    
    await persistToFirestore(['initialCashBalance']);
    setVersion(v => v + 1); // Force re-render
    setIsInitialBalanceDialogOpen(false);
    toast({ title: 'Saldo Inicial Guardado' });
  };
  
  const handleAddTransaction = async (type: 'Entrada' | 'Salida', values: CashTransactionFormValues) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
    if (!currentUser) {
        toast({ title: 'Usuario no encontrado', variant: 'destructive' });
        return;
    }

    const newTransaction: CashDrawerTransaction = {
      id: `trx_${Date.now()}`,
      date: new Date().toISOString(),
      type: type,
      amount: values.amount,
      concept: values.concept,
      userId: currentUser.id,
      userName: currentUser.name,
    };
    
    placeholderCashDrawerTransactions.push(newTransaction);
    await persistToFirestore(['cashDrawerTransactions']);
    setVersion(v => v + 1);
    toast({ title: `${type} registrada` });
  };

  const setDateToToday = () => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  const setDateToThisWeek = () => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
  const setDateToThisMonth = () => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });

  return (
    <>
      <PageHeader
        title="Control de Caja"
        description="Visualiza y gestiona el flujo de efectivo diario."
        actions={
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsInitialBalanceDialogOpen(true)}>Saldo Inicial</Button>
                <Button onClick={() => setIsCorteDialogOpen(true)}><Printer className="mr-2 h-4 w-4"/> Corte de Caja</Button>
            </div>
        }
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
            <Button variant="secondary" onClick={setDateToToday}>Hoy</Button>
            <Button variant="secondary" onClick={setDateToThisWeek}>Esta Semana</Button>
            <Button variant="secondary" onClick={setDateToThisMonth}>Este Mes</Button>
        </div>
        <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full sm:w-auto justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y", {locale:es})} - {format(dateRange.to, "LLL dd, y", {locale:es})}</>) : format(dateRange.from, "LLL dd, y",{locale:es})) : (<span>Seleccione rango</span>)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/></PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="text-primary"/>Cajón de Dinero</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-lg">
            <div className="flex justify-between"><span>Saldo Inicial:</span> <span className="font-medium">{formatCurrency(summaryData.initialBalance)}</span></div>
            <div className="flex justify-between text-green-600"><span>(+) Ventas en Efectivo:</span> <span className="font-medium">{formatCurrency(summaryData.totalCashSales)}</span></div>
            <div className="flex justify-between text-green-600"><span>(+) Entradas de Efectivo:</span> <span className="font-medium">{formatCurrency(summaryData.totalCashIn)}</span></div>
            <div className="flex justify-between text-red-600"><span>(-) Salidas de Efectivo:</span> <span className="font-medium">{formatCurrency(summaryData.totalCashOut)}</span></div>
            <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2"><span>Saldo Final Esperado:</span> <span>{formatCurrency(summaryData.finalCashBalance)}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Coins className="text-primary"/>Ventas por Método de Pago</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {Object.entries(summaryData.salesByPaymentMethod).map(([method, total]) => (
                <div key={method} className="flex justify-between"><span>{method}:</span><span className="font-medium">{formatCurrency(total)}</span></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 className="text-primary"/>Ventas por Tipo</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Ventas de Mostrador (POS):</span><span className="font-medium">{summaryData.totalSales}</span></div>
            <div className="flex justify-between"><span>Servicios Completados:</span><span className="font-medium">{summaryData.totalServices}</span></div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpCircle className="text-green-600"/>Registrar Entrada de Efectivo</CardTitle></CardHeader>
          <CardContent><CashTransactionForm type="Entrada" onSubmit={handleAddTransaction} /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><ArrowDownCircle className="text-red-600"/>Registrar Salida de Efectivo</CardTitle></CardHeader>
          <CardContent><CashTransactionForm type="Salida" onSubmit={handleAddTransaction} /></CardContent>
        </Card>
      </div>

      <Dialog open={isInitialBalanceDialogOpen} onOpenChange={setIsInitialBalanceDialogOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Establecer Saldo Inicial de Caja</DialogTitle><DialogDescription>Ingresa la cantidad con la que inicias el día.</DialogDescription></DialogHeader>
              <div className="py-4"><Input type="number" placeholder="Ej: 500.00" value={initialBalanceAmount} onChange={(e) => setInitialBalanceAmount(Number(e.target.value))}/></div>
              <DialogFooter><Button onClick={handleSetInitialBalance}>Guardar Saldo Inicial</Button></DialogFooter>
          </DialogContent>
      </Dialog>
      
      <PrintTicketDialog open={isCorteDialogOpen} onOpenChange={setIsCorteDialogOpen} title="Corte de Caja" dialogContentClassName="printable-content">
        <CorteDiaContent
            reportData={summaryData}
            date={dateRange?.from || new Date()}
            transactions={placeholderCashDrawerTransactions.filter(t => isWithinInterval(parseISO(t.date), {start: dateRange?.from!, end: dateRange?.to!}))}
        />
      </PrintTicketDialog>
    </>
  );
}

function CashTransactionForm({ type, onSubmit }: { type: 'Entrada' | 'Salida', onSubmit: (type: 'Entrada' | 'Salida', values: CashTransactionFormValues) => void }) {
  const form = useForm<CashTransactionFormValues>({ resolver: zodResolver(cashTransactionSchema) });
  const { handleSubmit, reset } = form;

  const onFormSubmit = (data: CashTransactionFormValues) => {
    onSubmit(type, data);
    reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <FormField control={form.control} name="concept" render={({field}) => (
            <FormItem><FormLabel>Concepto</FormLabel><FormControl><Textarea placeholder={type === 'Entrada' ? 'Ej: Fondo de caja' : 'Ej: Compra de insumos'} {...field}/></FormControl><FormMessage/></FormItem>
        )}/>
        <FormField control={form.control} name="amount" render={({field}) => (
            <FormItem><FormLabel>Monto</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <Button type="submit" className="w-full">Registrar {type}</Button>
      </form>
    </Form>
  )
}
