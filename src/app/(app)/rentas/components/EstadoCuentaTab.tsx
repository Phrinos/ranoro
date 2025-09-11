
// src/app/(app)/rentas/components/EstadoCuentaTab.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { ListFilter } from 'lucide-react';
import type { Driver, RentalPayment, Vehicle, ManualDebtEntry } from '@/types';
import { format, parseISO, isAfter, startOfMonth, differenceInCalendarDays, getDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, calculateDriverDebt, cn } from "@/lib/utils";

type BalanceSortOption = 'driverName_asc' | 'driverName_desc' | 'daysOwed_desc' | 'daysOwed_asc' | 'balance_desc' | 'balance_asc';

interface MonthlyBalance {
  driverId: string;
  driverName: string;
  vehicleInfo: string;
  payments: number;
  charges: number;
  daysPaid: number;
  daysOwed: number;
  balance: number;
  realBalance: number;
}

interface EstadoCuentaTabProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  payments: RentalPayment[];
  manualDebts: ManualDebtEntry[];
}

export function EstadoCuentaTab({ drivers, vehicles, payments, manualDebts }: EstadoCuentaTabProps) {
  const [balanceSortOption, setBalanceSortOption] = useState<BalanceSortOption>('daysOwed_desc');
  const router = useRouter();

  const monthlyBalances = useMemo((): MonthlyBalance[] => {
    const today = new Date();
    const monthStart = startOfMonth(today);

    return drivers.filter(d => !d.isArchived).map(driver => {
        const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
        const dailyRate = vehicle?.dailyRentalCost || 0;
        const driverDebts = manualDebts.filter(d => d.driverId === driver.id);
        const driverPayments = payments.filter(p => p.driverId === driver.id);

        const paymentsThisMonth = driverPayments
            .filter(p => isAfter(parseISO(p.paymentDate), monthStart))
            .reduce((sum, p) => sum + p.amount, 0);

        const daysPaidThisMonth = dailyRate > 0 ? paymentsThisMonth / dailyRate : 0;
        
        const contractStartDate = driver.contractDate ? parseISO(driver.contractDate) : today;
        const calculationStartDate = isAfter(contractStartDate, monthStart) ? contractStartDate : monthStart;

        const daysToChargeThisMonth = !isAfter(calculationStartDate, today) ? differenceInCalendarDays(today, calculationStartDate) + 1 : 0;
        const chargesThisMonth = dailyRate * daysToChargeThisMonth;

        const monthlyBalance = paymentsThisMonth - chargesThisMonth;
        
        const debtInfo = calculateDriverDebt(driver, driverPayments, vehicle ? [vehicle] : [], driverDebts);
        const realBalance = debtInfo.balance - debtInfo.totalDebt;

        const rentalDebtThisMonth = Math.max(0, -monthlyBalance);
        const daysOwed = dailyRate > 0 ? rentalDebtThisMonth / dailyRate : 0;

        return {
            driverId: driver.id,
            driverName: driver.name,
            vehicleInfo: vehicle ? `${vehicle.licensePlate} (${formatCurrency(dailyRate)}/día)` : 'N/A',
            payments: paymentsThisMonth,
            charges: chargesThisMonth,
            daysPaid: daysPaidThisMonth,
            daysOwed,
            balance: monthlyBalance,
            realBalance,
        };
    }).sort((a, b) => {
        switch (balanceSortOption) {
            case 'driverName_asc': return a.driverName.localeCompare(b.driverName);
            case 'driverName_desc': return b.driverName.localeCompare(a.driverName);
            case 'daysOwed_desc': return b.daysOwed - a.daysOwed;
            case 'daysOwed_asc': return a.daysOwed - b.daysOwed;
            case 'balance_desc': return b.realBalance - a.realBalance;
            case 'balance_asc': return a.realBalance - b.realBalance;
            default: return b.daysOwed - a.daysOwed;
        }
    });
  }, [drivers, vehicles, payments, manualDebts, balanceSortOption]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Estado de Cuenta Mensual</CardTitle>
            <CardDescription>Resumen de saldos de todos los conductores para el mes de {format(new Date(), "MMMM", { locale: es })}.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ListFilter className="mr-2 h-4 w-4" />
                  Ordenar por
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={balanceSortOption} onValueChange={(v) => setBalanceSortOption(v as BalanceSortOption)}>
                  <DropdownMenuRadioItem value="daysOwed_desc">Mayor Adeudo</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="daysOwed_asc">Menor Adeudo</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="driverName_asc">Conductor (A-Z)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="driverName_desc">Conductor (Z-A)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="balance_desc">Mejor Balance (Mes)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="balance_asc">Peor Balance (Mes)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-sm text-muted-foreground">Día {getDate(new Date())} del mes</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader className="bg-black">
              <TableRow>
                <TableHead className="text-white">Conductor</TableHead>
                <TableHead className="text-white">Vehículo</TableHead>
                <TableHead className="text-right text-white">Pagos (Mes)</TableHead>
                <TableHead className="text-right text-white">Cargos (Mes)</TableHead>
                <TableHead className="text-right text-white">Balance (Mes)</TableHead>
                <TableHead className="text-right text-white">Balance Real</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyBalances.length > 0 ? (
                monthlyBalances.map(mb => (
                  <TableRow key={mb.driverId} className={cn("cursor-pointer hover:bg-muted/50", mb.realBalance < 0 && "bg-red-50 dark:bg-red-900/30")} onClick={() => router.push(`/conductores/${mb.driverId}`)}>
                    <TableCell className="font-semibold">{mb.driverName}</TableCell>
                    <TableCell>{mb.vehicleInfo}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(mb.payments)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(mb.charges)}</TableCell>
                    <TableCell className={cn("text-right font-bold", mb.balance >= 0 ? "text-green-700" : "text-red-700")}>{formatCurrency(mb.balance)}</TableCell>
                    <TableCell className={cn("text-right font-bold", mb.realBalance >= 0 ? "text-green-700" : "text-red-700")}>{formatCurrency(mb.realBalance)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">No hay conductores activos.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
