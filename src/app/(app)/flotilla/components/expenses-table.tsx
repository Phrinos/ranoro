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
import { Wrench, Download, MoreHorizontal, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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

// ── Detail modal ───────────────────────────────────────────────────────────────
function OutflowDetailModal({
  row,
  open,
  onClose,
}: {
  row: OutflowRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!row) return null;
  const d = parseFleetDate(row.date);
  const isWithdrawal = row.rowType === "withdrawal";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isWithdrawal ? (
              <Download className="h-4 w-4 text-amber-600" />
            ) : (
              <Wrench className="h-4 w-4 text-red-600" />
            )}
            {isWithdrawal ? "Retiro de Socio" : "Gasto de Unidad"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm mt-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <span className="text-muted-foreground font-medium">Fecha</span>
            <span className="font-semibold">
              {d ? format(d, "dd MMMM yyyy", { locale: es }) : "—"}
            </span>

            <span className="text-muted-foreground font-medium">Tipo</span>
            <span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  isWithdrawal
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-red-200 bg-red-50 text-red-700"
                )}
              >
                {isWithdrawal ? "Retiro" : "Gasto"}
              </Badge>
            </span>

            {isWithdrawal ? (
              <>
                <span className="text-muted-foreground font-medium">Socio</span>
                <span className="font-semibold">
                  {(row as OwnerWithdrawal).ownerName}
                </span>
              </>
            ) : (
              <>
                <span className="text-muted-foreground font-medium">Unidad</span>
                <span className="font-semibold">
                  {(row as VehicleExpense).vehicleLicensePlate ?? "—"}
                </span>
                <span className="text-muted-foreground font-medium">Descripción</span>
                <span>{(row as VehicleExpense).description}</span>
              </>
            )}

            {(row as any).note && (
              <>
                <span className="text-muted-foreground font-medium">Nota</span>
                <span className="italic text-muted-foreground">
                  {(row as any).note}
                </span>
              </>
            )}
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Monto</span>
            <span className="text-lg font-bold text-red-600">
              {formatCurrency(row.amount)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main table ─────────────────────────────────────────────────────────────────
export function ExpensesTable({ expenses, withdrawals, fleetData, canManage, selectedMonth }: ExpensesTableProps) {
  const { toast } = useToast();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<OutflowRow | null>(null);

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
                  <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Nota</th>
                  <th className="px-4 py-2.5 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Monto</th>
                  <th className="px-2 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rows.map(row => {
                  const d = parseFleetDate(row.date);
                  const note = (row as any).note as string | undefined;
                  return (
                    <tr key={`${row.rowType}-${row.id}`} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
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
                      <td className="px-4 py-2.5 text-xs max-w-[180px]">
                        {row.rowType === "expense"
                          ? `${(row as VehicleExpense).description} · ${(row as VehicleExpense).vehicleLicensePlate ?? ""}`
                          : `Retiro — ${(row as OwnerWithdrawal).ownerName}`}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground italic max-w-[160px]">
                        {note ? (
                          <span className="truncate block" title={note}>{note}</span>
                        ) : (
                          <span className="text-border select-none">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-red-600 whitespace-nowrap">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => setDetailRow(row)}
                            >
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              Ver detalle
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
      <OutflowDetailModal
        row={detailRow}
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
      />
    </>
  );
}
