// src/app/(app)/flotilla/balance/components/FlotillaBalanceTab.tsx
"use client";

import React, { useMemo, useState } from 'react';
import type { Driver, Vehicle, DailyRentalCharge, RentalPayment, ManualDebtEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn, capitalizeWords } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { format, parseISO, isValid, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import { parseDate } from '@/lib/forms';

const toTime = (d?: string | Date | null) => {
  if (!d) return 0;
  const parsed = d instanceof Date ? d : new Date(d);
  return isValid(parsed) ? parsed.getTime() : 0;
};

interface FlotillaBalanceTabProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  dailyCharges: DailyRentalCharge[];
  payments: RentalPayment[];
  manualDebts: ManualDebtEntry[];
}

type SortKey = 'name' | 'totalCharges' | 'totalPayments' | 'balance' | 'lastPaymentDate';

const generateMonthOptions = () => {
    const options = [{ value: 'all', label: 'Histórico Total' }];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const value = format(date, 'yyyy-MM');
        const label = capitalizeWords(format(date, 'MMMM yyyy', { locale: es }));
        options.push({ value, label });
    }
    return options;
};

export function FlotillaBalanceTab({ drivers, dailyCharges, payments, manualDebts }: FlotillaBalanceTabProps) {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const driverBalances = useMemo(() => {
    const activeDrivers = drivers.filter(d => !d.isArchived);
    
    // Configuración del intervalo de fechas si no es "Histórico"
    let interval: { start: Date; end: Date } | null = null;
    if (selectedMonth !== 'all') {
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = startOfMonth(new Date(year, month - 1));
        interval = { start: startDate, end: endOfMonth(startDate) };
    }

    const balances = activeDrivers.map(driver => {
      // Filtrar cargos por mes
      const driverCharges = dailyCharges.filter(c => {
          if (c.driverId !== driver.id) return false;
          if (!interval) return true;
          const d = parseDate(c.date);
          return d && isWithinInterval(d, interval);
      }).reduce((sum, c) => sum + c.amount, 0);

      // Filtrar deudas manuales por mes
      const driverDebts = manualDebts.filter(d => {
          if (d.driverId !== driver.id) return false;
          if (!interval) return true;
          const dt = parseDate(d.date);
          return dt && isWithinInterval(dt, interval);
      }).reduce((sum, d) => sum + d.amount, 0);

      // Filtrar pagos por mes
      const driverPayments = payments.filter(p => {
          if (p.driverId !== driver.id) return false;
          if (!interval) return true;
          const dt = parseDate(p.paymentDate || p.date);
          return dt && isWithinInterval(dt, interval);
      });
      
      const totalPaymentsAmount = driverPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalCharges = driverCharges + driverDebts;
      const balance = totalPaymentsAmount - totalCharges;

      const lastPayment = driverPayments.length > 0 
        ? driverPayments.reduce((latest, current) => 
            toTime(current.paymentDate || current.date) > toTime(latest.paymentDate || latest.date) ? current : latest
          ) 
        : null;
      
      return {
        id: driver.id,
        name: driver.name,
        totalCharges,
        totalPayments: totalPaymentsAmount,
        balance,
        lastPaymentDate: lastPayment ? (lastPayment.paymentDate || lastPayment.date) : null,
      };
    });

    balances.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        
        let comparison = 0;
        if (valA === null || valA === undefined) comparison = 1;
        else if (valB === null || valB === undefined) comparison = -1;
        else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
            if (sortConfig.key === 'lastPaymentDate') {
                 const dateA = toTime(valA);
                 const dateB = toTime(valB);
                 comparison = dateA - dateB;
            } else {
                 comparison = valA.localeCompare(valB, 'es', { numeric: true });
            }
        }
        
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });

    return balances;

  }, [drivers, dailyCharges, payments, manualDebts, sortConfig, selectedMonth]);
  
  const requestSort = (key: string) => {
    const sortKey = key as SortKey;
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === sortKey && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key: sortKey, direction });
  };

  const handleRowClick = (driverId: string) => {
    router.push(`/flotilla/conductores/${driverId}?tab=history`);
  };

  return (
    <div className="space-y-4">
        <div className="flex justify-end items-center gap-4">
            <p className="text-sm text-muted-foreground hidden sm:block">Filtrar Balance por Mes:</p>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[220px] bg-card">
                    <SelectValue placeholder="Seleccionar mes..." />
                </SelectTrigger>
                <SelectContent>
                    {monthOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Balance de Conductores - {selectedMonth === 'all' ? 'Histórico' : monthOptions.find(o => o.value === selectedMonth)?.label}</CardTitle>
                <CardDescription>
                    {selectedMonth === 'all' 
                        ? 'Resumen financiero total acumulado.' 
                        : `Cargos y abonos registrados durante ${monthOptions.find(o => o.value === selectedMonth)?.label}.`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader className="bg-black">
                            <TableRow className="hover:bg-transparent">
                                <SortableTableHeader sortKey="name" label="Conductor" onSort={requestSort} currentSort={`${sortConfig.key}_${sortConfig.direction}`} textClassName="text-white" />
                                <SortableTableHeader sortKey="totalCharges" label="Cargos" onSort={requestSort} currentSort={`${sortConfig.key}_${sortConfig.direction}`} className="justify-end" textClassName="text-white"/>
                                <SortableTableHeader sortKey="totalPayments" label="Abonos" onSort={requestSort} currentSort={`${sortConfig.key}_${sortConfig.direction}`} className="justify-end" textClassName="text-white"/>
                                <SortableTableHeader sortKey="balance" label="Balance Mes" onSort={requestSort} currentSort={`${sortConfig.key}_${sortConfig.direction}`} className="justify-end" textClassName="text-white"/>
                                <SortableTableHeader sortKey="lastPaymentDate" label="Último Pago" onSort={requestSort} currentSort={`${sortConfig.key}_${sortConfig.direction}`} className="hidden md:table-cell justify-end" textClassName="text-white"/>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {driverBalances.length > 0 ? (
                                driverBalances.map(item => {
                                  const lastPaymentDate = item.lastPaymentDate ? parseISO(item.lastPaymentDate) : null;
                                  return (
                                    <TableRow key={item.id} onClick={() => handleRowClick(item.id)} className="cursor-pointer hover:bg-muted/50">
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right text-destructive font-medium">{formatCurrency(item.totalCharges)}</TableCell>
                                        <TableCell className="text-right text-green-600 font-medium">{formatCurrency(item.totalPayments)}</TableCell>
                                        <TableCell className={cn("text-right font-bold", item.balance >= 0 ? 'text-green-700' : 'text-red-700')}>
                                            {formatCurrency(item.balance)}
                                        </TableCell>
                                        <TableCell className="text-right hidden md:table-cell">
                                          {lastPaymentDate && isValid(lastPaymentDate) ? format(lastPaymentDate, 'dd MMM yyyy', { locale: es }) : '—'}
                                        </TableCell>
                                    </TableRow>
                                  )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No hay datos de conductores para mostrar en este periodo.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
