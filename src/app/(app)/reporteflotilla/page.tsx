
"use client";

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { withSuspense } from "@/lib/withSuspense";
import { Loader2, TrendingUp, DollarSign, Wallet, BarChart3 } from 'lucide-react';
import { inventoryService, personnelService, rentalService, cashService } from '@/lib/services';
import type { Driver, Vehicle, DailyRentalCharge, RentalPayment, ManualDebtEntry, OwnerWithdrawal, VehicleExpense, CashDrawerTransaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, getYear } from 'date-fns';

const ResumenMensualTab = lazy(() => import('../flotillav2/components/ResumenMensualTab'));

function ReporteFlotillaPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      inventoryService.onVehiclesUpdate(setVehicles),
      rentalService.onRentalPaymentsUpdate(setPayments),
      rentalService.onOwnerWithdrawalsUpdate(setWithdrawals),
      rentalService.onVehicleExpensesUpdate(setExpenses),
      cashService.onCashTransactionsUpdate((data) => {
        setCashTransactions(data);
        setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const kpis = useMemo(() => {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);

    const periodPayments = payments.filter(p => {
      const d = p.paymentDate ? new Date(p.paymentDate) : new Date(p.date);
      return d >= start && d <= end;
    });

    const periodExpenses = expenses.filter(e => {
      const d = new Date(e.date!);
      return d >= start && d <= end;
    });

    const periodWithdrawals = withdrawals.filter(w => {
      const d = new Date(w.date);
      return d >= start && d <= end;
    });

    const totalIncome = periodPayments.reduce((s, p) => s + p.amount, 0);
    const totalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0) + periodWithdrawals.reduce((s, w) => s + w.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses
    };
  }, [payments, expenses, withdrawals]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-primary text-primary-foreground rounded-lg p-6">
        <h1 className="text-3xl font-bold tracking-tight">Reporte Financiero de Flotilla</h1>
        <p className="text-primary-foreground/80 mt-1">Análisis de ingresos por rentas, gastos de mantenimiento y utilidades netas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-green-800">Ingresos Mensuales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {formatCurrency(kpis.totalIncome)}
            </div>
            <p className="text-xs text-green-600/70 mt-1">Total recaudado por rentas</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-red-800">Egresos Mensuales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 rotate-180" />
              {formatCurrency(kpis.totalExpenses)}
            </div>
            <p className="text-xs text-red-600/70 mt-1">Mantenimientos y retiros de socios</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-blue-800">Utilidad Neta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {formatCurrency(kpis.netProfit)}
            </div>
            <p className="text-xs text-blue-600/70 mt-1">Ganancia real del periodo</p>
          </CardContent>
        </Card>
      </div>

      <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>}>
        <ResumenMensualTab 
          payments={payments} 
          expenses={expenses} 
          withdrawals={withdrawals} 
          cashTransactions={cashTransactions} 
        />
      </Suspense>
    </div>
  );
}

export default withSuspense(ReporteFlotillaPage);
