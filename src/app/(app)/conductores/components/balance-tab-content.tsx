
"use client";

import React, { useMemo, useState } from 'react';
import type { Driver, Vehicle, RentalPayment, ManualDebtEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isAfter, startOfDay, eachDayOfInterval, isWithinInterval, startOfMonth, endOfMonth, endOfDay, isBefore, min } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, cn } from '@/lib/utils';
import { PlusCircle, HandCoins, Edit, Trash2, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Transaction {
  date: Date;
  description: string;
  charge: number;
  payment: number;
  balance: number;
  isPayment: boolean;
  isManualDebt: boolean;
  originalDebt?: ManualDebtEntry;
}

interface BalanceTabContentProps {
  driver: Driver;
  vehicle: Vehicle | null;
  payments: RentalPayment[];
  onAddDebt: () => void;
  onRegisterPayment: () => void;
  onDeleteDebt: (debtId: string) => void;
  onEditDebt: (debt: ManualDebtEntry) => void;
}

export default function BalanceTabContent({ 
  driver, 
  vehicle, 
  payments,
  onAddDebt,
  onRegisterPayment,
  onDeleteDebt,
  onEditDebt,
}: BalanceTabContentProps) {
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });
  
  // Temporary state for the date picker
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handleApplyDateRange = () => {
    setDateRange(tempDateRange);
    setIsDatePickerOpen(false);
  };

  const calculationPreCheck = useMemo(() => {
    if (!vehicle) {
      return { canCalculate: false, reason: "No hay un vehículo asignado a este conductor. Los cargos de renta diaria no pueden ser calculados." };
    }
    if (!driver.contractDate) {
      return { canCalculate: false, reason: "El conductor no tiene una fecha de contrato establecida. Los cargos de renta diaria no pueden ser calculados." };
    }
    if (!vehicle.dailyRentalCost || vehicle.dailyRentalCost <= 0) {
      return { canCalculate: false, reason: "El vehículo asignado no tiene un costo de renta diario configurado (debe ser mayor a 0)." };
    }
    return { canCalculate: true, reason: null };
  }, [driver, vehicle]);


  const { transactions, totalBalance, periodTotals } = useMemo(() => {
    const today = startOfDay(new Date());
    const from = dateRange?.from ? startOfDay(dateRange.from) : new Date('2000-01-01');
    const to = dateRange?.to ? endOfDay(dateRange.to) : today;
    
    const effectiveTo = min([to, today]);
    const interval = { start: from, end: effectiveTo };
    
    let initialBalance = 0;
    
    if (calculationPreCheck.canCalculate) {
      const contractStart = startOfDay(parseISO(driver.contractDate!));
      if (isBefore(contractStart, from)) {
        const rentalInterval = eachDayOfInterval({ start: contractStart, end: from });
        rentalInterval.pop();
        initialBalance -= rentalInterval.length * (vehicle!.dailyRentalCost as number);
      }
    }

    payments
      .filter(p => isBefore(parseISO(p.paymentDate), from))
      .forEach(p => { initialBalance += p.amount; });

    (driver.manualDebts || [])
      .filter(d => isBefore(parseISO(d.date), from))
      .forEach(d => { initialBalance -= d.amount; });

    let runningBalance = initialBalance;
    const transactionsInPeriod: Transaction[] = [];
    
    const paymentTransactions: Omit<Transaction, 'balance'>[] = payments
      .filter(p => isWithinInterval(parseISO(p.paymentDate), interval))
      .map(p => ({
        date: parseISO(p.paymentDate),
        description: p.note || 'Pago de Renta',
        charge: 0,
        payment: p.amount,
        isPayment: true,
        isManualDebt: false,
      }));

    const manualDebtTransactions: Omit<Transaction, 'balance'>[] = (driver.manualDebts || [])
      .filter(d => isWithinInterval(parseISO(d.date), interval))
      .map(d => ({
        date: parseISO(d.date),
        description: d.note,
        charge: d.amount,
        payment: 0,
        isPayment: false,
        isManualDebt: true,
        originalDebt: d,
      }));

    const dailyCharges: Omit<Transaction, 'balance'>[] = [];
    if (calculationPreCheck.canCalculate) {
      const contractStart = startOfDay(parseISO(driver.contractDate!));
      const effectiveStart = isAfter(contractStart, from) ? contractStart : from;
      
      if (isAfter(effectiveTo, effectiveStart) || effectiveStart.getTime() === effectiveTo.getTime()) {
        const rentalInterval = eachDayOfInterval({ start: effectiveStart, end: effectiveTo });
        rentalInterval.forEach(day => {
          dailyCharges.push({
            date: day,
            description: `Renta diaria (${format(day, 'dd MMM', { locale: es })})`,
            charge: vehicle!.dailyRentalCost as number,
            payment: 0,
            isPayment: false,
            isManualDebt: false,
          });
        });
      }
    }
    
    const sortedTransactionsInPeriod = [...dailyCharges, ...paymentTransactions, ...manualDebtTransactions]
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    sortedTransactionsInPeriod.forEach(t => {
      runningBalance += t.payment - t.charge;
      transactionsInPeriod.push({ ...t, balance: runningBalance });
    });

    let finalTotalBalance = 0;
    if (calculationPreCheck.canCalculate) {
        const contractStart = startOfDay(parseISO(driver.contractDate!));
        if (isAfter(today, contractStart) || contractStart.getTime() === today.getTime()) {
            const rentalInterval = eachDayOfInterval({ start: contractStart, end: today });
            finalTotalBalance -= rentalInterval.length * (vehicle!.dailyRentalCost as number);
        }
    }
    payments.forEach(p => finalTotalBalance += p.amount);
    (driver.manualDebts || []).forEach(d => finalTotalBalance -= d.amount);

    const periodTotals = {
      charge: transactionsInPeriod.reduce((sum, t) => sum + t.charge, 0),
      payment: transactionsInPeriod.reduce((sum, t) => sum + t.payment, 0),
    };

    return { 
      transactions: transactionsInPeriod.sort((a,b) => b.date.getTime() - a.date.getTime()),
      totalBalance: finalTotalBalance,
      periodTotals,
    };

  }, [driver, vehicle, payments, dateRange, calculationPreCheck]);


  return (
    <div className="space-y-6">
      <Card className="lg-col-span-1 bg-amber-50 dark:bg-amber-900/50 border-amber-200">
        <CardHeader>
            <CardTitle className="text-lg text-amber-900 dark:text-amber-200">Balance Total</CardTitle>
            <CardDescription className="text-amber-800 dark:text-amber-300">Resumen de cuenta basado en rentas, pagos y cargos manuales.</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
            <div>
                <p className="text-sm font-medium text-muted-foreground">SALDO TOTAL</p>
                <p className={cn("text-3xl font-bold", totalBalance >= 0 ? "text-green-600" : "text-destructive")}>
                    {formatCurrency(totalBalance)}
                </p>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Historial de Movimientos</CardTitle>
            <CardDescription>Registro cronológico de todos los cargos y pagos.</CardDescription>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch gap-2">
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full sm:w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}` : format(dateRange.from, "dd/MM/yy")) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} locale={es} />
                <div className="p-2 border-t flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsDatePickerOpen(false)}>Cancelar</Button>
                  <Button onClick={handleApplyDateRange}>Aceptar</Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex gap-2">
              <Button onClick={onAddDebt} variant="destructive" size="sm" className="flex-1">
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cargo
              </Button>
              <Button onClick={onRegisterPayment} size="sm" className="flex-1">
                  <HandCoins className="mr-2 h-4 w-4" /> Registrar Pago
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {!calculationPreCheck.canCalculate && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Faltan Datos para Calcular la Renta</AlertTitle>
                <AlertDescription>
                  {calculationPreCheck.reason}
                </AlertDescription>
              </Alert>
            )}

            {transactions.length > 0 && (
              <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-t-lg font-bold text-sm">
                  <div className="flex-1">Totales del Periodo:</div>
                  <div className="flex-1 text-right text-destructive">Cargo: {formatCurrency(periodTotals.charge)}</div>
                  <div className="flex-1 text-right text-green-600">Abono: {formatCurrency(periodTotals.payment)}</div>
                  <div className="flex-1 text-right">Balance: {formatCurrency(periodTotals.payment - periodTotals.charge)}</div>
              </div>
            )}

            <div className="rounded-md border-t-0 border rounded-b-lg overflow-x-auto">
              <Table>
                <TableHeader className="bg-black"><TableRow>
                  <TableHead className="text-white">Fecha</TableHead>
                  <TableHead className="text-white">Descripción</TableHead>
                  <TableHead className="text-right text-white">Cargo</TableHead>
                  <TableHead className="text-right text-white">Abono</TableHead>
                  <TableHead className="text-right text-white">Balance</TableHead>
                  <TableHead className="text-right text-white">Acciones</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {transactions.length > 0 ? (
                    transactions.map((t, index) => (
                      <TableRow key={index}>
                        <TableCell>{format(t.date, "dd MMM yyyy", { locale: es })}</TableCell>
                        <TableCell>
                          {t.description}
                          {t.isManualDebt && <Badge variant="destructive" className="ml-2">Cargo Manual</Badge>}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {t.charge > 0 ? formatCurrency(t.charge) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {t.payment > 0 ? formatCurrency(t.payment) : '-'}
                        </TableCell>
                        <TableCell className={cn("text-right font-bold", t.balance >= 0 ? "text-green-700" : "text-red-700")}>
                          {formatCurrency(t.balance)}
                        </TableCell>
                        <TableCell className="text-right">
                          {t.isManualDebt && t.originalDebt && (
                            <>
                              <Button variant="ghost" size="icon" className="mr-2" onClick={() => onEditDebt(t.originalDebt!)}><Edit className="h-4 w-4" /></Button>
                              <ConfirmDialog
                                triggerButton={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                                title="¿Eliminar Adeudo?"
                                description={`Se eliminará el cargo de "${t.description}" por ${formatCurrency(t.charge)}. Esta acción no se puede deshacer.`}
                                onConfirm={() => onDeleteDebt(t.originalDebt!.id)}
                              />
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No hay movimientos registrados en el periodo seleccionado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
