
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { formatCurrency, capitalizeWords } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, isWithinInterval, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import type { RentalPayment, VehicleExpense, OwnerWithdrawal, CashDrawerTransaction } from '@/types';

interface MensualFlotillaProps {
  payments: RentalPayment[];
  expenses: VehicleExpense[];
  withdrawals: OwnerWithdrawal[];
  cashTransactions: CashDrawerTransaction[];
}

export default function MensualFlotillaContent({ payments, expenses, withdrawals, cashTransactions }: MensualFlotillaProps) {
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

    // Procesar Ingresos por Renta
    payments.forEach(p => {
      const d = parseDate(p.paymentDate || p.date);
      if (!d) return;
      const month = months.find(m => isWithinInterval(d, { start: m.start, end: m.end }));
      if (month) month.ingresos += (Number(p.amount) || 0);
    });

    // Procesar Gastos de Vehículos
    expenses.forEach(e => {
      const d = parseDate(e.date);
      if (!d) return;
      const month = months.find(m => isWithinInterval(d, { start: m.start, end: m.end }));
      if (month) month.egresos += (Number(e.amount) || 0);
    });

    // Procesar Retiros de Socios
    withdrawals.forEach(w => {
      const d = parseDate(w.date);
      if (!d) return;
      const month = months.find(m => isWithinInterval(d, { start: m.start, end: m.end }));
      if (month) month.egresos += (Number(w.amount) || 0);
    });

    // Procesar Movimientos Manuales etiquetados como Flotilla
    cashTransactions.forEach(t => {
      if (t.relatedType === 'RetiroSocio' || t.relatedType === 'GastoVehiculo' || t.relatedType === 'Flotilla') return;
      if (t.concept?.toLowerCase().includes('flotilla') || t.description?.toLowerCase().includes('flotilla')) {
        const d = parseDate(t.date);
        if (!d) return;
        const month = months.find(m => isWithinInterval(d, { start: m.start, end: m.end }));
        if (month) {
          if (t.type === 'in' || t.type === 'Entrada') month.ingresos += t.amount;
          else month.egresos += t.amount;
        }
      }
    });

    return months.filter(m => m.ingresos > 0 || m.egresos > 0).reverse();
  }, [payments, expenses, withdrawals, cashTransactions, currentYear]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comparativo Mensual de Flotilla {currentYear}</CardTitle>
          <CardDescription>Resumen ejecutivo del rendimiento de rentas y gastos de unidades.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white">Mes</TableHead>
                  <TableHead className="text-white text-right">Ingresos por Renta</TableHead>
                  <TableHead className="text-white text-right">Gastos y Retiros</TableHead>
                  <TableHead className="text-white text-right font-bold">Utilidad Neta Flotilla</TableHead>
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
                {monthlyData.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No hay datos suficientes para generar el reporte de flotilla.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
