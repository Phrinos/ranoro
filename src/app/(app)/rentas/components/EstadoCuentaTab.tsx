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

type BalanceSortOption = 'driverName_asc' | 'driverName_desc' | 'balance_desc' | 'balance_asc';

interface DriverBalance {
  driverId: string;
  driverName: string;
  vehicleInfo: string;
  balance: number;
}

interface EstadoCuentaTabProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  payments: RentalPayment[];
  manualDebts: ManualDebtEntry[];
}

export function EstadoCuentaTab({ drivers, vehicles, payments, manualDebts }: EstadoCuentaTabProps) {
  const [balanceSortOption, setBalanceSortOption] = useState<BalanceSortOption>('balance_asc');
  const router = useRouter();

  const driverBalances = useMemo((): DriverBalance[] => {
    return drivers.filter(d => !d.isArchived).map(driver => {
        const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
        const driverDebts = manualDebts.filter(d => d.driverId === driver.id);
        const driverPayments = payments.filter(p => p.driverId === driver.id);

        const debtInfo = calculateDriverDebt(driver, driverPayments, vehicle ? [vehicle] : [], driverDebts);
        const currentBalance = debtInfo.balance - debtInfo.totalDebt;

        return {
            driverId: driver.id,
            driverName: driver.name,
            vehicleInfo: vehicle ? `${vehicle.licensePlate} (${formatCurrency(vehicle.dailyRentalCost || 0)}/día)` : 'N/A',
            balance: currentBalance,
        };
    }).sort((a, b) => {
        switch (balanceSortOption) {
            case 'driverName_asc': return a.driverName.localeCompare(b.driverName);
            case 'driverName_desc': return b.driverName.localeCompare(a.driverName);
            case 'balance_desc': return b.balance - a.balance;
            case 'balance_asc': return a.balance - b.balance;
            default: return a.balance - b.balance;
        }
    });
  }, [drivers, vehicles, payments, manualDebts, balanceSortOption]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Estado de Cuenta General</CardTitle>
            <CardDescription>Resumen de saldos históricos de todos los conductores activos.</CardDescription>
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
                  <DropdownMenuRadioItem value="balance_asc">Mayor Adeudo</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="balance_desc">Mayor Saldo a Favor</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="driverName_asc">Conductor (A-Z)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="driverName_desc">Conductor (Z-A)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
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
                <TableHead className="text-right text-white">Saldo Actual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driverBalances.length > 0 ? (
                driverBalances.map(db => (
                  <TableRow key={db.driverId} className={cn("cursor-pointer hover:bg-muted/50", db.balance < 0 && "bg-red-50 dark:bg-red-900/30")} onClick={() => router.push(`/conductores/${db.driverId}`)}>
                    <TableCell className="font-semibold">{db.driverName}</TableCell>
                    <TableCell>{db.vehicleInfo}</TableCell>
                    <TableCell className={cn("text-right font-bold", db.balance >= 0 ? "text-green-700" : "text-red-700")}>{formatCurrency(db.balance)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay conductores activos.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
