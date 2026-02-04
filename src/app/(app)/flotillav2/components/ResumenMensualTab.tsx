
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { formatCurrency, capitalizeWords } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, isWithinInterval, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import type { RentalPayment, VehicleExpense, OwnerWithdrawal, CashDrawerTransaction } from '@/types';

interface ResumenMensualTabProps {
  payments: RentalPayment[];
  expenses: VehicleExpense[];
  withdrawals: OwnerWithdrawal[];
  cashTransactions: CashDrawerTransaction[];
}

export default function ResumenMensualTab({ payments, expenses, withdrawals, cashTransactions }: ResumenMensualTabProps) {
  const currentYear = getYear(new Date());

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(currentYear, i, 1);
      return {
        key: format(date, 'yyyy-MM'),
        label: capitalizeWords(format(date, 'MMMM', { locale: es })),
        start: startOfMonth(date),
        end: endOfMonth(date),
        ingresos: 0,
        egresos: 0,
      };
    });

    payments.forEach(p => {
      const d = parseDate(p.paymentDate || p.date);
      if (!d) return;
      const m = months.find(m => isWithinInterval(d, { start: m.start, end: m.end }));
      if (m) m.ingresos += (Number(p.amount) || 0);
    });

    expenses.forEach(e => {
      const d = parseDate(e.date);
      if (!d) return;
      const m = months.find(m => isWithinInterval(d, { start: m.start, end: m.end }));
      if (m) m.egresos += (Number(e.amount) || 0);
    });

    withdrawals.forEach(w => {
      const d = parseDate(w.date);
      if (!d) return;
      const m = months.find(m => isWithinInterval(d, { start: m.start, end: m.end }));
      if (m) m.egresos += (Number(w.amount) || 0);
    });

    return months.filter(m => m.ingresos > 0 || m.egresos > 0).reverse();
  }, [payments, expenses, withdrawals, currentYear]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimiento Mensual de Flotilla</CardTitle>
        <CardDescription>Comparativo de ingresos vs gastos por mes en el año {currentYear}.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-black">
            <TableRow>
              <TableHead className="text-white">Mes</TableHead>
              <TableHead className="text-white text-right">Ingresos</TableHead>
              <TableHead className="text-white text-right">Egresos</TableHead>
              <TableHead className="text-white text-right font-bold">Utilidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyData.map(m => (
              <TableRow key={m.key}>
                <TableCell className="font-bold">{m.label}</TableCell>
                <TableCell className="text-right text-green-600 font-medium">{formatCurrency(m.ingresos)}</TableCell>
                <TableCell className="text-right text-red-600">{formatCurrency(m.egresos)}</TableCell>
                <TableCell className="text-right font-bold text-primary">{formatCurrency(m.ingresos - m.egresos)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
