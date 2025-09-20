
// src/app/(app)/flotilla/caja/components/FlotillaCajaTab.tsx
"use client";

import React, { useMemo, useState } from 'react';
import type { RentalPayment, OwnerWithdrawal, VehicleExpense, Driver, Vehicle, ManualDebtEntry, PaymentMethod } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn, capitalizeWords } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer, Wallet, CreditCard, Landmark, TrendingDown as TrendingDownIcon, Wrench } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';

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
  handleShowTicket: (payment: RentalPayment) => void;
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
    onAddWithdrawal,
    onAddExpense,
    handleShowTicket
}: FlotillaCajaTabProps) {
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [sortOption, setSortOption] = useState('date_desc');

  const { transactions, summary } = useMemo(() => {
    const paymentsWithDate = payments.filter(p => p.paymentDate).map(p => ({ ...p, date: p.paymentDate })) as Array<RentalPayment & { date: string }>;
    const withdrawalsWithDate = withdrawals.filter(w => w.date).map(w => ({ ...w, date: w.date })) as Array<OwnerWithdrawal & { date: string }>;
    const expensesWithDate = expenses.filter(e => e.date).map(e => ({ ...e, date: e.date })) as Array<VehicleExpense & { date: string }>;
  
    const filterByMonth = <T extends { date: string }>(items: T[]): T[] => {
      if (selectedMonth === 'all') return items;
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(startDate);
      return items.filter(item => {
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
  
    const [key, direction] = sortOption.split('_');
    allTransactions.sort((a, b) => {
        const valA = a[key as keyof CashBoxTransaction] || '';
        const valB = b[key as keyof CashBoxTransaction] || '';
        const comparison = String(valA).localeCompare(String(valB), 'es', { numeric: true });
        return direction === 'asc' ? comparison : -comparison;
    });
  
    const totalCash = monthlyPayments.filter(p => p.paymentMethod === 'Efectivo').reduce((sum, p) => sum + p.amount, 0);
    const totalTransfers = monthlyPayments.filter(p => p.paymentMethod === 'Transferencia').reduce((sum, p) => sum + p.amount, 0);
    const totalWithdrawals = monthlyWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const cashBalance = totalCash - totalWithdrawals - totalExpenses;
  
    return {
      transactions: allTransactions,
      summary: { totalBalance: cashBalance, totalWithdrawals, totalExpenses, totalCash, totalTransfers, totalIncome: totalCash + totalTransfers },
    };
  }, [payments, withdrawals, expenses, selectedMonth, sortOption]);

  const currentCashBalance = useMemo(() => {
      const totalCashIncome = payments.filter(p => p.paymentMethod === 'Efectivo' && p.paymentDate).reduce((sum, p) => sum + p.amount, 0);
      const totalWithdrawals = withdrawals.filter(w => w.date).reduce((sum, w) => sum + w.amount, 0);
      const totalExpenses = expenses.filter(e => e.date).reduce((sum, e) => sum + e.amount, 0);
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
  
  const handleSort = (key: string) => {
    const isAsc = sortOption === `${key}_asc`;
    setSortOption(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 flex-wrap">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full sm:w-auto bg-card"><SelectValue placeholder="Seleccionar mes..." /></SelectTrigger>
          <SelectContent>{monthOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
        </Select>
        <Button onClick={onAddWithdrawal} variant="outline" className="w-full sm:w-auto bg-white border-red-500 text-black font-bold hover:bg-red-50"><TrendingDownIcon className="mr-2 h-4 w-4 text-red-500" /> Retiro</Button>
        <Button onClick={onAddExpense} variant="outline" className="w-full sm:w-auto bg-white border-red-500 text-black font-bold hover:bg-red-50"><Wrench className="mr-2 h-4 w-4 text-red-500" /> Gasto</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-lg"><CardHeader><CardTitle>Total de Ingresos (Mensual)</CardTitle><CardDescription>Suma de todos los ingresos del mes seleccionado.</CardDescription></CardHeader><CardContent><div className="text-4xl font-bold text-center text-black">{formatCurrency(summary.totalIncome)}</div></CardContent></Card>
          <Card className="shadow-lg"><CardHeader><CardTitle>Balance de Caja (Mensual)</CardTitle><CardDescription>Balance de efectivo del mes seleccionado.</CardDescription></CardHeader><CardContent><div className={cn("text-4xl font-bold text-center", summary.totalBalance >= 0 ? 'text-green-600' : 'text-destructive')}>{formatCurrency(summary.totalBalance)}</div></CardContent></Card>
          <Card className="shadow-lg"><CardHeader><CardTitle>Balance de Caja (Actual)</CardTitle><CardDescription>Dinero total disponible en caja.</CardDescription></CardHeader><CardContent><div className={cn("text-4xl font-bold text-center", currentCashBalance >= 0 ? 'text-blue-600' : 'text-destructive')}>{formatCurrency(currentCashBalance)}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Wallet className="h-4 w-4 text-green-600"/>Ingresos Efectivo</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalCash)}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Landmark className="h-4 w-4 text-blue-600"/>Ingresos Transferencia</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalTransfers)}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingDownIcon className="h-4 w-4 text-red-500"/>Total Retiros</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-500">{formatCurrency(summary.totalWithdrawals)}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Wrench className="h-4 w-4 text-orange-500"/>Total Gastos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-500">{formatCurrency(summary.totalExpenses)}</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Movimientos de Caja</CardTitle><CardDescription>Historial de todos los ingresos y salidas de dinero del mes seleccionado.</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <SortableTableHeader sortKey="date" label="Fecha" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="transactionType" label="Tipo" onSort={handleSort} currentSort={sortOption} className="hidden md:table-cell" textClassName="text-white" />
                  <SortableTableHeader sortKey="description" label="Descripción" onSort={handleSort} currentSort={sortOption} className="hidden md:table-cell" textClassName="text-white" />
                  <SortableTableHeader sortKey="paymentMethod" label="Método" onSort={handleSort} currentSort={sortOption} className="text-center hidden md:table-cell" textClassName="text-white" />
                  <SortableTableHeader sortKey="amount" label="Monto" onSort={handleSort} currentSort={sortOption} className="text-right" textClassName="text-white" />
                  <div className="text-right text-white font-bold">Acciones</div>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map(t => {
                    const details = getTransactionDetails(t);
                    return (
                      <TableRow key={`${t.transactionType}-${t.id}`}>
                        <TableCell className="w-24">{format(parseISO(t.date), "dd MMM, HH:mm", { locale: es })}</TableCell>
                        <TableCell className="md:hidden"><div className="flex flex-col"><Badge variant={details.variant as any} className="w-min">{details.label}</Badge><span className="text-xs text-muted-foreground mt-1">{details.description}</span></div></TableCell>
                        <TableCell className="hidden md:table-cell"><Badge variant={details.variant as any}>{details.label}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell">{details.description}</TableCell>
                        <TableCell className="text-center hidden md:table-cell">{details.methodName !== 'N/A' && (<TooltipProvider><Tooltip><TooltipTrigger><div className="flex items-center justify-center">{details.methodIcon}</div></TooltipTrigger><TooltipContent><p>{details.methodName}</p></TooltipContent></Tooltip></TooltipProvider>)}</TableCell>
                        <TableCell className={cn("text-right font-semibold", details.variant === 'success' ? 'text-green-600' : details.variant === 'info' ? 'text-blue-600' : 'text-destructive')}>{details.variant !== 'destructive' && details.variant !== 'secondary' ? '+' : '-'} {formatCurrency(t.amount)}</TableCell>
                        <TableCell className="text-right">{t.transactionType === 'income' && (<Button variant="ghost" size="icon" onClick={() => handleShowTicket(t as RentalPayment)}><Printer className="h-4 w-4"/></Button>)}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No hay movimientos de caja para el mes seleccionado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
