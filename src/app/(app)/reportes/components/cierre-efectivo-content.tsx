"use client";

import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import type { CashDrawerTransaction } from '@/types';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface CierreEfectivoContentProps {
  transactions: CashDrawerTransaction[];
  summary: {
    cashIn: number;
    cashOut: number;
    cashNet: number;
  };
}

export default function CierreEfectivoContent({ transactions, summary }: CierreEfectivoContentProps) {
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const dateA = parseDate(a.date)?.getTime() || 0;
      const dateB = parseDate(b.date)?.getTime() || 0;
      return dateB - dateA;
    });
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-green-50 border border-green-100">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Total Entradas</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.cashIn)}</p>
        </div>
        <div className="p-4 rounded-lg bg-red-50 border border-red-100">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Total Salidas</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(summary.cashOut)}</p>
        </div>
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Balance Neto Efectivo</p>
          <p className={cn("text-2xl font-bold", summary.cashNet >= 0 ? "text-blue-700" : "text-red-700")}>
            {formatCurrency(summary.cashNet)}
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-black">
            <TableRow>
              <TableHead className="w-[150px] text-white">Fecha</TableHead>
              <TableHead className="text-white">Tipo</TableHead>
              <TableHead className="text-white">Concepto</TableHead>
              <TableHead className="text-right text-white">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.length > 0 ? (
              sortedTransactions.map((t) => {
                const d = parseDate(t.date);
                const isIncome = t.type === 'in' || t.type === 'Entrada';
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">
                      {d && isValid(d) ? format(d, "dd MMM, HH:mm", { locale: es }) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isIncome ? 'success' : 'destructive'}>
                        {isIncome ? <ArrowRight className="h-3 w-3 mr-1" /> : <ArrowLeft className="h-3 w-3 mr-1" />}
                        {isIncome ? 'Entrada' : 'Salida'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">
                      <p className="font-medium">{t.concept || t.description || 'Movimiento'}</p>
                      {t.userName && <p className="text-[10px] text-muted-foreground uppercase">{t.userName}</p>}
                    </TableCell>
                    <TableCell className={cn("text-right font-semibold", isIncome ? "text-green-600" : "text-red-600")}>
                      {formatCurrency(t.amount)}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No hay movimientos registrados en este periodo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
