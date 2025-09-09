
"use client";

import React, { useMemo, useState } from 'react';
import type { Driver, Vehicle, RentalPayment, ManualDebtEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isAfter, startOfDay, eachDayOfInterval, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, PlusCircle, HandCoins, Edit, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface Transaction {
  date: Date;
  description: string;
  charge: number;
  payment: number;
  balance: number;
  isPayment: boolean;
  isManualDebt: boolean;
  originalDebt?: ManualDebtEntry;
}

interface BalanceTabContentProps {
  driver: Driver;
  vehicle: Vehicle | null;
  payments: RentalPayment[];
  onAddDebt: () => void;
  onRegisterPayment: () => void;
  onDeleteDebt: (debtId: string) => void;
  onEditDebt: (debt: ManualDebtEntry) => void;
}

export default function BalanceTabContent({ 
  driver, 
  vehicle, 
  payments,
  onAddDebt,
  onRegisterPayment,
  onDeleteDebt,
  onEditDebt,
}: BalanceTabContentProps) {
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  const { transactions, totalBalance, depositDebt } = useMemo(() => {
    let balance = 0;
    const allTransactions: Transaction[] = [];

    // 1. Calculate Initial Deposit Debt
    const depositOwed = (driver.requiredDepositAmount || 0) - (driver.depositAmount || 0);
    if (depositOwed > 0) {
      balance -= depositOwed;
      allTransactions.push({
        date: driver.contractDate ? parseISO(driver.contractDate) : new Date(),
        description: 'Adeudo de depósito inicial',
        charge: depositOwed,
        payment: 0,
        balance: balance,
        isPayment: false,
        isManualDebt: true,
      });
    }
    
    // 2. Filter payments and manual debts based on the selected date range
    const from = dateRange?.from ? startOfDay(dateRange.from) : new Date('2000-01-01');
    const to = dateRange?.to ? endOfDay(dateRange.to) : new Date();
    const interval = { start: from, end: to };

    const paymentTransactions: Transaction[] = payments
      .filter(p => isWithinInterval(parseISO(p.paymentDate), interval))
      .map(p => ({
        date: parseISO(p.paymentDate),
        description: p.note || 'Pago de Renta',
        charge: 0,
        payment: p.amount,
        balance: 0,
        isPayment: true,
        isManualDebt: false,
      }));

    const manualDebtTransactions: Transaction[] = (driver.manualDebts || [])
      .filter(d => isWithinInterval(parseISO(d.date), interval))
      .map(d => ({
        date: parseISO(d.date),
        description: d.note,
        charge: d.amount,
        payment: 0,
        balance: 0,
        isPayment: false,
        isManualDebt: true,
        originalDebt: d,
      }));


    // 3. Generate daily rental charges only for the selected date range
    const dailyCharges: Transaction[] = [];
    if (vehicle && driver.contractDate && vehicle.dailyRentalCost) {
      const contractStart = parseISO(driver.contractDate);
      const effectiveStart = isAfter(contractStart, from) ? contractStart : from;
      
      if (isAfter(to, effectiveStart)) {
        const rentalInterval = eachDayOfInterval({ start: effectiveStart, end: to });
        rentalInterval.forEach(day => {
          dailyCharges.push({
            date: day,
            description: `Renta diaria (${format(day, 'dd MMM', { locale: es })})`,
            charge: vehicle.dailyRentalCost as number,
            payment: 0,
            balance: 0,
            isPayment: false,
            isManualDebt: false,
          });
        });
      }
    }


    // 4. Combine and sort all transactions
    const sortedTransactions = [...dailyCharges, ...paymentTransactions, ...manualDebtTransactions]
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // 5. Calculate running balance
    sortedTransactions.forEach(t => {
      balance += t.payment - t.charge;
      t.balance = balance;
    });
    
    // Add the initial deposit debt to the start of the visible transactions if it falls in range
    const displayTransactions = [...allTransactions, ...sortedTransactions].sort((a,b) => b.date.getTime() - a.date.getTime());

    return { 
      transactions: displayTransactions,
      totalBalance: balance,
      depositDebt: depositOwed,
    };

  }, [driver, vehicle, payments, dateRange]);


  return (
    <div className="space-y-6">
      <Card className="lg:col-span-1 bg-amber-50 dark:bg-amber-900/50 border-amber-200">
        <CardHeader>
            <CardTitle className="text-lg text-amber-900 dark:text-amber-200">Balance Total</CardTitle>
            <CardDescription className="text-amber-800 dark:text-amber-300">Resumen del estado de cuenta general del conductor.</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
            <div>
                <p className="text-sm font-medium text-muted-foreground">SALDO TOTAL</p>
                <p className={cn("text-3xl font-bold", totalBalance >= 0 ? "text-green-600" : "text-destructive")}>
                    {formatCurrency(totalBalance)}
                </p>
                {depositDebt > 0 && (
                    <p className="text-xs text-muted-foreground">(Incluye adeudo de depósito de {formatCurrency(depositDebt)})</p>
                )}
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Historial de Movimientos</CardTitle>
            <CardDescription>Registro cronológico de todos los cargos y pagos.</CardDescription>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full sm:w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}` : format(dateRange.from, "dd/MM/yy")) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} />
              </PopoverContent>
            </Popover>
            <div className="flex gap-2">
              <Button onClick={onAddDebt} variant="destructive" size="sm" className="flex-1">
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cargo
              </Button>
              <Button onClick={onRegisterPayment} size="sm" className="flex-1">
                  <HandCoins className="mr-2 h-4 w-4" /> Registrar Pago
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-black"><TableRow>
                  <TableHead className="text-white">Fecha</TableHead>
                  <TableHead className="text-white">Descripción</TableHead>
                  <TableHead className="text-right text-white">Cargo</TableHead>
                  <TableHead className="text-right text-white">Abono</TableHead>
                  <TableHead className="text-right text-white">Balance</TableHead>
                  <TableHead className="text-right text-white">Acciones</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {transactions.length > 0 ? (
                    transactions.map((t, index) => (
                      <TableRow key={index}>
                        <TableCell>{format(t.date, "dd MMM yyyy", { locale: es })}</TableCell>
                        <TableCell>
                          {t.description}
                          {t.isPayment && <Badge variant="success" className="ml-2">Pago</Badge>}
                          {t.isManualDebt && <Badge variant="destructive" className="ml-2">Cargo Manual</Badge>}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {t.charge > 0 ? formatCurrency(t.charge) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {t.payment > 0 ? formatCurrency(t.payment) : '-'}
                        </TableCell>
                        <TableCell className={cn("text-right font-bold", t.balance >= 0 ? "text-green-700" : "text-red-700")}>
                          {formatCurrency(t.balance)}
                        </TableCell>
                        <TableCell className="text-right">
                          {t.isManualDebt && t.originalDebt && (
                            <>
                              <Button variant="ghost" size="icon" className="mr-2" onClick={() => onEditDebt(t.originalDebt!)}><Edit className="h-4 w-4" /></Button>
                              <ConfirmDialog
                                triggerButton={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                                title="¿Eliminar Adeudo?"
                                description={`Se eliminará el cargo de "${t.description}" por ${formatCurrency(t.charge)}. Esta acción no se puede deshacer.`}
                                onConfirm={() => onDeleteDebt(t.originalDebt!.id)}
                              />
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No hay movimientos registrados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
