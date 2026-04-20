// src/app/(app)/flotilla/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { withSuspense } from "@/lib/withSuspense";
import {
  Loader2, Users, Car, TrendingUp, HandCoins,
  PlusCircle, TrendingDown, ChevronDown,
} from "lucide-react";
import { TabbedPageLayout } from "@/components/layout/tabbed-page-layout";
import { useFleetData } from "./hooks/use-fleet-data";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { capitalizeWords } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FleetKpis } from "./components/fleet-kpis";
import { DriversBalanceTable } from "./components/drivers-balance-table";
import { ExpensesTable } from "./components/expenses-table";
import { DriversList } from "./components/drivers-list";
import { VehiclesList } from "./components/vehicles-list";
import { PaymentDialog, type PaymentFormValues } from "./components/dialogs/payment-dialog";
import { ChargeDialog, type ChargeFormValues } from "./components/dialogs/charge-dialog";
import { ReceiptModal } from "./components/receipt/receipt-modal";
import type { RentalPayment } from "@/types";
import type { DriverMonthSummary } from "./hooks/use-fleet-data";

const generateMonthOptions = () => {
  const opts: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    opts.push({ value: format(d, "yyyy-MM"), label: capitalizeWords(format(d, "MMMM yyyy", { locale: es })) });
  }
  return opts;
};

type QuickAction = "abono" | "cargo" | null;

function FlotillaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const permissions = usePermissions();

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "balance");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [quickAction, setQuickAction] = useState<QuickAction>(null);

  // After payment — open receipt
  const [receiptCtx, setReceiptCtx] = useState<{ payment: RentalPayment; summary: DriverMonthSummary } | null>(null);

  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const fleetData = useFleetData(selectedMonth);

  const summaries = useMemo(() =>
    fleetData.getDriverMonthSummaries(selectedMonth),
    [fleetData.getDriverMonthSummaries, selectedMonth]
  );

  const totals = useMemo(() =>
    fleetData.getMonthTotals(selectedMonth, summaries),
    [fleetData.getMonthTotals, selectedMonth, summaries]
  );

  const monthExpenses = useMemo(() => {
    const [year, mon] = selectedMonth.split("-").map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0);
    return fleetData.expenses.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
  }, [fleetData.expenses, selectedMonth]);

  const monthWithdrawals = useMemo(() => {
    const [year, mon] = selectedMonth.split("-").map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0);
    return fleetData.withdrawals.filter(w => {
      if (!w.date) return false;
      const d = new Date(w.date);
      return d >= start && d <= end;
    });
  }, [fleetData.withdrawals, selectedMonth]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/flotilla?tab=${tab}`, { scroll: false });
  };

  const handlePaymentSave = async (values: PaymentFormValues) => {
    const driver = fleetData.drivers.find(d => d.id === values.driverId);
    const vehicle = fleetData.getDriverVehicle(values.driverId);
    if (!driver) { toast({ title: "Conductor no encontrado", variant: "destructive" }); return; }
    if (!vehicle) { toast({ title: "Sin vehículo asignado", variant: "destructive" }); return; }
    const { rentalService } = await import("@/lib/services/rental.service");
    await rentalService.addRentalPayment(driver, vehicle, values.amount, values.note ?? "", values.paymentDate, values.paymentMethod as any);
    toast({ title: "✅ Abono Registrado", description: `${formatCurrency(values.amount)} — ${driver.name}` });
    setQuickAction(null);
  };

  const handleChargeSave = async (values: ChargeFormValues) => {
    const { personnelService } = await import("@/lib/services");
    await personnelService.saveManualDebt(values.driverId, { date: new Date(values.date).toISOString(), amount: values.amount, note: values.note });
    toast({ title: "✅ Cargo Registrado" });
    setQuickAction(null);
  };

  const canManageRentals = permissions.has("fleet:manage_rentals");

  // Balance tab stats bar
  const statsRow = (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full border">
        <Users className="h-3 w-3" />{fleetData.activeDrivers.length} conductores
      </span>
      <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full border">
        <Car className="h-3 w-3" />{fleetData.fleetVehicles.length} unidades
      </span>
      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
        <TrendingUp className="h-3 w-3" />{formatCurrency(totals.totalPayments)} cobrado
      </span>
    </div>
  );

  const headerActions = (
    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
      {activeTab === "balance" && (
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[160px] h-9 bg-white shadow-xs border-slate-200 text-sm font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {canManageRentals && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow-xs gap-2 border border-zinc-700 h-9">
              Acciones Rápidas <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setQuickAction("abono")}>
              <HandCoins className="h-4 w-4 text-emerald-600" />
              <div><p className="font-semibold text-sm">Registrar Abono</p><p className="text-xs text-muted-foreground">Pago de conductor</p></div>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setQuickAction("cargo")}>
              <PlusCircle className="h-4 w-4 text-amber-600" />
              <div><p className="font-semibold text-sm">Registrar Cargo</p><p className="text-xs text-muted-foreground">Adeudo manual</p></div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  const balanceContent = (
    <div className="space-y-5">
      {/* Month selector moved to headerActions */}

      <FleetKpis totals={totals} activeDrivers={fleetData.activeDrivers.length} />

      <DriversBalanceTable
        summaries={summaries}
        fleetData={fleetData}
        canManageRentals={canManageRentals}
        onPaymentSaved={(payment, summary) => {
          setReceiptCtx({ payment, summary });
        }}
        onChargeSaved={() => {}}
      />

      <ExpensesTable
        expenses={monthExpenses}
        withdrawals={monthWithdrawals}
        fleetData={fleetData}
        canManage={canManageRentals}
        selectedMonth={selectedMonth}
      />
    </div>
  );

  const tabs = [
    { value: "balance", label: "Balance", content: balanceContent },
    { value: "conductores", label: "Conductores", content: <DriversList fleetData={fleetData} canManage={canManageRentals} /> },
    { value: "vehiculos", label: "Vehículos", content: <VehiclesList fleetData={fleetData} canManage={canManageRentals} /> },
  ];

  if (fleetData.isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  return (
    <>
      <TabbedPageLayout
        title="Flotilla"
        description={statsRow}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={tabs}
        actions={headerActions}
      />

      {/* Quick action dialogs */}
      <PaymentDialog
        open={quickAction === "abono"}
        onOpenChange={(o) => { if (!o) setQuickAction(null); }}
        drivers={fleetData.drivers}
        onSave={handlePaymentSave}
      />
      <ChargeDialog
        open={quickAction === "cargo"}
        onOpenChange={(o) => { if (!o) setQuickAction(null); }}
        drivers={fleetData.drivers}
        onSave={handleChargeSave}
      />

      {/* Receipt modal after payment */}
      {receiptCtx && (
        <ReceiptModal
          open={!!receiptCtx}
          onOpenChange={(o) => { if (!o) setReceiptCtx(null); }}
          payment={receiptCtx.payment}
          driver={fleetData.drivers.find(d => d.id === receiptCtx.summary.driverId) ?? null}
          vehicle={receiptCtx.summary.vehicle ?? null}
          monthBalance={receiptCtx.summary.balance}
          totalPaidThisMonth={receiptCtx.summary.payments}
          totalChargesThisMonth={receiptCtx.summary.totalCharges}
          dailyRate={receiptCtx.summary.dailyRate}
        />
      )}
    </>
  );
}

export default withSuspense(FlotillaPage);
