
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
          <div>
            <h3 className="font-semibold text-lg mb-2">Nómina y Comisiones</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Sueldos (Técnicos):</span>
                <span className="font-semibold">{formatCurrency(financialSummary.totalTechnicianSalaries)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Sueldos (Asesores/Admin):</span>
                <span className="font-semibold">{formatCurrency(financialSummary.totalAdministrativeSalaries)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <BadgeCent className="h-4 w-4" />
                  Comisiones Variables:
                </span>
                <span className="font-semibold">{formatCurrency(financialSummary.totalVariableCommissions)}</span>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-6 space-y-4">
            {Object.entries(groupedExpenses).map(([category, expenses]) => (
              expenses.length > 0 && (
                <div key={category}>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    {category === 'Renta' ? <Building className="h-5 w-5" /> : category === 'Servicios' ? <Wrench className="h-5 w-5" /> : null}
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {expenses.map(expense => (
                      <div key={expense.id} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{expense.name}:</span>
                        <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
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
