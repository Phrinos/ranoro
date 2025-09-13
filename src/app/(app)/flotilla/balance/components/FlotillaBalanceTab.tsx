// src/app/(app)/flotilla/balance/components/FlotillaBalanceTab.tsx
"use client";

import React, { useMemo } from 'react';
import type { Driver, Vehicle, DailyRentalCharge, RentalPayment, ManualDebtEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface FlotillaBalanceTabProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  dailyCharges: DailyRentalCharge[];
  payments: RentalPayment[];
  manualDebts: ManualDebtEntry[];
}

export function FlotillaBalanceTab({ drivers, vehicles, dailyCharges, payments, manualDebts }: FlotillaBalanceTabProps) {
  const router = useRouter();

  const driverBalances = useMemo(() => {
    const activeDrivers = drivers.filter(d => !d.isArchived);
    
    return activeDrivers.map(driver => {
      const driverCharges = dailyCharges.filter(c => c.driverId === driver.id).reduce((sum, c) => sum + c.amount, 0);
      const driverDebts = manualDebts.filter(d => d.driverId === driver.id).reduce((sum, d) => sum + d.amount, 0);
      const driverPayments = payments.filter(p => p.driverId === driver.id).reduce((sum, p) => sum + p.amount, 0);
      
      const totalCharges = driverCharges + driverDebts;
      const balance = driverPayments - totalCharges;
      
      return {
        id: driver.id,
        name: driver.name,
        totalCharges,
        totalPayments: driverPayments,
        balance,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [drivers, dailyCharges, payments, manualDebts]);

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
                                <TableHead className="text-white font-bold">Conductor</TableHead>
                                <TableHead className="text-right text-white font-bold">Total Cargos</TableHead>
                                <TableHead className="text-right text-white font-bold">Total Abonos</TableHead>
                                <TableHead className="text-right text-white font-bold">Balance Actual</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {driverBalances.length > 0 ? (
                                driverBalances.map(item => (
                                    <TableRow key={item.id} onClick={() => handleRowClick(item.id)} className="cursor-pointer">
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right text-destructive">{formatCurrency(item.totalCharges)}</TableCell>
                                        <TableCell className="text-right text-green-600">{formatCurrency(item.totalPayments)}</TableCell>
                                        <TableCell className={cn("text-right font-bold", item.balance >= 0 ? 'text-green-700' : 'text-red-700')}>
                                            {formatCurrency(item.balance)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
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
