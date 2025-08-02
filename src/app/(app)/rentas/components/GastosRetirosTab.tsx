// src/app/(app)/rentas/components/GastosRetirosTab.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { VehicleExpense, OwnerWithdrawal } from '@/types';
import { format, parseISO, compareDesc } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { parseDate } from '@/lib/forms';

interface GastosRetirosTabProps {
  expenses: VehicleExpense[];
  withdrawals: OwnerWithdrawal[];
}

export function GastosRetirosTab({ expenses, withdrawals }: GastosRetirosTabProps) {
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a,b) => compareDesc(parseDate(a.date)!, parseDate(b.date)!));
  }, [expenses]);
  
  const sortedWithdrawals = useMemo(() => {
    return [...withdrawals].sort((a,b) => compareDesc(parseDate(a.date)!, parseDate(b.date)!));
  }, [withdrawals]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Historial de Gastos</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Vehículo</TableHead><TableHead>Desc.</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
              <TableBody>
                {sortedExpenses.length > 0 ? sortedExpenses.map(e => (<TableRow key={e.id}><TableCell>{format(parseISO(e.date), "dd/MM/yy")}</TableCell><TableCell>{e.vehicleLicensePlate}</TableCell><TableCell>{e.description}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(e.amount)}</TableCell></TableRow>)) : <TableRow><TableCell colSpan={4} className="h-24 text-center">Sin gastos</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Historial de Retiros</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Propietario</TableHead><TableHead>Razón</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
              <TableBody>
                {sortedWithdrawals.length > 0 ? sortedWithdrawals.map(w => (<TableRow key={w.id}><TableCell>{format(parseISO(w.date), "dd/MM/yy")}</TableCell><TableCell>{w.ownerName}</TableCell><TableCell>{w.reason || 'N/A'}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(w.amount)}</TableCell></TableRow>)) : <TableRow><TableCell colSpan={4} className="h-24 text-center">Sin retiros</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
