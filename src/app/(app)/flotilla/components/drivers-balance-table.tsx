// src/app/(app)/flotilla/components/drivers-balance-table.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import type { DriverMonthSummary, FleetData } from "../hooks/use-fleet-data";
import type { RentalPayment } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft, ChevronRight, MoreHorizontal, Ticket,
  HandCoins, PlusCircle, ExternalLink, History,
} from "lucide-react";
import { ReceiptModal } from "./receipt/receipt-modal";
import { PaymentDialog, type PaymentFormValues } from "./dialogs/payment-dialog";
import { ChargeDialog, type ChargeFormValues } from "./dialogs/charge-dialog";
import { parseFleetDate } from "../hooks/use-fleet-data";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const PAGE_SIZE = 20;

interface DriversBalanceTableProps {
  summaries: DriverMonthSummary[];
  fleetData: FleetData;
  canManageRentals: boolean;
  onPaymentSaved: (payment: RentalPayment, driverMonthData: DriverMonthSummary) => void;
  onChargeSaved: () => void;
}

type TicketCtx = {
  payment: RentalPayment;
  summary: DriverMonthSummary;
};

export function DriversBalanceTable({
  summaries, fleetData, canManageRentals,
  onPaymentSaved, onChargeSaved,
}: DriversBalanceTableProps) {
  const [page, setPage] = useState(0);
  const [ticketCtx, setTicketCtx] = useState<TicketCtx | null>(null);
  const [paymentDriver, setPaymentDriver] = useState<string | null>(null);
  const [chargeDriver, setChargeDriver] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(summaries.length / PAGE_SIZE));
  const paged = useMemo(() =>
    summaries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [summaries, page]
  );

  const handlePaymentSave = async (values: PaymentFormValues) => {
    const driverId = values.driverId;
    const driver = fleetData.drivers.find(d => d.id === driverId);
    const vehicle = fleetData.getDriverVehicle(driverId);
    if (!driver || !vehicle) return;
    const { rentalService } = await import("@/lib/services/rental.service");
    const saved = await rentalService.addRentalPayment(
      driver, vehicle, values.amount,
      values.note ?? "", values.paymentDate,
      values.paymentMethod as any
    );
    const summary = summaries.find(s => s.driverId === driverId);
    if (summary) onPaymentSaved(saved, summary);
    setPaymentDriver(null);
  };

  const handleChargeSave = async (values: ChargeFormValues) => {
    const { personnelService } = await import("@/lib/services");
    await personnelService.saveManualDebt(values.driverId, {
      date: new Date(values.date).toISOString(),
      amount: values.amount,
      note: values.note,
    });
    onChargeSaved();
    setChargeDriver(null);
  };

  const handleShowTicket = (summary: DriverMonthSummary) => {
    if (!summary.lastPayment) return;
    setTicketCtx({ payment: summary.lastPayment, summary });
  };

  return (
    <>
      {/* ── Mobile: card list */}
      <div className="md:hidden space-y-2">
        {paged.map((s) => {
          const isDebt = s.balance < 0;
          return (
            <div key={s.driverId} className="bg-card rounded-xl border p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0",
                    isDebt ? "bg-red-500" : "bg-emerald-500"
                  )}>
                    {s.driverName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm truncate">{s.driverName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.vehiclePlate}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Generado</p>
                    <p className="text-xs font-semibold">{formatCurrency(s.totalCharges)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Pagado</p>
                    <p className="text-xs font-semibold text-emerald-600">{formatCurrency(s.payments)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{isDebt ? "Adeudo" : "Saldo"}</p>
                    <p className={cn("text-sm font-black", isDebt ? "text-red-600" : "text-emerald-600")}>
                      {formatCurrency(Math.abs(s.balance))}
                    </p>
                  </div>
                </div>
              </div>
              {canManageRentals && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/flotilla/conductores/${s.driverId}`}>
                        <ExternalLink className="mr-2 h-4 w-4" /> Ver Perfil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPaymentDriver(s.driverId)}>
                      <HandCoins className="mr-2 h-4 w-4 text-emerald-600" /> Registrar Abono
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setChargeDriver(s.driverId)}>
                      <PlusCircle className="mr-2 h-4 w-4 text-amber-600" /> Registrar Cargo
                    </DropdownMenuItem>
                    {s.lastPayment && (
                      <DropdownMenuItem onClick={() => handleShowTicket(s)}>
                        <Ticket className="mr-2 h-4 w-4 text-blue-600" /> Ver Último Ticket
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Desktop: table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-border/60 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 text-zinc-300">
              {["Conductor", "Vehículo", "Generado", "Abonos", "Adeudo / Saldo", "Último Pago", ""].map(h => (
                <th key={h} className={cn(
                  "px-4 py-3 text-[11px] font-semibold uppercase tracking-wider",
                  h === "Generado" || h === "Abonos" || h === "Adeudo / Saldo" ? "text-right" : "text-left"
                )}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                  Sin conductores activos con vehículo asignado este mes.
                </td>
              </tr>
            ) : paged.map((s) => {
              const isDebt = s.balance < 0;
              const lastPaymentDate = s.lastPayment
                ? parseFleetDate(s.lastPayment.paymentDate || s.lastPayment.date)
                : null;
              return (
                <tr key={s.driverId} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0",
                        isDebt ? "bg-red-500" : "bg-emerald-500"
                      )}>
                        {s.driverName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{s.driverName}</p>
                        <p className="text-xs text-muted-foreground">{s.daysGenerated} días generados</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-semibold">{s.vehiclePlate}</p>
                    <p className="text-xs text-muted-foreground">{s.vehicleName}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-mono text-sm">{formatCurrency(s.totalCharges)}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(s.dailyRate)}/día</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-mono text-sm text-emerald-600">{formatCurrency(s.payments)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge className={cn(
                      "font-mono font-bold text-sm px-2.5",
                      isDebt ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"
                    )}>
                      {isDebt ? "-" : "+"}{formatCurrency(Math.abs(s.balance))}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      {lastPaymentDate ? format(lastPaymentDate, "dd MMM", { locale: es }) : "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {canManageRentals && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/flotilla/conductores/${s.driverId}`}>
                              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Ver Perfil
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/flotilla/conductores/${s.driverId}?tab=history`}>
                              <History className="mr-2 h-3.5 w-3.5" /> Estado de Cuenta
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setPaymentDriver(s.driverId)}>
                            <HandCoins className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Registrar Abono
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setChargeDriver(s.driverId)}>
                            <PlusCircle className="mr-2 h-3.5 w-3.5 text-amber-600" /> Registrar Cargo
                          </DropdownMenuItem>
                          {s.lastPayment && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleShowTicket(s)}>
                                <Ticket className="mr-2 h-3.5 w-3.5 text-blue-600" /> Ver Último Ticket
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, summaries.length)} de {summaries.length} conductores
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <PaymentDialog
        open={!!paymentDriver}
        onOpenChange={(o) => { if (!o) setPaymentDriver(null); }}
        onSave={handlePaymentSave}
        preselectedDriverId={paymentDriver ?? undefined}
        drivers={fleetData.drivers}
      />
      <ChargeDialog
        open={!!chargeDriver}
        onOpenChange={(o) => { if (!o) setChargeDriver(null); }}
        onSave={handleChargeSave}
        preselectedDriverId={chargeDriver ?? undefined}
        drivers={fleetData.drivers}
      />
      <ReceiptModal
        open={!!ticketCtx}
        onOpenChange={(o) => { if (!o) setTicketCtx(null); }}
        payment={ticketCtx?.payment ?? null}
        driver={ticketCtx ? (fleetData.drivers.find(d => d.id === ticketCtx.summary.driverId) ?? null) : null}
        vehicle={ticketCtx?.summary.vehicle ?? null}
        monthBalance={ticketCtx?.summary.balance ?? 0}
        totalPaidThisMonth={ticketCtx?.summary.payments}
        totalChargesThisMonth={ticketCtx?.summary.totalCharges}
        dailyRate={ticketCtx?.summary.dailyRate}
      />
    </>
  );
}
