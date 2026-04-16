
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import type { Driver, Vehicle, DailyRentalCharge, RentalPayment, ManualDebtEntry } from '@/types';
import { rentalService } from '@/lib/services/rental.service';
import { personnelService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, cn, capitalizeWords } from '@/lib/utils';
import { parseDate } from '@/lib/forms';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, PlusCircle, HandCoins, Printer } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EditDailyChargeDialog, type DailyChargeFormValues } from './EditDailyChargeDialog';
import { RegisterPaymentDialog, type PaymentFormValues } from './RegisterPaymentDialog';
import { AddManualChargeDialog, type ManualChargeFormValues } from './AddManualChargeDialog';
import { FleetTicketModal } from './FleetTicketModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Transaction =
  | (DailyRentalCharge & { type: 'charge'; note: string })
  | (RentalPayment & { type: 'payment'; date: string })
  | (ManualDebtEntry & { type: 'debt' });

interface HistoryTabContentProps {
  driver: Driver;
  vehicle: Vehicle | null;
}

const generateMonthOptions = () => {
  const opts: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    opts.push({ value: format(date, 'yyyy-MM'), label: capitalizeWords(format(date, 'MMMM yyyy', { locale: es })) });
  }
  return opts;
};

export function HistoryTabContent({ driver, vehicle }: HistoryTabContentProps) {
  const { toast } = useToast();
  const [dailyCharges, setDailyCharges] = useState<DailyRentalCharge[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [manualDebts, setManualDebts] = useState<ManualDebtEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  const [editingCharge, setEditingCharge] = useState<DailyRentalCharge | null>(null);
  const [editingDebt, setEditingDebt] = useState<ManualDebtEntry | null>(null);
  const [editingPayment, setEditingPayment] = useState<RentalPayment | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false);

  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<RentalPayment | null>(null);

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  useEffect(() => {
    if (!driver?.id) return;
    const driverId = String(driver.id);
    const unsubCharges = rentalService.onDailyChargesUpdate((items) => setDailyCharges(items), driverId);
    const unsubPayments = rentalService.onRentalPaymentsUpdate((items) => setPayments(items), driverId);
    const unsubDebts = personnelService.onManualDebtsUpdate((items) => setManualDebts(items), driverId);
    return () => { unsubCharges?.(); unsubPayments?.(); unsubDebts?.(); };
  }, [driver?.id]);

  const interval = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    return { start: startOfMonth(d), end: endOfMonth(d) };
  }, [selectedMonth]);

  const { transactions, totalBalance, monthCharges, monthPayments } = useMemo(() => {
    const allTransactions: Transaction[] = [
      ...dailyCharges.map(c => ({ ...c, type: 'charge' as const, note: (c as any).note || `Renta Diaria (${c.vehicleLicensePlate})` })),
      ...payments.map(p => {
        const raw = (p as any).date ?? (p as any).paymentDate;
        const dateStr = raw instanceof Date ? raw.toISOString() : (typeof raw === "string" ? raw : new Date().toISOString());
        return { ...p, type: 'payment' as const, date: dateStr };
      }),
      ...manualDebts.map(d => ({ ...d, type: 'debt' as const })),
    ];

    // Filter to selected month
    const monthFiltered = allTransactions.filter(t => {
      const d = parseDate(t.date);
      return d && isWithinInterval(d, interval);
    });

    monthFiltered.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      if (dateA && dateB) return dateA.getTime() - dateB.getTime();
      return 0;
    });

    let balance = 0;
    const transactionsWithBalance = monthFiltered.map(t => {
      if (t.type === 'payment') balance += t.amount;
      else balance -= t.amount;
      return { ...t, balance };
    });

    const mc = monthFiltered.filter(t => t.type !== 'payment').reduce((s, t) => s + t.amount, 0);
    const mp = monthFiltered.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);

    return {
      transactions: transactionsWithBalance.reverse(),
      totalBalance: balance,
      monthCharges: mc,
      monthPayments: mp,
    };
  }, [dailyCharges, payments, manualDebts, interval]);

  const handleSavePayment = async (data: PaymentFormValues) => {
    if (!driver) return;
    if (!vehicle) {
      toast({ title: "Sin vehículo", description: "El conductor no tiene un vehículo asignado.", variant: "destructive" });
      return;
    }
    const savedPayment = await rentalService.addRentalPayment(driver, vehicle, data.amount, data.note ?? "", data.paymentDate, data.paymentMethod as any, editingPayment?.id);
    toast({ title: "Pago Registrado" });
    setIsPaymentDialogOpen(false);
    if (!editingPayment) { setSelectedPayment(savedPayment); setTimeout(() => setIsTicketOpen(true), 100); }
    setEditingPayment(null);
  };

  const handleSaveManualCharge = async (data: ManualChargeFormValues) => {
    if (!driver) return;
    await personnelService.saveManualDebt(driver.id, { ...data, date: data.date.toISOString(), note: data.note || '' }, editingDebt?.id);
    toast({ title: `Adeudo ${editingDebt ? 'actualizado' : 'registrado'}` });
    setIsChargeDialogOpen(false);
    setEditingDebt(null);
  };

  const handleSaveCharge = async (data: DailyChargeFormValues) => {
    if (!editingCharge) return;
    await rentalService.saveDailyCharge(editingCharge.id, { ...data, date: data.date.toISOString(), note: data.note || '' });
    toast({ title: "Cargo Actualizado" });
    setIsEditDialogOpen(false);
  };

  const handleShowTicket = (payment: RentalPayment) => {
    setSelectedPayment(payment);
    setIsTicketOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Month Selector + Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[200px] bg-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={() => { setEditingDebt(null); setIsChargeDialogOpen(true); }} variant="outline" size="sm" className="h-8 text-xs">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Cargo
            </Button>
            <Button onClick={() => { setEditingPayment(null); setIsPaymentDialogOpen(true); }} size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              <HandCoins className="mr-1.5 h-3.5 w-3.5" /> Pago
            </Button>
          </div>
        </div>

        {/* Month Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 border-zinc-200/60">
            <CardContent className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5">Cargos</p>
              <p className="text-base font-black text-zinc-800 font-mono">{formatCurrency(monthCharges)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/60">
            <CardContent className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-0.5">Abonos</p>
              <p className="text-base font-black text-emerald-800 font-mono">{formatCurrency(monthPayments)}</p>
            </CardContent>
          </Card>
          <Card className={cn("bg-gradient-to-br border", totalBalance >= 0 ? "from-emerald-50 to-emerald-100/50 border-emerald-200/60" : "from-red-50 to-red-100/50 border-red-200/60")}>
            <CardContent className="p-3">
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-0.5", totalBalance >= 0 ? "text-emerald-400" : "text-red-400")}>Balance</p>
              <p className={cn("text-base font-black font-mono", totalBalance >= 0 ? "text-emerald-800" : "text-red-800")}>{formatCurrency(totalBalance)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="overflow-hidden border-zinc-200/80 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-900 hover:bg-zinc-900">
                    <TableHead className="text-zinc-300 text-[11px] uppercase tracking-wider font-semibold">Fecha</TableHead>
                    <TableHead className="text-zinc-300 text-[11px] uppercase tracking-wider font-semibold">Tipo</TableHead>
                    <TableHead className="text-zinc-300 text-[11px] uppercase tracking-wider font-semibold">Descripción</TableHead>
                    <TableHead className="text-zinc-300 text-[11px] uppercase tracking-wider font-semibold text-right">Cargo</TableHead>
                    <TableHead className="text-zinc-300 text-[11px] uppercase tracking-wider font-semibold text-right">Abono</TableHead>
                    <TableHead className="text-zinc-300 text-[11px] uppercase tracking-wider font-semibold text-right">Balance</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length > 0 ? (
                    transactions.map(t => {
                      const transactionDate = parseDate(t.date);
                      return (
                        <TableRow key={`${t.type}-${t.id}`} className={cn("hover:bg-zinc-50", t.type === 'payment' && "bg-emerald-50/30")}>
                          <TableCell className="text-xs text-zinc-500 py-2.5">
                            {transactionDate ? format(transactionDate, "dd MMM", { locale: es }) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-[10px] font-bold", 
                              t.type === 'payment' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                              : t.type === 'debt' ? 'bg-amber-100 text-amber-700 border-amber-200' 
                              : 'bg-red-100 text-red-700 border-red-200'
                            )}>
                              {t.type === 'charge' ? 'Renta' : t.type === 'debt' ? 'Adeudo' : 'Pago'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-zinc-600">{t.note}</TableCell>
                          <TableCell className="text-right text-red-600/80 font-mono text-sm">
                            {t.type !== 'payment' ? formatCurrency(t.amount) : ''}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-mono text-sm">
                            {t.type === 'payment' ? formatCurrency(t.amount) : ''}
                          </TableCell>
                          <TableCell className={cn("text-right font-bold font-mono text-sm", t.balance >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                            {formatCurrency(t.balance)}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex items-center justify-end gap-0.5">
                              {t.type === 'payment' && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleShowTicket(t as RentalPayment)}>
                                  <Printer className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                if (t.type === 'debt') { setEditingDebt(t); setIsChargeDialogOpen(true); }
                                if (t.type === 'charge') { setEditingCharge(t); setIsEditDialogOpen(true); }
                                if (t.type === 'payment') { setEditingPayment(t as RentalPayment); setIsPaymentDialogOpen(true); }
                              }}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <ConfirmDialog
                                triggerButton={<Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>}
                                title={`¿Eliminar ${t.type === 'payment' ? 'Pago' : 'Cargo'}?`}
                                description="Esta acción es permanente."
                                onConfirm={() => {
                                  if (t.type === 'debt') personnelService.deleteManualDebt(t.id);
                                  if (t.type === 'payment') rentalService.deleteRentalPayment(t.id);
                                  if (t.type === 'charge') rentalService.deleteDailyCharge(t.id);
                                }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-20 text-center text-zinc-400">
                        Sin movimientos en {monthOptions.find(o => o.value === selectedMonth)?.label || 'este mes'}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <EditDailyChargeDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} charge={editingCharge} onSave={handleSaveCharge} />
      <RegisterPaymentDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} onSave={handleSavePayment} paymentToEdit={editingPayment} />
      <AddManualChargeDialog open={isChargeDialogOpen} onOpenChange={setIsChargeDialogOpen} onSave={handleSaveManualCharge} debtToEdit={editingDebt} />

      <FleetTicketModal
        open={isTicketOpen}
        onOpenChange={(o) => { setIsTicketOpen(o); if (!o) setSelectedPayment(null); }}
        payment={selectedPayment}
        driver={driver}
        vehicle={vehicle}
        monthBalance={totalBalance}
      />
    </>
  );
}
