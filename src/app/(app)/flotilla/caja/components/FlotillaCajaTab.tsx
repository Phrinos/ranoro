// src/app/(app)/flotilla/caja/components/FlotillaCajaTab.tsx
"use client";

import React, { useMemo } from 'react';
import type { RentalPayment, OwnerWithdrawal, VehicleExpense } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

type CashBoxTransaction = 
    | (RentalPayment & { transactionType: 'income' })
    | (OwnerWithdrawal & { transactionType: 'withdrawal' })
    | (VehicleExpense & { transactionType: 'expense' });

interface FlotillaCajaTabProps {
  payments: RentalPayment[];
  withdrawals: OwnerWithdrawal[];
  expenses: VehicleExpense[];
  onAddWithdrawal: () => void;
  onAddExpense: () => void;
}

export function FlotillaCajaTab({ payments, withdrawals, expenses, onAddWithdrawal, onAddExpense }: FlotillaCajaTabProps) {

  const { transactions, totalBalance } = useMemo(() => {
    const allTransactions: CashBoxTransaction[] = [
      ...payments.map(p => ({ ...p, transactionType: 'income' as const, date: p.paymentDate })),
      ...withdrawals.map(w => ({ ...w, transactionType: 'withdrawal' as const })),
      ...expenses.map(e => ({ ...e, transactionType: 'expense' as const })),
    ];

    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let balance = 0;
    payments.forEach(p => balance += p.amount);
    withdrawals.forEach(w => balance -= w.amount);
    expenses.forEach(e => balance -= e.amount);

    return {
      transactions: allTransactions,
      totalBalance: balance,
    };
  }, [payments, withdrawals, expenses]);

  const getTransactionDetails = (t: CashBoxTransaction) => {
    switch (t.transactionType) {
      case 'income':
        return { variant: 'success', label: 'Ingreso', description: `Pago de ${t.driverName}` };
      case 'withdrawal':
        return { variant: 'destructive', label: 'Retiro', description: `Retiro de ${t.ownerName}` };
      case 'expense':
        return { variant: 'secondary', label: 'Gasto', description: `${t.description} (${t.vehicleLicensePlate})` };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button onClick={onAddWithdrawal} variant="outline" className="bg-white border-red-500 text-black font-bold hover:bg-red-50">
          <ArrowDown className="mr-2 h-4 w-4 text-red-500" /> Retiro
        </Button>
        <Button onClick={onAddExpense} variant="outline" className="bg-white border-red-500 text-black font-bold hover:bg-red-50">
          <ArrowDown className="mr-2 h-4 w-4 text-red-500" /> Gasto
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Balance de Caja</CardTitle>
          <CardDescription>Saldo actual de la caja de la flotilla.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn("text-3xl font-bold text-center", totalBalance >= 0 ? 'text-green-600' : 'text-destructive')}>
            {formatCurrency(totalBalance)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Caja</CardTitle>
          <CardDescription>Historial de todos los ingresos y salidas de dinero.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white font-bold">Fecha</TableHead>
                  <TableHead className="text-white font-bold">Tipo</TableHead>
                  <TableHead className="text-white font-bold">Descripción</TableHead>
                  <TableHead className="text-right text-white font-bold">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map(t => {
                    const details = getTransactionDetails(t);
                    return (
                      <TableRow key={`${t.transactionType}-${t.id}`}>
                        <TableCell>{format(parseISO(t.date), "dd MMM yyyy", { locale: es })}</TableCell>
                        <TableCell>
                          <Badge variant={details.variant as any}>{details.label}</Badge>
                        </TableCell>
                        <TableCell>{details.description}</TableCell>
                        <TableCell className={cn("text-right font-semibold", details.variant === 'success' ? 'text-green-600' : 'text-destructive')}>
                          {details.variant === 'success' ? '+' : '-'} {formatCurrency(t.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">No hay movimientos de caja.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
