// src/app/(app)/flotilla/components/expenses-table.tsx
"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency, cn } from "@/lib/utils";
import type { VehicleExpense, OwnerWithdrawal } from "@/types";
import type { FleetData } from "../hooks/use-fleet-data";
import { parseFleetDate } from "../hooks/use-fleet-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Download, PlusCircle } from "lucide-react";
import { ExpenseDialog, type ExpenseFormValues } from "./dialogs/expense-dialog";
import { WithdrawalDialog, type WithdrawalFormValues } from "./dialogs/withdrawal-dialog";
import { rentalService } from "@/lib/services/rental.service";
import { useToast } from "@/hooks/use-toast";

type OutflowRow =
  | (VehicleExpense & { rowType: "expense" })
  | (OwnerWithdrawal & { rowType: "withdrawal" });

interface ExpensesTableProps {
  expenses: VehicleExpense[];
  withdrawals: OwnerWithdrawal[];
  fleetData: FleetData;
  canManage: boolean;
  selectedMonth: string;
}

export function ExpensesTable({ expenses, withdrawals, fleetData, canManage, selectedMonth }: ExpensesTableProps) {
  const { toast } = useToast();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);

  const rows = useMemo(() => {
    const expRows = expenses.map(e => ({ ...e, rowType: "expense" as const }));
    const wdRows = withdrawals.map(w => ({ ...w, rowType: "withdrawal" as const }));
    const all: OutflowRow[] = [...expRows, ...wdRows];
    all.sort((a, b) => {
      const da = parseFleetDate(a.date)?.getTime() ?? 0;
      const db = parseFleetDate(b.date)?.getTime() ?? 0;
      return db - da;
    });
    return all;
  }, [expenses, withdrawals]);

  const total = useMemo(() =>
    rows.reduce((s, r) => s + r.amount, 0),
    [rows]
  );

  const handleSaveExpense = async (values: ExpenseFormValues) => {
    const vehicle = fleetData.vehicles.find(v => v.id === values.vehicleId);
    await rentalService.addVehicleExpense({
      vehicleId: values.vehicleId,
      vehicleLicensePlate: vehicle?.licensePlate,
      description: values.description,
      amount: values.amount,
      note: values.note,
      date: new Date().toISOString(),
    });
    toast({ title: "✅ Gasto registrado" });
  };

  const handleSaveWithdrawal = async (values: WithdrawalFormValues) => {
    await rentalService.addOwnerWithdrawal({
      ownerName: values.ownerName,
      amount: values.amount,
      date: new Date(values.date),
      note: values.note,
    });
    toast({ title: "✅ Retiro registrado" });
  };

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Salidas del Mes</h3>
            <p className="text-xs text-muted-foreground">Total: {formatCurrency(total)}</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setExpenseOpen(true)}>
                <Wrench className="h-3 w-3" /> Gasto
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setWithdrawalOpen(true)}>
                <Download className="h-3 w-3" /> Retiro
              </Button>
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border rounded-xl border-dashed">
            Sin salidas registradas este mes.
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 border-b">
                  <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Fecha</th>
                  <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo</th>
                  <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Descripción</th>
                  <th className="px-4 py-2.5 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rows.map(row => {
                  const d = parseFleetDate(row.date);
                  return (
                    <tr key={`${row.rowType}-${row.id}`} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {d ? format(d, "dd MMM", { locale: es }) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={cn(
                          "text-[10px]",
                          row.rowType === "expense"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        )}>
                          {row.rowType === "expense" ? (
                            <><Wrench className="h-2.5 w-2.5 mr-1" />Gasto</>
                          ) : (
                            <><Download className="h-2.5 w-2.5 mr-1" />Retiro</>
                          )}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {row.rowType === "expense"
                          ? `${(row as VehicleExpense).description} · ${(row as VehicleExpense).vehicleLicensePlate ?? ""}`
                          : `Retiro — ${(row as OwnerWithdrawal).ownerName}`}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-red-600">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExpenseDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        onSave={handleSaveExpense}
        vehicles={fleetData.fleetVehicles}
      />
      <WithdrawalDialog
        open={withdrawalOpen}
        onOpenChange={setWithdrawalOpen}
        onSave={handleSaveWithdrawal}
        owners={fleetData.ownerNames}
      />
    </>
  );
}
