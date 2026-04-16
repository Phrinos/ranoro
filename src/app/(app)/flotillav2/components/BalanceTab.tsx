
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import type { Driver, DailyRentalCharge, RentalPayment, ManualDebtEntry, Vehicle, VehicleExpense, OwnerWithdrawal } from '@/types';
import type { FleetMonthlyBalance } from '@/lib/services/rental.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn, capitalizeWords } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import { parseDate } from '@/lib/forms';
import { personnelService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MoreVertical, Unlink, Archive, Car, TrendingDown, TrendingUp, DollarSign, Wrench, Download, HandCoins, PlusCircle, Ticket } from 'lucide-react';
import { rentalService } from '@/lib/services/rental.service';
import { VehicleExpenseDialog } from './VehicleExpenseDialog';
import { OwnerWithdrawalDialog } from './OwnerWithdrawalDialog';
import { FleetTicketModal } from './FleetTicketModal';
import { RegisterPaymentDialog, type PaymentFormValues } from './RegisterPaymentDialog';
import { AddManualChargeDialog, type ManualChargeFormValues } from './AddManualChargeDialog';

interface BalanceTabProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  dailyCharges: DailyRentalCharge[];
  payments: RentalPayment[];
  manualDebts: ManualDebtEntry[];
  expenses: VehicleExpense[];
  withdrawals: OwnerWithdrawal[];
}

const generateMonthOptions = () => {
    const options: { value: string; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const value = format(date, 'yyyy-MM');
        const label = capitalizeWords(format(date, 'MMMM yyyy', { locale: es }));
        options.push({ value, label });
    }
    return options;
};

export default function BalanceTab({ drivers, vehicles, dailyCharges, payments, manualDebts, expenses, withdrawals }: BalanceTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [sortOption, setSortOption] = useState('balance_asc');
  const [monthlyBalances, setMonthlyBalances] = useState<FleetMonthlyBalance[]>([]);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  // Per-driver quick actions
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false);
  const [ticketData, setTicketData] = useState<{ payment: RentalPayment; balance: number } | null>(null);

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  useEffect(() => {
    const unsub = rentalService.onMonthlyBalancesUpdate(setMonthlyBalances, selectedMonth);
    return () => unsub();
  }, [selectedMonth]);

  const interval = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    return { start: startOfMonth(d), end: endOfMonth(d) };
  }, [selectedMonth]);

  const isInMonth = (dateVal: any) => {
    const d = parseDate(dateVal);
    return d && isWithinInterval(d, interval);
  };

  const driverBalances = useMemo(() => {
    const activeDrivers = drivers.filter(d => !d.isArchived && d.assignedVehicleId);

    const balances = activeDrivers.map(driver => {
      const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
      const carryoverDoc = monthlyBalances.find(b => b.driverId === driver.id);
      const carryover = carryoverDoc?.carryoverBalance ?? 0;

      const driverCharges = dailyCharges
        .filter(c => c.driverId === driver.id && isInMonth(c.date))
        .reduce((sum, c) => sum + c.amount, 0);

      const driverDebts = manualDebts
        .filter(d => d.driverId === driver.id && isInMonth(d.date))
        .reduce((sum, d) => sum + d.amount, 0);

      const driverPayments = payments.filter(p => p.driverId === driver.id && isInMonth(p.paymentDate || p.date));
      const totalPaymentsAmount = driverPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalCharges = driverCharges + driverDebts;
      const balance = totalPaymentsAmount - totalCharges + carryover;

      const lastPayment = driverPayments.length > 0 
        ? driverPayments.reduce((latest, current) => {
            const ct = new Date(current.paymentDate || current.date).getTime();
            const lt = new Date(latest.paymentDate || latest.date).getTime();
            return ct > lt ? current : latest;
          })
        : null;
      
      return {
        id: driver.id, name: driver.name,
        vehiclePlate: vehicle?.licensePlate || '—',
        vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : '—',
        totalCharges, carryover, totalPayments: totalPaymentsAmount, balance,
        lastPaymentDate: lastPayment ? (lastPayment.paymentDate || lastPayment.date) : null,
      };
    });

    const [key, direction] = sortOption.split('_');
    balances.sort((a: any, b: any) => {
        const valA = a[key] ?? '';
        const valB = b[key] ?? '';
        const cmp = typeof valA === 'number' && typeof valB === 'number' ? valA - valB : String(valA).localeCompare(String(valB), 'es', { numeric: true });
        return direction === 'asc' ? cmp : -cmp;
    });
    return balances;
  }, [drivers, vehicles, dailyCharges, payments, manualDebts, sortOption, selectedMonth, monthlyBalances]);
  
  const handleSort = (key: string) => {
    setSortOption(`${key}_${sortOption === `${key}_asc` ? 'desc' : 'asc'}`);
  };

  const handleUnlinkDriver = async (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver?.assignedVehicleId) return;
    const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
    if (!vehicle) return;
    await personnelService.assignVehicleToDriver(vehicle, null, drivers);
    toast({ title: "Conductor desvinculado" });
  };

  const handleArchiveDriver = async (driverId: string) => {
    await personnelService.saveDriver({ isArchived: true }, driverId);
    toast({ title: "Conductor dado de baja" });
  };

  // Salidas del mes
  const monthExpenses = useMemo(() => expenses.filter(e => isInMonth(e.date)), [expenses, interval]);
  const monthWithdrawals = useMemo(() => withdrawals.filter(w => isInMonth(w.date)), [withdrawals, interval]);

  const totals = useMemo(() => {
    const charges = driverBalances.reduce((s, d) => s + d.totalCharges, 0);
    const paymentsTotal = driverBalances.reduce((s, d) => s + d.totalPayments, 0);
    const balance = driverBalances.reduce((s, d) => s + d.balance, 0);
    const carryover = driverBalances.reduce((s, d) => s + d.carryover, 0);
    const expensesTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const withdrawalsTotal = monthWithdrawals.reduce((s, w) => s + w.amount, 0);
    return { charges, payments: paymentsTotal, balance, carryover, expenses: expensesTotal, withdrawals: withdrawalsTotal, totalOut: expensesTotal + withdrawalsTotal };
  }, [driverBalances, monthExpenses, monthWithdrawals]);

  const handleExpenseSave = async (data: any) => {
    await rentalService.addVehicleExpense(data);
    toast({ title: "Gasto registrado" });
    setIsExpenseOpen(false);
  };
  const handleWithdrawalSave = async (data: any) => {
    await rentalService.addOwnerWithdrawal({ ...data, date: data.date });
    toast({ title: "Retiro registrado" });
    setIsWithdrawalOpen(false);
  };

  const handleQuickPayment = async (data: PaymentFormValues) => {
    if (!selectedDriverId) return;
    const driver = drivers.find(d => d.id === selectedDriverId);
    const vehicle = driver ? vehicles.find(v => v.id === driver.assignedVehicleId) : null;
    if (!driver || !vehicle) { toast({ title: 'Sin vehículo asignado', variant: 'destructive' }); return; }
    await rentalService.addRentalPayment(driver, vehicle, data.amount, data.note ?? '', data.paymentDate, data.paymentMethod as any);
    toast({ title: 'Pago registrado' });
    setIsPaymentDialogOpen(false);
    setSelectedDriverId(null);
  };

  const handleQuickCharge = async (data: ManualChargeFormValues) => {
    if (!selectedDriverId) return;
    await personnelService.saveManualDebt(selectedDriverId, { ...data, date: data.date.toISOString(), note: data.note || '' });
    toast({ title: 'Cargo registrado' });
    setIsChargeDialogOpen(false);
    setSelectedDriverId(null);
  };

  const handleShowLastTicket = (driverId: string, balance: number) => {
    const lastPayment = [...payments]
      .filter(p => p.driverId === driverId && isInMonth(p.paymentDate || p.date))
      .sort((a, b) => new Date(b.paymentDate || b.date).getTime() - new Date(a.paymentDate || a.date).getTime())[0];
    if (!lastPayment) { toast({ title: 'Sin pagos este mes', description: 'No hay pagos en el mes seleccionado.' }); return; }
    setTicketData({ payment: lastPayment, balance });
  };

  const fleetVehicles = vehicles.filter(v => v.isFleetVehicle);

  return (
    <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/60">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 mb-0.5">Generado</p>
              <p className="text-lg font-black text-blue-900 font-mono">{formatCurrency(totals.charges)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/60">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500 mb-0.5">Cobrado</p>
              <p className="text-lg font-black text-emerald-900 font-mono">{formatCurrency(totals.payments)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200/60">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-500 mb-0.5">Salidas</p>
              <p className="text-lg font-black text-red-900 font-mono">{formatCurrency(totals.totalOut)}</p>
            </CardContent>
          </Card>
          <Card className={cn("bg-gradient-to-br border", totals.payments - totals.totalOut >= 0 ? "from-emerald-50 to-emerald-100/50 border-emerald-200/60" : "from-orange-50 to-orange-100/50 border-orange-200/60")}>
            <CardContent className="p-4">
              <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-0.5", totals.payments - totals.totalOut >= 0 ? "text-emerald-500" : "text-orange-500")}>Utilidad</p>
              <p className={cn("text-lg font-black font-mono", totals.payments - totals.totalOut >= 0 ? "text-emerald-900" : "text-orange-900")}>{formatCurrency(totals.payments - totals.totalOut)}</p>
            </CardContent>
          </Card>
          <Card className={cn("bg-gradient-to-br border", totals.balance >= 0 ? "from-zinc-50 to-zinc-100/50 border-zinc-200/60" : "from-red-50 to-red-100/50 border-red-200/60")}>
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5">Deuda Total</p>
              <p className={cn("text-lg font-black font-mono", totals.balance >= 0 ? "text-zinc-600" : "text-red-900")}>{formatCurrency(totals.balance)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Month Selector + Stats */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-muted-foreground text-xs">{driverBalances.length} activos</Badge>
              {driverBalances.filter(d => d.balance < 0).length > 0 && (
                <Badge variant="destructive" className="text-xs">{driverBalances.filter(d => d.balance < 0).length} con deuda</Badge>
              )}
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[200px] bg-card text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {monthOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                </SelectContent>
            </Select>
        </div>

        {/* Conductores Table */}
        <Card className="overflow-hidden border-zinc-200/80 shadow-sm">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-zinc-900 hover:bg-zinc-900">
                                <SortableTableHeader sortKey="name" label="Conductor" onSort={handleSort} currentSort={sortOption} textClassName="text-zinc-300 text-[11px] uppercase tracking-wider" />
                                <TableHead className="text-zinc-300 text-[11px] uppercase tracking-wider font-semibold">Vehículo</TableHead>
                                <SortableTableHeader sortKey="totalCharges" label="Generado" onSort={handleSort} currentSort={sortOption} className="text-right" textClassName="text-zinc-300 text-[11px] uppercase tracking-wider"/>
                                <SortableTableHeader sortKey="totalPayments" label="Abonos" onSort={handleSort} currentSort={sortOption} className="text-right" textClassName="text-zinc-300 text-[11px] uppercase tracking-wider"/>
                                <SortableTableHeader sortKey="balance" label="Adeudo" onSort={handleSort} currentSort={sortOption} className="text-right" textClassName="text-zinc-300 text-[11px] uppercase tracking-wider"/>
                                <SortableTableHeader sortKey="lastPaymentDate" label="Último Pago" onSort={handleSort} currentSort={sortOption} className="hidden md:table-cell text-right" textClassName="text-zinc-300 text-[11px] uppercase tracking-wider"/>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {driverBalances.length > 0 ? driverBalances.map(item => {
                              const isDebt = item.balance < 0;
                              return (
                                <TableRow key={item.id} className={cn('transition-colors', isDebt ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-zinc-50')}>
                                    <TableCell className="cursor-pointer py-3" onClick={() => router.push(`/flotillav2/conductores/${item.id}?tab=history`)}>
                                      <div className="flex items-center gap-2.5">
                                        <div className={cn('h-2 w-2 rounded-full shrink-0 ring-2 ring-offset-1', isDebt ? 'bg-red-500 ring-red-200' : 'bg-emerald-500 ring-emerald-200')} />
                                        <span className="font-semibold text-sm">{item.name}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                      <div className="flex items-center gap-1.5">
                                        <Car className="h-3.5 w-3.5 text-zinc-400" />
                                        <span className="font-mono text-xs font-bold text-zinc-700">{item.vehiclePlate}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm text-zinc-500 py-3">{formatCurrency(item.totalCharges)}</TableCell>
                                    <TableCell className="text-right font-mono text-sm text-emerald-600 py-3">{formatCurrency(item.totalPayments)}</TableCell>
                                    <TableCell className={cn('text-right font-bold font-mono text-sm py-3', isDebt ? 'text-red-700' : 'text-emerald-700')}>
                                        {formatCurrency(item.balance)}
                                    </TableCell>
                                    <TableCell className="text-right hidden md:table-cell text-zinc-400 text-xs py-3">
                                      {item.lastPaymentDate ? (() => { try { return format(new Date(item.lastPaymentDate), 'dd/MM/yy'); } catch { return '—'; } })() : <span className="text-zinc-300">—</span>}
                                    </TableCell>
                                    <TableCell className="py-3">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-700">
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52">
                                          <DropdownMenuItem onClick={() => router.push(`/flotillav2/conductores/${item.id}`)}>Ver Perfil</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => router.push(`/flotillav2/conductores/${item.id}?tab=history`)}>Estado de Cuenta</DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => { setSelectedDriverId(item.id); setIsPaymentDialogOpen(true); }}>
                                            <HandCoins className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Registrar Abono
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => { setSelectedDriverId(item.id); setIsChargeDialogOpen(true); }}>
                                            <PlusCircle className="mr-2 h-3.5 w-3.5 text-amber-600" /> Registrar Cargo
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleShowLastTicket(item.id, item.balance)}>
                                            <Ticket className="mr-2 h-3.5 w-3.5 text-blue-600" /> Ver Último Ticket
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="text-amber-600 focus:text-amber-700" onClick={() => handleUnlinkDriver(item.id)}>
                                            <Unlink className="mr-2 h-3.5 w-3.5" /> Desvincular
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="text-red-600 focus:text-red-700" onClick={() => handleArchiveDriver(item.id)}>
                                            <Archive className="mr-2 h-3.5 w-3.5" /> Dar de Baja
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                              );
                            }) : (
                              <TableRow><TableCell colSpan={7} className="h-20 text-center text-zinc-400">No hay conductores con vehículo asignado.</TableCell></TableRow>
                            )}
                        </TableBody>
                        {driverBalances.length > 1 && (
                          <tfoot>
                            <tr className="border-t-2 border-zinc-200 bg-zinc-50/80">
                              <td className="px-4 py-2.5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Totales</td>
                              <td></td>
                              <td className="px-4 py-2.5 text-right font-bold text-zinc-500 font-mono text-sm">{formatCurrency(totals.charges)}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-emerald-600 font-mono text-sm">{formatCurrency(totals.payments)}</td>
                              <td className={cn('px-4 py-2.5 text-right font-black font-mono text-sm', totals.balance >= 0 ? 'text-emerald-700' : 'text-red-700')}>{formatCurrency(totals.balance)}</td>
                              <td className="hidden md:table-cell"></td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                    </Table>
                </div>
            </CardContent>
        </Card>

        {/* Salidas del Mes */}
        <Card className="overflow-hidden border-zinc-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /> Salidas del Mes</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Gastos de vehículos y retiros de socios.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsExpenseOpen(true)}>
                    <Wrench className="mr-1.5 h-3.5 w-3.5" /> Gasto
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsWithdrawalOpen(true)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Retiro
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-900 hover:bg-zinc-900">
                      <TableHead className="text-zinc-300 text-[11px] uppercase tracking-wider font-semibold">Fecha</TableHead>
                      <TableHead className="text-zinc-300 text-[11px] uppercase tracking-wider font-semibold">Tipo</TableHead>
                      <TableHead className="text-zinc-300 text-[11px] uppercase tracking-wider font-semibold">Concepto</TableHead>
                      <TableHead className="text-zinc-300 text-[11px] uppercase tracking-wider font-semibold">Nota</TableHead>
                      <TableHead className="text-zinc-300 text-[11px] uppercase tracking-wider font-semibold text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthExpenses.map(e => (
                      <TableRow key={`e-${e.id}`} className="hover:bg-zinc-50">
                        <TableCell className="text-xs text-zinc-500 py-2.5">{parseDate(e.date) ? format(parseDate(e.date)!, 'dd MMM', { locale: es }) : '—'}</TableCell>
                        <TableCell><Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] font-bold">Gasto</Badge></TableCell>
                        <TableCell className="text-sm">{e.description} <span className="text-zinc-400 text-xs">({e.vehicleLicensePlate})</span></TableCell>
                        <TableCell className="text-xs text-zinc-400 max-w-[200px] truncate">{(e as any).note || '—'}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm text-red-600">{formatCurrency(e.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {monthWithdrawals.map(w => (
                      <TableRow key={`w-${w.id}`} className="hover:bg-zinc-50">
                        <TableCell className="text-xs text-zinc-500 py-2.5">{parseDate(w.date) ? format(parseDate(w.date)!, 'dd MMM', { locale: es }) : '—'}</TableCell>
                        <TableCell><Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold">Retiro</Badge></TableCell>
                        <TableCell className="text-sm">Retiro: <span className="font-semibold">{w.ownerName}</span></TableCell>
                        <TableCell className="text-xs text-zinc-400 max-w-[200px] truncate">{w.note || '—'}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm text-red-600">{formatCurrency(w.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {monthExpenses.length === 0 && monthWithdrawals.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="h-14 text-center text-zinc-400 text-sm">Sin salidas este mes.</TableCell></TableRow>
                    )}
                    {(monthExpenses.length > 0 || monthWithdrawals.length > 0) && (
                      <TableRow className="bg-zinc-50/80 border-t-2 border-zinc-200">
                        <TableCell></TableCell><TableCell></TableCell><TableCell></TableCell>
                        <TableCell className="text-xs font-bold text-zinc-500 uppercase text-right">Total</TableCell>
                        <TableCell className="text-right font-black font-mono text-sm text-red-700">{formatCurrency(totals.totalOut)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
        </Card>

        <VehicleExpenseDialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen} onSave={handleExpenseSave} vehicles={fleetVehicles} />
        <OwnerWithdrawalDialog
          open={isWithdrawalOpen}
          onOpenChange={setIsWithdrawalOpen}
          onSave={handleWithdrawalSave}
          owners={[...new Set(fleetVehicles.map(v => v.ownerName).filter(Boolean) as string[])]}
        />
        <RegisterPaymentDialog
          open={isPaymentDialogOpen}
          onOpenChange={(o) => { setIsPaymentDialogOpen(o); if (!o) setSelectedDriverId(null); }}
          onSave={handleQuickPayment}
        />
        <AddManualChargeDialog
          open={isChargeDialogOpen}
          onOpenChange={(o) => { setIsChargeDialogOpen(o); if (!o) setSelectedDriverId(null); }}
          onSave={handleQuickCharge}
        />
        <FleetTicketModal
          open={!!ticketData}
          onOpenChange={(o) => { if (!o) setTicketData(null); }}
          payment={ticketData?.payment ?? null}
          driver={ticketData ? (drivers.find(d => d.id === ticketData.payment.driverId) ?? null) : null}
          vehicle={ticketData ? (vehicles.find(v => v.id === drivers.find(d => d.id === ticketData.payment.driverId)?.assignedVehicleId) ?? null) : null}
          monthBalance={ticketData?.balance ?? 0}
        />
    </div>
  );
}
