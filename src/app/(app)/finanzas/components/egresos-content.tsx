
// src/app/(app)/finanzas/components/egresos-content.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, BadgeCent, TrendingDown, Building, Wrench } from 'lucide-react';
import { formatCurrency } from "@/lib/utils";
import type { MonthlyFixedExpense, Personnel } from '@/types';
import { FixedExpensesDialog } from './fixed-expenses-dialog';

interface FinancialSummary {
    totalTechnicianSalaries: number;
    totalAdministrativeSalaries: number;
    totalFixedExpenses: number;
    totalVariableCommissions: number;
}

interface EgresosContentProps {
  financialSummary: FinancialSummary;
  fixedExpenses: MonthlyFixedExpense[];
  onExpensesUpdated: (updated: MonthlyFixedExpense[]) => void;
}

export function EgresosContent({ financialSummary, fixedExpenses, onExpensesUpdated }: EgresosContentProps) {
  const [isExpensesDialogOpen, setIsExpensesDialogOpen] = useState(false);
  
  const groupedExpenses = useMemo(() => {
    const groups: { [key: string]: MonthlyFixedExpense[] } = {
      'Renta': [],
      'Servicios': [],
      'Otros': [],
    };
    fixedExpenses.forEach(expense => {
      const category = expense.category || 'Otros';
      if (groups[category]) {
        groups[category].push(expense);
      } else {
        groups['Otros'].push(expense);
      }
    });
    return groups;
  }, [fixedExpenses]);
  
  const totalPayroll = financialSummary.totalTechnicianSalaries + financialSummary.totalAdministrativeSalaries;
  const totalOtherFixed = financialSummary.totalFixedExpenses;
  const totalFixedAndPayroll = totalPayroll + totalOtherFixed;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingDown className="h-6 w-6 text-red-500" />
              Egresos Fijos y Variables
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsExpensesDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar Gastos Fijos
            </Button>
          </div>
          <CardDescription>
            Detalle de gastos fijos (nómina, servicios) y variables (comisiones) del periodo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Nómina Base</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Sueldos (Técnicos):</span>
                    <span className="font-semibold">{formatCurrency(financialSummary.totalTechnicianSalaries)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Sueldos (Asesores/Admin):</span>
                    <span className="font-semibold">{formatCurrency(financialSummary.totalAdministrativeSalaries)}</span>
                  </div>
                   <div className="flex justify-between items-center text-sm font-bold border-t pt-2 mt-2">
                    <span className="text-foreground">Total Nómina Base:</span>
                    <span className="font-semibold text-red-600">{formatCurrency(totalPayroll)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t md:border-t-0 md:border-l md:pl-6">
                <h3 className="font-semibold text-lg mb-2">Otros Gastos Fijos</h3>
                 <div className="space-y-2">
                    {fixedExpenses.map(expense => (
                      <div key={expense.id} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{expense.name}:</span>
                        <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                      </div>
                    ))}
                    {fixedExpenses.length === 0 && <p className="text-sm text-muted-foreground">No hay otros gastos fijos registrados.</p>}
                     <div className="flex justify-between items-center text-sm font-bold border-t pt-2 mt-2">
                        <span className="text-foreground">Total Otros Gastos:</span>
                        <span className="font-semibold text-red-600">{formatCurrency(totalOtherFixed)}</span>
                     </div>
                  </div>
              </div>
          </div>
          
          <div className="border-t pt-4 space-y-2">
             <div className="flex justify-between items-center font-bold text-lg">
                <span className="text-foreground">Total Egresos Fijos Mensuales:</span>
                <span className="text-red-600">{formatCurrency(totalFixedAndPayroll)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <BadgeCent className="h-4 w-4" />
                  Comisiones Variables (Calculadas sobre ganancia neta):
                </span>
                <span className="font-semibold text-red-600">{formatCurrency(financialSummary.totalVariableCommissions)}</span>
              </div>
          </div>

        </CardContent>
      </Card>
      
      <FixedExpensesDialog
        open={isExpensesDialogOpen}
        onOpenChange={setIsExpensesDialogOpen}
        initialExpenses={fixedExpenses}
        onExpensesUpdated={onExpensesUpdated}
      />
    </>
  );
}
