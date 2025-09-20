// src/app/(app)/flotilla/balance/components/FlotillaBalanceTab.tsx
"use client";

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { Driver, Vehicle, DailyRentalCharge, RentalPayment, ManualDebtEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rentalService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';


interface FlotillaBalanceTabProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  dailyCharges: DailyRentalCharge[];
  payments: RentalPayment[];
  manualDebts: ManualDebtEntry[];
}

type SortKey = 'name' | 'totalCharges' | 'totalPayments' | 'balance' | 'lastPaymentDate';

export function FlotillaBalanceTab({ drivers, vehicles, dailyCharges, payments, manualDebts }: FlotillaBalanceTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

  const driverBalances = useMemo(() => {
    const activeDrivers = drivers.filter(d => !d.isArchived);
    
    const balances = activeDrivers.map(driver => {
      const driverCharges = dailyCharges.filter(c => c.driverId === driver.id).reduce((sum, c) => sum + c.amount, 0);
      const driverDebts = manualDebts.filter(d => d.driverId === driver.id).reduce((sum, d) => sum + d.amount, 0);
      const driverPayments = payments.filter(p => p.driverId === driver.id);
      
      const totalPaymentsAmount = driverPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalCharges = driverCharges + driverDebts;
      const balance = totalPaymentsAmount - totalCharges;

      const lastPayment = driverPayments.length > 0 
        ? driverPayments.reduce((latest, current) => 
            new Date(current.paymentDate) > new Date(latest.paymentDate) ? current : latest
          ) 
        : null;
      
      return {
        id: driver.id,
        name: driver.name,
        totalCharges,
        totalPayments: totalPaymentsAmount,
        balance,
        lastPaymentDate: lastPayment ? lastPayment.paymentDate : null,
      };
    });

    // Sorting logic
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
                 const dateA = parseISO(valA);
                 const dateB = parseISO(valB);
                 if (isValid(dateA) && isValid(dateB)) {
                    comparison = dateA.getTime() - dateB.getTime();
                 }
            } else {
                 comparison = valA.localeCompare(valB, 'es', { numeric: true });
            }
        }
        
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });

    return balances;

  }, [drivers, dailyCharges, payments, manualDebts, sortConfig]);
  
  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleRowClick = (driverId: string) => {
    router.push(`/flotilla/conductores/${driverId}?tab=history`);
  };

  return (
    <div className="space-y-4">
        <Card>
            <CardHeader>
                <CardTitle>Balance General de Conductores</CardTitle>
                <CardDescription>Resumen financiero de todos los conductores activos.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader className="bg-black">
                            <TableRow>
                                <SortableTableHeader sortKey="name" label="Conductor" onSort={requestSort} currentSort={`${sortConfig.key}_${sortConfig.direction}`} textClassName="text-white" />
                                <SortableTableHeader sortKey="totalCharges" label="Cargos" onSort={requestSort} currentSort={`${sortConfig.key}_${sortConfig.direction}`} className="hidden sm:table-cell justify-end" textClassName="text-white"/>
                                <SortableTableHeader sortKey="totalPayments" label="Abonos" onSort={requestSort} currentSort={`${sortConfig.key}_${sortConfig.direction}`} className="hidden sm:table-cell justify-end" textClassName="text-white"/>
                                <SortableTableHeader sortKey="balance" label="Balance" onSort={requestSort} currentSort={`${sortConfig.key}_${sortConfig.direction}`} className="justify-end" textClassName="text-white"/>
                                <SortableTableHeader sortKey="lastPaymentDate" label="Último Pago" onSort={requestSort} currentSort={`${sortConfig.key}_${sortConfig.direction}`} className="hidden md:table-cell justify-end" textClassName="text-white"/>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {driverBalances.length > 0 ? (
                                driverBalances.map(item => {
                                  const lastPaymentDate = item.lastPaymentDate ? parseISO(item.lastPaymentDate) : null;
                                  return (
                                    <TableRow key={item.id} onClick={() => handleRowClick(item.id)} className="cursor-pointer">
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right text-destructive hidden sm:table-cell">{formatCurrency(item.totalCharges)}</TableCell>
                                        <TableCell className="text-right text-green-600 hidden sm:table-cell">{formatCurrency(item.totalPayments)}</TableCell>
                                        <TableCell className={cn("text-right font-bold", item.balance >= 0 ? 'text-green-700' : 'text-red-700')}>
                                            {formatCurrency(item.balance)}
                                        </TableCell>
                                        <TableCell className="text-right hidden md:table-cell">
                                          {lastPaymentDate && isValid(lastPaymentDate) ? format(lastPaymentDate, 'dd MMM yyyy', { locale: es }) : 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                  )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No hay datos de conductores para mostrar.
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
