// src/app/(app)/finanzas/components/egresos-content.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MonthlyFixedExpense, Personnel } from "@/types";
import { FixedExpensesDialog } from "./fixed-expenses-dialog";

interface FinancialSummary {
  totalTechnicianSalaries: number;     // mensual, ya filtrado por activos del periodo
  totalAdministrativeSalaries: number; // mensual, ya filtrado por activos del periodo
  totalFixedExpenses: number;          // mensual, ya filtrado por activos del periodo
  totalVariableCommissions: number;
  // 👇 importante: este es el que usa el Estado de Resultados
  totalBaseExpenses: number;           // (nómina + fijos considerados) * factor del periodo
}

interface EgresosContentProps {
  financialSummary: FinancialSummary;
  fixedExpenses: MonthlyFixedExpense[];
  personnel: Personnel[];
  onExpensesUpdated: (updated: MonthlyFixedExpense[]) => void;
}

export function EgresosContent({
  financialSummary,
  fixedExpenses,
  personnel,
  onExpensesUpdated,
}: EgresosContentProps) {
  const [isExpensesDialogOpen, setIsExpensesDialogOpen] = useState(false);

  // Totales mensuales "configurados" (sin filtros por fecha de alta)
  const totalPayrollConfigured = (personnel || [])
    .filter((p) => !p.isArchived && p.monthlySalary && p.monthlySalary > 0)
    .reduce((sum, p) => sum + (p.monthlySalary || 0), 0);

  const totalOtherFixedConfigured = (fixedExpenses || []).reduce(
    (sum, exp) => sum + (exp.amount || 0),
    0
  );

  const totalFixedAndPayrollConfigured = totalPayrollConfigured + totalOtherFixedConfigured;

  // Base mensual "considerada" por el Estado (ya filtrada por fecha de alta en el padre)
  const monthlyBaseConsidered =
    (financialSummary?.totalTechnicianSalaries || 0) +
    (financialSummary?.totalAdministrativeSalaries || 0) +
    (financialSummary?.totalFixedExpenses || 0);

  // Factor del periodo: (gastos aplicados) / (base mensual considerada)
  const periodFactor =
    monthlyBaseConsidered > 0
      ? (financialSummary?.totalBaseExpenses || 0) / monthlyBaseConsidered
      : 0;

  const percent = useMemo(() => {
    if (!Number.isFinite(periodFactor)) return "—";
    const p = Math.max(0, periodFactor); // blindaje
    return `${(p * 100).toFixed(2)}%`;
  }, [periodFactor]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingDown className="h-6 w-6 text-red-500" />
              Egresos Fijos Mensuales
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsExpensesDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar Gastos
            </Button>
          </div>
          <CardDescription>
            Detalle de gastos fijos (nómina, servicios). Se muestra el total mensual configurado y lo aplicado al periodo seleccionado.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Columna de Nómina (configurada) */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg mb-2">Nómina Base (mensual configurada)</h3>
              <div className="space-y-2 text-sm">
                {(personnel || [])
                  .filter((p) => !p.isArchived && p.monthlySalary && p.monthlySalary > 0)
                  .map((p) => (
                    <div key={p.id} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{p.name}:</span>
                      <span className="font-medium">{formatCurrency(p.monthlySalary)}</span>
                    </div>
                  ))}
                {(personnel || []).filter((p) => !p.isArchived && p.monthlySalary && p.monthlySalary > 0).length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay nómina configurada.</p>
                )}
              </div>
              <div className="flex justify-between items-center text-base font-bold border-t pt-2 mt-2">
                <span className="text-foreground">Total Nómina (configurada):</span>
                <span className="text-red-600">{formatCurrency(totalPayrollConfigured)}</span>
              </div>
            </div>

            {/* Columna de Otros Gastos (configurados) */}
            <div className="space-y-3 md:border-l md:pl-8">
              <h3 className="font-semibold text-lg mb-2">Otros Gastos Fijos (mensuales configurados)</h3>
              <div className="space-y-2 text-sm">
                {(fixedExpenses || []).map((expense) => (
                  <div key={expense.id} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{expense.name}:</span>
                    <span className="font-medium">{formatCurrency(expense.amount)}</span>
                  </div>
                ))}
                {(fixedExpenses || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay otros gastos fijos.</p>
                )}
              </div>
              <div className="flex justify-between items-center text-base font-bold border-t pt-2 mt-2">
                <span className="text-foreground">Total Otros Gastos (configurados):</span>
                <span className="text-red-600">{formatCurrency(totalOtherFixedConfigured)}</span>
              </div>
            </div>
          </div>

          {/* Totales y conciliación con el Estado de Resultados */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between items-center font-bold text-lg">
              <span className="text-foreground">Total Egresos Fijos Mensuales (configurados):</span>
              <span className="text-red-600">{formatCurrency(totalFixedAndPayrollConfigured)}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                Base mensual considerada en Estado (activos al fin de periodo):
              </span>
              <span className="font-medium">{formatCurrency(monthlyBaseConsidered)}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Factor del periodo aplicado:</span>
              <span className="font-medium">{percent}</span>
            </div>

            <div className="flex justify-between items-center font-semibold">
              <span className="text-foreground">
                (=) Gastos fijos aplicados al periodo (debe cuadrar con “Gastos Fijos (Proporcionales)”):
              </span>
              <span className="text-red-600">{formatCurrency(financialSummary.totalBaseExpenses)}</span>
            </div>
          </div>

          {/* Nota de consistencia */}
          <p className="text-xs text-muted-foreground">
            Nota: Si el total mensual configurado difiere de la base considerada, revisa la fecha de alta/activación
            de cada gasto fijo. El Estado de Resultados sólo considera gastos activos hasta la fecha final del periodo.
          </p>
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
