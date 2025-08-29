
"use client";

import React, { useMemo } from 'react';
import type { Driver, Vehicle, RentalPayment, ManualDebtEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isAfter, startOfDay, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, PlusCircle, HandCoins, Edit, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

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

    // 2. Generate daily rental charges
    const dailyCharges: Transaction[] = [];
    if (vehicle && driver.contractDate && vehicle.dailyRentalCost) {
      const startDate = parseISO(driver.contractDate);
      const today = startOfDay(new Date());

      if (isAfter(today, startDate) || isAfter(startDate, today)) {
        const interval = eachDayOfInterval({ start: startDate, end: today });
        interval.forEach(day => {
          dailyCharges.push({
            date: day,
            description: `Renta diaria (${format(day, 'dd MMM', { locale: es })})`,
            charge: vehicle.dailyRentalCost as number,
            payment: 0,
            balance: 0, // will be calculated later
            isPayment: false,
            isManualDebt: false,
          });
        });
      }
    }

    // 3. Format payments and manual debts
    const paymentTransactions: Transaction[] = payments.map(p => ({
      date: parseISO(p.paymentDate),
      description: p.note || 'Pago de Renta',
      charge: 0,
      payment: p.amount,
      balance: 0,
      isPayment: true,
      isManualDebt: false,
    }));

    const manualDebtTransactions: Transaction[] = (driver.manualDebts || []).map(d => ({
      date: parseISO(d.date),
      description: d.note,
      charge: d.amount,
      payment: 0,
      balance: 0,
      isPayment: false,
      isManualDebt: true,
      originalDebt: d,
    }));

    // 4. Combine and sort all transactions
    const sortedTransactions = [...dailyCharges, ...paymentTransactions, ...manualDebtTransactions]
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // 5. Calculate running balance
    sortedTransactions.forEach(t => {
      balance += t.payment - t.charge;
      t.balance = balance;
    });

    return { 
      transactions: [...allTransactions, ...sortedTransactions].sort((a,b) => b.date.getTime() - a.date.getTime()), 
      totalBalance: balance,
      depositDebt: depositOwed,
    };

  }, [driver, vehicle, payments]);


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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Historial de Movimientos</CardTitle>
            <CardDescription>Registro cronológico de todos los cargos y pagos.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={onAddDebt} variant="destructive" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cargo
            </Button>
            <Button onClick={onRegisterPayment} size="sm">
                <HandCoins className="mr-2 h-4 w-4" /> Registrar Pago
            </Button>
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

