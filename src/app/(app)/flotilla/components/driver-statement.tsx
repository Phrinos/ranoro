// src/app/(app)/flotilla/components/driver-statement.tsx
"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency, cn, capitalizeWords } from "@/lib/utils";
import { parseFleetDate } from "../hooks/use-fleet-data";
import type { FleetData } from "../hooks/use-fleet-data";
import type { Driver, Vehicle, DailyRentalCharge, RentalPayment, ManualDebtEntry } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Ticket, HandCoins, PlusCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PaymentDialog, type PaymentFormValues } from "./dialogs/payment-dialog";
import { ChargeDialog, type ChargeFormValues } from "./dialogs/charge-dialog";
import { DailyChargeDialog, type DailyChargeFormValues } from "./dialogs/daily-charge-dialog";
import { ReceiptModal } from "./receipt/receipt-modal";
import { rentalService } from "@/lib/services/rental.service";
import { personnelService } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";

type Transaction =
  | (DailyRentalCharge & { rowType: "charge"; note: string })
  | (RentalPayment & { rowType: "payment" })
  | (ManualDebtEntry & { rowType: "debt" });

const generateMonthOptions = () => {
  const opts: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    opts.push({ value: format(d, "yyyy-MM"), label: capitalizeWords(format(d, "MMMM yyyy", { locale: es })) });
  }
  return opts;
};

interface DriverStatementProps {
  driver: Driver;
  vehicle: Vehicle | null;
  fleetData: FleetData;
  canManage: boolean;
}

export function DriverStatement({ driver, vehicle, fleetData, canManage }: DriverStatementProps) {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [editingCharge, setEditingCharge] = useState<DailyRentalCharge | null>(null);
  const [editingDebt, setEditingDebt] = useState<ManualDebtEntry | null>(null);
  const [editingPayment, setEditingPayment] = useState<RentalPayment | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [dailyChargeOpen, setDailyChargeOpen] = useState(false);
  const [ticketPayment, setTicketPayment] = useState<RentalPayment | null>(null);

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const allCharges = fleetData.getDriverChargesInMonth(driver.id, selectedMonth);
  const allPayments = fleetData.getDriverPaymentsInMonth(driver.id, selectedMonth);
  const allDebts = fleetData.getDriverDebtsInMonth(driver.id, selectedMonth);

  const { transactions, monthCharges, monthPayments, monthDebts, balance } = useMemo(() => {
    const txs: (Transaction & { balance: number })[] = [];
    const all: Transaction[] = [
      ...allCharges.map(c => ({ ...c, rowType: "charge" as const, note: (c as any).note || `Renta Diaria (${c.vehicleLicensePlate || vehicle?.licensePlate || ""})` })),
      ...allPayments.map(p => ({ ...p, rowType: "payment" as const })),
      ...allDebts.map(d => ({ ...d, rowType: "debt" as const })),
    ];

    all.sort((a, b) => {
      const da = parseFleetDate(a.date)?.getTime() ?? 0;
      const db = parseFleetDate(b.date)?.getTime() ?? 0;
      return da - db;
    });

    let running = 0;
    for (const t of all) {
      if (t.rowType === "payment") running += t.amount;
      else running -= t.amount;
      txs.push({ ...t, balance: running });
    }

    const monthCharges = allCharges.reduce((s, c) => s + c.amount, 0);
    const monthDebts = allDebts.reduce((s, d) => s + d.amount, 0);
    const monthPayments = allPayments.reduce((s, p) => s + p.amount, 0);

    return { transactions: txs.reverse(), monthCharges, monthPayments, monthDebts, balance: running };
  }, [allCharges, allPayments, allDebts]);

  const dailyRate = vehicle?.dailyRentalCost ?? 0;
  const totalCharges = monthCharges + monthDebts;

  const handleSavePayment = async (values: PaymentFormValues) => {
    if (!vehicle) { toast({ title: "Sin vehículo", variant: "destructive" }); return; }
    const saved = await rentalService.addRentalPayment(driver, vehicle, values.amount, values.note ?? "", values.paymentDate, values.paymentMethod as any, editingPayment?.id);
    toast({ title: editingPayment ? "Pago actualizado" : "✅ Pago registrado" });
    if (!editingPayment) setTicketPayment(saved);
    setPaymentOpen(false);
    setEditingPayment(null);
  };

  const handleSaveCharge = async (values: ChargeFormValues) => {
    await personnelService.saveManualDebt(driver.id, { date: new Date(values.date).toISOString(), amount: values.amount, note: values.note }, editingDebt?.id);
    toast({ title: editingDebt ? "Cargo actualizado" : "✅ Cargo registrado" });
    setChargeOpen(false);
    setEditingDebt(null);
  };

  const handleSaveDailyCharge = async (values: DailyChargeFormValues) => {
    if (!editingCharge) return;
    await rentalService.saveDailyCharge(editingCharge.id, { amount: values.amount, date: new Date(values.date).toISOString(), note: values.note ?? "" });
    toast({ title: "Cargo diario actualizado" });
    setDailyChargeOpen(false);
    setEditingCharge(null);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Month selector + actions */}
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {canManage && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setEditingDebt(null); setChargeOpen(true); }}>
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Cargo
              </Button>
              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setEditingPayment(null); setPaymentOpen(true); }}>
                <HandCoins className="mr-1.5 h-3.5 w-3.5" /> Abono
              </Button>
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-muted/50 border-muted">
            <CardContent className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Cargos</p>
              <p className="text-base font-black font-mono">{formatCurrency(totalCharges)}</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60">
            <CardContent className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500 mb-0.5">Abonos</p>
              <p className="text-base font-black font-mono text-emerald-700">{formatCurrency(monthPayments)}</p>
            </CardContent>
          </Card>
          <Card className={cn("border", balance >= 0 ? "bg-emerald-50 border-emerald-200/60" : "bg-red-50 border-red-200/60")}>
            <CardContent className="p-3">
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-0.5", balance >= 0 ? "text-emerald-500" : "text-red-500")}>Balance</p>
              <p className={cn("text-base font-black font-mono", balance >= 0 ? "text-emerald-700" : "text-red-700")}>{formatCurrency(balance)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions — mobile: cards, desktop: table */}
        <div className="md:hidden space-y-2">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-xl border-dashed text-sm">
              Sin movimientos este mes.
            </div>
          ) : transactions.map(t => (
            <div key={`${t.rowType}-${t.id}`} className={cn("rounded-xl border p-3.5", t.rowType === "payment" ? "bg-emerald-50/50 border-emerald-200/60" : "bg-card")}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[10px] font-bold",
                    t.rowType === "payment" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : t.rowType === "debt" ? "bg-amber-100 text-amber-700 border-amber-200"
                    : "bg-red-100 text-red-700 border-red-200"
                  )}>
                    {t.rowType === "charge" ? "Renta" : t.rowType === "debt" ? "Adeudo" : "Pago"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {(() => { const d = parseFleetDate(t.date); return d ? format(d, "dd MMM", { locale: es }) : "N/A"; })()}
                  </span>
                </div>
                <span className={cn("font-mono font-bold text-sm", t.rowType === "payment" ? "text-emerald-600" : "text-red-600")}>
                  {t.rowType === "payment" ? "+" : "-"}{formatCurrency(t.amount)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{(t as any).note || (t as any).reason || "—"}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className={cn("text-xs font-semibold font-mono", t.balance >= 0 ? "text-emerald-600" : "text-red-600")}>
                  Balance: {formatCurrency(t.balance)}
                </span>
                {t.rowType === "payment" && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTicketPayment(t as RentalPayment)}>
                    <Ticket className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-hidden rounded-xl border border-border/60 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 text-zinc-300">
                {["Fecha", "Tipo", "Descripción", "Cargo", "Abono", "Balance", ""].map(h => (
                  <th key={h} className={cn("px-4 py-3 text-[11px] font-semibold uppercase tracking-wider",
                    ["Cargo", "Abono", "Balance"].includes(h) ? "text-right" : "text-left"
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {transactions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Sin movimientos este mes.</td></tr>
              ) : transactions.map(t => {
                const d = parseFleetDate(t.date);
                return (
                  <tr key={`${t.rowType}-${t.id}`} className={cn("hover:bg-muted/30", t.rowType === "payment" && "bg-emerald-50/20 dark:bg-emerald-950/10")}>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{d ? format(d, "dd MMM", { locale: es }) : "N/A"}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={cn("text-[10px] font-bold",
                        t.rowType === "payment" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : t.rowType === "debt" ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-red-100 text-red-700 border-red-200"
                      )}>
                        {t.rowType === "charge" ? "Renta" : t.rowType === "debt" ? "Adeudo" : "Pago"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                      {(t as any).note || (t as any).reason || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-red-600">
                      {t.rowType !== "payment" ? formatCurrency(t.amount) : ""}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald-600">
                      {t.rowType === "payment" ? formatCurrency(t.amount) : ""}
                    </td>
                    <td className={cn("px-4 py-2.5 text-right font-bold font-mono text-xs", t.balance >= 0 ? "text-emerald-700" : "text-red-700")}>
                      {formatCurrency(t.balance)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-0.5">
                        {t.rowType === "payment" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTicketPayment(t as RentalPayment)}>
                            <Ticket className="h-3.5 w-3.5 text-blue-600" />
                          </Button>
                        )}
                        {canManage && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              if (t.rowType === "debt") { setEditingDebt(t as ManualDebtEntry); setChargeOpen(true); }
                              if (t.rowType === "charge") { setEditingCharge(t as DailyRentalCharge); setDailyChargeOpen(true); }
                              if (t.rowType === "payment") { setEditingPayment(t as RentalPayment); setPaymentOpen(true); }
                            }}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <ConfirmDialog
                              triggerButton={<Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>}
                              title={`¿Eliminar ${t.rowType === "payment" ? "Pago" : "Cargo"}?`}
                              description="Esta acción es permanente."
                              onConfirm={async () => {
                                if (t.rowType === "debt") await personnelService.deleteManualDebt(t.id);
                                if (t.rowType === "payment") await rentalService.deleteRentalPayment(t.id);
                                if (t.rowType === "charge") await rentalService.deleteDailyCharge(t.id);
                                toast({ title: "Eliminado" });
                              }}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={(o) => { if (!o) { setPaymentOpen(false); setEditingPayment(null); } }}
        onSave={handleSavePayment}
        preselectedDriverId={driver.id}
        paymentToEdit={editingPayment}
      />
      <ChargeDialog
        open={chargeOpen}
        onOpenChange={(o) => { if (!o) { setChargeOpen(false); setEditingDebt(null); } }}
        onSave={handleSaveCharge}
        preselectedDriverId={driver.id}
        debtToEdit={editingDebt}
      />
      <DailyChargeDialog
        open={dailyChargeOpen}
        onOpenChange={(o) => { if (!o) { setDailyChargeOpen(false); setEditingCharge(null); } }}
        charge={editingCharge}
        onSave={handleSaveDailyCharge}
      />
      {ticketPayment && (
        <ReceiptModal
          open={!!ticketPayment}
          onOpenChange={(o) => { if (!o) setTicketPayment(null); }}
          payment={ticketPayment}
          driver={driver}
          vehicle={vehicle}
          monthBalance={balance}
          totalPaidThisMonth={monthPayments}
          totalChargesThisMonth={totalCharges}
          dailyRate={dailyRate}
        />
      )}
    </>
  );
}
