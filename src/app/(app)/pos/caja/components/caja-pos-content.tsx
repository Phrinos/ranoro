

"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Printer, Pencil, Trash2, CalendarIcon as CalendarDateIcon, DollarSign } from "lucide-react";
import type { SaleReceipt, ServiceRecord, CashDrawerTransaction, InitialCashBalance, User } from "@/types";
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parseISO, isSameDay, subDays, startOfWeek, startOfMonth, compareDesc, endOfMonth } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { cn, formatCurrency } from "@/lib/utils";
import { operationsService } from '@/lib/services';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CorteDiaContent } from '../../caja/components/corte-caja-content';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { db } from '@/lib/firebaseClient.js';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { parseDate } from '@/lib/forms';


const cashTransactionSchema = z.object({
  concept: z.string().min(3, "El concepto debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});
type CashTransactionFormValues = z.infer<typeof cashTransactionSchema>;


function CashTransactionForm({ type, onSubmit }: { type: 'Entrada' | 'Salida', onSubmit: (type: 'Entrada' | 'Salida', values: CashTransactionFormValues) => void }) {
  const form = useForm<CashTransactionFormValues>({ resolver: zodResolver(cashTransactionSchema), defaultValues: {concept: '', amount: undefined} });
  const { handleSubmit, reset } = form;
  const onFormSubmit = (data: CashTransactionFormValues) => {
    onSubmit(type, data);
    reset();
  };
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="concept"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Concepto</FormLabel>
              <FormControl>
                <Textarea placeholder={type === 'Entrada' ? 'Fondo de caja' : 'Compra de insumos'} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Registrar {type}</Button>
      </form>
    </Form>
  )
}

function TransactionsList({ transactions, onDelete, currentUser }: { transactions: CashDrawerTransaction[], onDelete: (id: string) => void, currentUser: User | null }) {
    if (!transactions.length) {
        return <div className="text-center text-muted-foreground p-4">No hay transacciones manuales hoy.</div>;
    }
    return (
        <Table>
            <TableBody>
                {transactions.map(t => (
                    <TableRow key={t.id}>
                        <TableCell>
                            <p className={cn("font-semibold", t.type === 'Entrada' ? 'text-green-600' : 'text-red-600')}>{t.type}</p>
                            <p className="text-xs text-muted-foreground">{t.concept}</p>
                        </TableCell>
                        <TableCell className="text-right">
                            <p className="font-bold">{formatCurrency(t.amount)}</p>
                            <p className="text-xs text-muted-foreground">{t.userName}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          {!t.relatedType && currentUser?.role === 'Superadministrador' && (
                            <ConfirmDialog
                              triggerButton={<Button variant="ghost" size="icon" title="Eliminar Transacción"><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                              title="¿Eliminar Transacción?"
                              description={`Se eliminará la transacción por ${formatCurrency(t.amount)}. Esta acción no se puede deshacer.`}
                              onConfirm={() => onDelete(t.id)}
                            />
                          )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}


interface CajaPosContentProps {
  allCashOperations: CashDrawerTransaction[];
  initialCashBalance: InitialCashBalance | null;
}

export function CajaPosContent({ allCashOperations, initialCashBalance: dailyInitialBalance }: CajaPosContentProps) {
  const { toast } = useToast();
  const [date, setDate] = useState(startOfDay(new Date()));
  const [isInitialBalanceDialogOpen, setIsInitialBalanceDialogOpen] = useState(false);
  const [initialBalanceAmount, setInitialBalanceAmount] = useState<number | ''>('');
  const [isCorteDialogOpen, setIsCorteDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (authUserString) {
      try {
        setCurrentUser(JSON.parse(authUserString));
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
      }
    }
  }, []);

  const cajaSummaryData = useMemo(() => {
    const startOfSelectedDate = startOfDay(date);
    const endOfSelectedDate = endOfDay(date);
    
    const transactionsInSelectedDay = allCashOperations.filter(t => {
      const transactionDate = parseDate(t.date);
      return transactionDate && isValid(transactionDate) && isWithinInterval(transactionDate, { start: startOfSelectedDate, end: endOfSelectedDate });
    });

    const dailyBalanceDoc = dailyInitialBalance && isSameDay(parseDate(dailyInitialBalance.date)!, startOfSelectedDate) ? dailyInitialBalance : null;
    const dailyInitial = dailyBalanceDoc?.amount || 0;
    
    const dailyCashIn = transactionsInSelectedDay.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
    const dailyCashOut = transactionsInSelectedDay.filter(t => t.type === 'Salida').reduce((sum, t) => sum + t.amount, 0);
    
    const finalDailyBalance = dailyInitial + dailyCashIn - dailyCashOut;
    
    const salesByPaymentMethod: Record<string, number> = {};
    transactionsInSelectedDay.forEach(t => {
        if(t.type === 'Entrada') {
            const method = t.relatedType === 'Venta' ? 'Venta POS' : t.relatedType === 'Servicio' ? 'Servicio' : 'Manual';
            salesByPaymentMethod[method] = (salesByPaymentMethod[method] || 0) + t.amount;
        }
    });

    return { 
        initialBalance: dailyInitial,
        totalCashIn: dailyCashIn, 
        totalCashOut: dailyCashOut, 
        finalCashBalance: finalDailyBalance,
        salesByPaymentMethod: salesByPaymentMethod,
        totalSales: transactionsInSelectedDay.filter(t=>t.relatedType === 'Venta').length,
        totalServices: transactionsInSelectedDay.filter(t=>t.relatedType === 'Servicio').length,
    };
  }, [date, allCashOperations, dailyInitialBalance]);
  
  const totalCashInMonth = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const transactionsInMonth = allCashOperations.filter(t => {
      const transactionDate = parseDate(t.date);
      return transactionDate && isValid(transactionDate) && isWithinInterval(transactionDate, { start: monthStart, end: monthEnd });
    });
    
    const cashIn = transactionsInMonth.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
    const cashOut = transactionsInMonth.filter(t => t.type === 'Salida').reduce((sum, t) => sum + t.amount, 0);

    return cashIn - cashOut;

  }, [allCashOperations]);
  
  const manualCashMovements = useMemo(() => {
    const start = startOfDay(date);
    const end = endOfDay(date);
    return allCashOperations
        .filter(t => {
          const tDate = parseDate(t.date);
          return tDate && isWithinInterval(tDate, { start, end }) && !t.relatedType
        })
        .sort((a,b) => compareDesc(parseDate(a.date)!, parseDate(b.date)!));
  }, [date, allCashOperations]);

  const transactionsForCorte = useMemo(() => {
    const start = startOfDay(date);
    const end = endOfDay(date);
    return allCashOperations
      .filter(t => {
        const transactionDate = parseDate(t.date);
        return transactionDate && isValid(transactionDate) && isWithinInterval(transactionDate, { start, end });
      })
      .sort((a,b) => compareDesc(parseDate(a.date)!, parseDate(b.date)!));
  }, [date, allCashOperations]);


  const handleSetInitialBalance = useCallback(async () => {
    if (initialBalanceAmount === '' || Number(initialBalanceAmount) < 0) return;
    
    const balanceData = {
      date: startOfDay(date).toISOString(),
      amount: Number(initialBalanceAmount),
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'Sistema',
    };
    
    // We create a separate transaction for the initial balance to ensure it appears in the log
    // and contributes to the daily total.
    const transactionData = {
        date: startOfDay(date).toISOString(), // Make sure it's at the beginning of the day
        type: 'Entrada' as const,
        amount: Number(initialBalanceAmount),
        concept: 'Saldo Inicial de Caja',
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Sistema',
        relatedType: 'InitialBalance' as const,
        relatedId: format(date, 'yyyy-MM-dd')
    };

    await Promise.all([
      operationsService.setInitialCashBalance(balanceData),
      operationsService.addCashTransaction(transactionData)
    ]);

    setIsInitialBalanceDialogOpen(false);
    setInitialBalanceAmount('');
    toast({ title: 'Saldo Inicial Guardado' });
  }, [initialBalanceAmount, toast, date, currentUser]);
  
  const handleAddTransaction = useCallback(async (type: 'Entrada' | 'Salida', values: CashTransactionFormValues) => {
    
    await operationsService.addCashTransaction({
      type,
      amount: values.amount,
      concept: values.concept,
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'Sistema',
    });
    toast({ title: `Se registró una ${type.toLowerCase()} de caja.` });
  }, [toast, currentUser]);
  
  const handleDeleteTransaction = useCallback(async (transactionId: string) => {
    if (currentUser?.role !== 'Superadministrador') {
      toast({ title: 'Permiso Denegado', description: 'No tiene permiso para eliminar transacciones.', variant: 'destructive' });
      return;
    }
    await operationsService.deleteCashTransaction(transactionId);
    toast({ title: `Transacción eliminada.` });
  }, [toast, currentUser]);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Gestión de Caja</h2>
          <p className="text-muted-foreground">Controla el flujo de efectivo para la fecha seleccionada.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setDate(startOfDay(new Date()))} className="bg-card">Hoy</Button>
            <Button variant="outline" size="sm" onClick={() => setDate(startOfDay(subDays(new Date(), 1)))} className="bg-card">Ayer</Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-full sm:w-auto justify-start text-left font-normal bg-card">
                  <CalendarDateIcon className="mr-2 h-4 w-4" />
                  {format(date, "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><Wallet className="text-primary"/>Cajón de Dinero</CardTitle>
                <CardDescription>Resumen del día</CardDescription>
              </div>
              <Button onClick={() => setIsCorteDialogOpen(true)}><Printer className="mr-2 h-4 w-4"/> Corte</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted border text-center">
              <p className="text-sm font-medium text-muted-foreground">DINERO EN CAJA (ESTE MES)</p>
              <p className="text-4xl font-bold text-primary">{formatCurrency(totalCashInMonth)}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Saldo Inicial del día:</span> 
                <div className="flex items-center gap-1">
                  <span className="font-medium">{formatCurrency(cajaSummaryData.initialBalance)}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsInitialBalanceDialogOpen(true)}><Pencil className="h-3 w-3"/></Button>
                </div>
              </div>
              <div className="flex justify-between items-center text-green-600"><span>(+) Entradas del día:</span> <span className="font-medium">{formatCurrency(cajaSummaryData.totalCashIn)}</span></div>
              <div className="flex justify-between items-center text-red-600"><span>(-) Salidas del día:</span> <span className="font-medium">{formatCurrency(cajaSummaryData.totalCashOut)}</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <Card><CardHeader><CardTitle className="flex items-center gap-2 text-green-600"><ArrowUpCircle/>Registrar Entrada</CardTitle></CardHeader><CardContent><CashTransactionForm type="Entrada" onSubmit={handleAddTransaction} /></CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center gap-2 text-red-600"><ArrowDownCircle/>Registrar Salida</CardTitle></CardHeader><CardContent><CashTransactionForm type="Salida" onSubmit={handleAddTransaction} /></CardContent></Card>
            </div>
             <Card>
              <CardHeader><CardTitle>Transacciones Manuales del Día</CardTitle></CardHeader>
              <CardContent>
                <TransactionsList transactions={manualCashMovements} onDelete={handleDeleteTransaction} currentUser={currentUser} />
              </CardContent>
            </Card>
        </div>
      </div>

      <Dialog open={isInitialBalanceDialogOpen} onOpenChange={setIsInitialBalanceDialogOpen}>
        <DialogContent className="sm:max-w-md p-6 space-y-4">
          <DialogHeader className="text-left">
            <DialogTitle>Saldo Inicial de Caja</DialogTitle>
            <DialogDescription>
              Ingrese la cantidad de efectivo con la que inicia la caja para el día{" "}
              <strong>{format(date, "dd/MM/yyyy", { locale: es })}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="initial-balance">Monto Inicial</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="initial-balance" type="number" placeholder="500.00" value={initialBalanceAmount} onChange={(e) => setInitialBalanceAmount(e.target.value === '' ? '' : Number(e.target.value))} className="pl-8"/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInitialBalanceDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSetInitialBalance}>Guardar Saldo Inicial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <PrintTicketDialog open={isCorteDialogOpen} onOpenChange={setIsCorteDialogOpen} title="Corte de Caja">
         <CorteDiaContent
            reportData={cajaSummaryData}
            date={date}
            transactions={transactionsForCorte}
          />
      </PrintTicketDialog>
    </>
  );
}



    






