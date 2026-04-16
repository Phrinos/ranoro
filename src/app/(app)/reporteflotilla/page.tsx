"use client";

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { withSuspense } from "@/lib/withSuspense";
import { Loader2 } from 'lucide-react';
import { rentalService, cashService } from '@/lib/services';
import type { RentalPayment, OwnerWithdrawal, VehicleExpense, CashDrawerTransaction } from '@/types';

const ResumenMensualTab = lazy(() => import('../flotillav2/components/ResumenMensualTab'));

function ReporteFlotillaPage() {
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
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

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-primary text-primary-foreground rounded-lg p-6">
        <h1 className="text-3xl font-bold tracking-tight">Reporte Financiero de Flotilla</h1>
        <p className="text-primary-foreground/80 mt-1">Análisis mensual de ingresos por rentas, gastos y utilidades netas.</p>
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
