
"use client";

import React, { useMemo, useState } from 'react';
import type { Driver, DailyRentalCharge, RentalPayment, ManualDebtEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn, capitalizeWords } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { format, parseISO, isValid, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import { parseDate } from '@/lib/forms';

interface BalanceTabProps {
  drivers: Driver[];
  dailyCharges: DailyRentalCharge[];
  payments: RentalPayment[];
  manualDebts: ManualDebtEntry[];
}

const toTime = (d?: string | Date | null) => {
  if (!d) return 0;
  const parsed = d instanceof Date ? d : new Date(d);
  return isValid(parsed) ? parsed.getTime() : 0;
};

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

export default function BalanceTab({ drivers, dailyCharges, payments, manualDebts }: BalanceTabProps) {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [sortOption, setSortOption] = useState('name_asc');

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const driverBalances = useMemo(() => {
    const activeDrivers = drivers.filter(d => !d.isArchived);
    
    let interval: { start: Date; end: Date } | null = null;
    if (selectedMonth !== 'all') {
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        interval = { start: startOfMonth(startDate), end: endOfMonth(startDate) };
    }

    const balances = activeDrivers.map(driver => {
      const driverCharges = dailyCharges.filter(c => {
          if (c.driverId !== driver.id) return false;
          if (!interval) return true;
          const d = parseDate(c.date);
          return d && isWithinInterval(d, interval);
      }).reduce((sum, c) => sum + c.amount, 0);

      const driverDebts = manualDebts.filter(d => {
          if (d.driverId !== driver.id) return false;
          if (!interval) return true;
          const dt = parseDate(d.date);
          return dt && isWithinInterval(dt, interval);
      }).reduce((sum, d) => sum + d.amount, 0);

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

    const [key, direction] = sortOption.split('_');
    balances.sort((a: any, b: any) => {
        const valA = a[key] ?? '';
        const valB = b[key] ?? '';
        
        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        } else {
            comparison = String(valA).localeCompare(String(valB), 'es', { numeric: true });
        }
        
        return direction === 'asc' ? comparison : -comparison;
    });

    return balances;

  }, [drivers, dailyCharges, payments, manualDebts, sortOption, selectedMonth]);
  
  const handleSort = (key: string) => {
    const isAsc = sortOption === `${key}_asc`;
    setSortOption(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  return (
    <div className="space-y-4">
        <div className="flex justify-end items-center gap-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[220px] bg-card">
                    <SelectValue placeholder="Filtrar por Mes" />
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
                <CardTitle>Balance de Conductores</CardTitle>
                <CardDescription>Resumen de cargos y abonos acumulados.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader className="bg-black">
                            <TableRow>
                                <SortableTableHeader sortKey="name" label="Conductor" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
                                <SortableTableHeader sortKey="totalCharges" label="Cargos" onSort={handleSort} currentSort={sortOption} className="justify-end" textClassName="text-white"/>
                                <SortableTableHeader sortKey="totalPayments" label="Abonos" onSort={handleSort} currentSort={sortOption} className="justify-end" textClassName="text-white"/>
                                <SortableTableHeader sortKey="balance" label="Balance" onSort={handleSort} currentSort={sortOption} className="justify-end" textClassName="text-white"/>
                                <SortableTableHeader sortKey="lastPaymentDate" label="Último Pago" onSort={handleSort} currentSort={sortOption} className="hidden md:table-cell justify-end" textClassName="text-white"/>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {driverBalances.map(item => (
                                <TableRow 
                                    key={item.id} 
                                    onClick={() => router.push(`/flotillav2/conductores/${item.id}?tab=history`)} 
                                    className="cursor-pointer hover:bg-muted/50"
                                >
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-right text-destructive">{formatCurrency(item.totalCharges)}</TableCell>
                                    <TableCell className="text-right text-green-600">{formatCurrency(item.totalPayments)}</TableCell>
                                    <TableCell className={cn("text-right font-bold", item.balance >= 0 ? 'text-green-700' : 'text-red-700')}>
                                        {formatCurrency(item.balance)}
                                    </TableCell>
                                    <TableCell className="text-right hidden md:table-cell">
                                      {item.lastPaymentDate ? format(parseISO(item.lastPaymentDate), 'dd/MM/yy', { locale: es }) : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
