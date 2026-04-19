// src/app/(app)/flotilla/hooks/use-fleet-data.ts
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  isValid,
} from "date-fns";
import { inventoryService, personnelService } from "@/lib/services";
import { rentalService } from "@/lib/services/rental.service";
import type {
  Driver,
  Vehicle,
  DailyRentalCharge,
  RentalPayment,
  ManualDebtEntry,
  OwnerWithdrawal,
  VehicleExpense,
} from "@/types";
import type { FleetMonthlyBalance } from "@/lib/services/rental.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseFleetDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isValid(val) ? val : null;
  if (typeof val === "string") {
    try {
      const d = parseISO(val);
      return isValid(d) ? d : null;
    } catch {
      return null;
    }
  }
  if (val?.seconds) {
    const d = new Date(val.seconds * 1000);
    return isValid(d) ? d : null;
  }
  return null;
}

function inMonth(
  dateVal: any,
  interval: { start: Date; end: Date }
): boolean {
  const d = parseFleetDate(dateVal);
  return !!d && isWithinInterval(d, interval);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriverMonthSummary {
  driverId: string;
  driverName: string;
  vehiclePlate: string;
  vehicleName: string;
  vehicle: Vehicle | null;
  dailyRate: number;
  charges: number; // sum of dailyRentalCharges
  debts: number;   // sum of manualDebts
  totalCharges: number; // charges + debts
  payments: number; // sum of payments
  carryover: number; // from fleetMonthlyBalances
  balance: number; // payments - totalCharges + carryover
  daysGenerated: number;
  lastPayment: RentalPayment | null;
}

export interface MonthTotals {
  totalCharges: number;
  totalPayments: number;
  balance: number;
  carryover: number;
  expenses: number;
  withdrawals: number;
  utility: number; // payments - expenses - withdrawals
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface FleetData {
  // Raw collections
  drivers: Driver[];
  vehicles: Vehicle[];
  charges: DailyRentalCharge[];
  payments: RentalPayment[];
  debts: ManualDebtEntry[];
  expenses: VehicleExpense[];
  withdrawals: OwnerWithdrawal[];
  monthlyBalances: FleetMonthlyBalance[];
  isLoading: boolean;

  // Computed helpers
  getDriverVehicle: (driverId: string) => Vehicle | null;
  getDriverMonthSummaries: (month: string) => DriverMonthSummary[];
  getMonthTotals: (month: string, summaries: DriverMonthSummary[]) => MonthTotals;
  getDriverPaymentsInMonth: (driverId: string, month: string) => RentalPayment[];
  getDriverChargesInMonth: (driverId: string, month: string) => DailyRentalCharge[];
  getDriverDebtsInMonth: (driverId: string, month: string) => ManualDebtEntry[];
  fleetVehicles: Vehicle[];
  activeDrivers: Driver[];
  ownerNames: string[];
}

export function useFleetData(selectedMonth?: string): FleetData {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [charges, setCharges] = useState<DailyRentalCharge[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [debts, setDebts] = useState<ManualDebtEntry[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [monthlyBalances, setMonthlyBalances] = useState<FleetMonthlyBalance[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);

  const month = selectedMonth ?? format(new Date(), "yyyy-MM");

  useEffect(() => {
    let count = 0;
    const tick = () => { count++; setLoadedCount(count); };

    const unsubs = [
      inventoryService.onVehiclesUpdate((d) => { setVehicles(d); tick(); }),
      personnelService.onDriversUpdate((d) => { setDrivers(d); tick(); }),
      rentalService.onDailyChargesUpdate((d) => { setCharges(d); tick(); }),
      rentalService.onRentalPaymentsUpdate((d) => { setPayments(d); tick(); }),
      personnelService.onManualDebtsUpdate((d) => { setDebts(d); tick(); }),
      rentalService.onOwnerWithdrawalsUpdate((d) => { setWithdrawals(d); tick(); }),
      rentalService.onVehicleExpensesUpdate((d) => { setExpenses(d); tick(); }),
    ];

    return () => unsubs.forEach((u) => u());
  }, []);

  // Monthly balances subscription (changes with selected month)
  useEffect(() => {
    const unsub = rentalService.onMonthlyBalancesUpdate(setMonthlyBalances, month);
    return () => unsub();
  }, [month]);

  const isLoading = loadedCount < 7;

  // ── Derived helpers ──
  const fleetVehicles = useMemo(
    () => vehicles.filter((v) => v.isFleetVehicle),
    [vehicles]
  );

  const activeDrivers = useMemo(
    () => drivers.filter((d) => !d.isArchived),
    [drivers]
  );

  const ownerNames = useMemo(
    () => [...new Set(fleetVehicles.map((v) => v.ownerName).filter(Boolean) as string[])],
    [fleetVehicles]
  );

  const getDriverVehicle = useMemo(
    () => (driverId: string): Vehicle | null => {
      const driver = drivers.find((d) => d.id === driverId);
      if (!driver?.assignedVehicleId) return null;
      return vehicles.find((v) => v.id === driver.assignedVehicleId) ?? null;
    },
    [drivers, vehicles]
  );

  const getInterval = (m: string) => {
    const [year, mon] = m.split("-").map(Number);
    const d = new Date(year, mon - 1, 1);
    return { start: startOfMonth(d), end: endOfMonth(d) };
  };

  const getDriverPaymentsInMonth = useMemo(
    () => (driverId: string, m: string): RentalPayment[] => {
      const interval = getInterval(m);
      return payments.filter(
        (p) =>
          p.driverId === driverId &&
          inMonth(p.paymentDate || p.date, interval)
      );
    },
    [payments]
  );

  const getDriverChargesInMonth = useMemo(
    () => (driverId: string, m: string): DailyRentalCharge[] => {
      const interval = getInterval(m);
      return charges.filter(
        (c) => c.driverId === driverId && inMonth(c.date, interval)
      );
    },
    [charges]
  );

  const getDriverDebtsInMonth = useMemo(
    () => (driverId: string, m: string): ManualDebtEntry[] => {
      const interval = getInterval(m);
      return debts.filter(
        (d) => d.driverId === driverId && inMonth(d.date, interval)
      );
    },
    [debts]
  );

  const getDriverMonthSummaries = useMemo(
    () => (m: string): DriverMonthSummary[] => {
      const interval = getInterval(m);
      const assignedDrivers = activeDrivers.filter((d) => d.assignedVehicleId);

      return assignedDrivers.map((driver) => {
        const vehicle = vehicles.find((v) => v.id === driver.assignedVehicleId) ?? null;
        const dailyRate = vehicle?.dailyRentalCost ?? 0;

        const monthCharges = charges
          .filter((c) => c.driverId === driver.id && inMonth(c.date, interval));
        const monthDebts = debts
          .filter((d) => d.driverId === driver.id && inMonth(d.date, interval));
        const monthPayments = payments
          .filter((p) => p.driverId === driver.id && inMonth(p.paymentDate || p.date, interval));

        const carryoverDoc = monthlyBalances.find((b) => b.driverId === driver.id);
        const carryover = carryoverDoc?.carryoverBalance ?? 0;

        const chargesSum = monthCharges.reduce((s, c) => s + c.amount, 0);
        const debtsSum = monthDebts.reduce((s, d) => s + d.amount, 0);
        const paymentsSum = monthPayments.reduce((s, p) => s + p.amount, 0);
        const totalCharges = chargesSum + debtsSum;
        const balance = paymentsSum - totalCharges + carryover;
        const daysGenerated = dailyRate > 0 ? Math.round(chargesSum / dailyRate) : 0;

        const lastPayment = monthPayments.length > 0
          ? monthPayments.reduce((latest, cur) => {
              const ct = parseFleetDate(cur.paymentDate || cur.date)?.getTime() ?? 0;
              const lt = parseFleetDate(latest.paymentDate || latest.date)?.getTime() ?? 0;
              return ct > lt ? cur : latest;
            })
          : null;

        return {
          driverId: driver.id,
          driverName: driver.name,
          vehiclePlate: vehicle?.licensePlate ?? "—",
          vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : "—",
          vehicle,
          dailyRate,
          charges: chargesSum,
          debts: debtsSum,
          totalCharges,
          payments: paymentsSum,
          carryover,
          balance,
          daysGenerated,
          lastPayment,
        };
      });
    },
    [activeDrivers, vehicles, charges, debts, payments, monthlyBalances]
  );

  const getMonthTotals = useMemo(
    () => (m: string, summaries: DriverMonthSummary[]): MonthTotals => {
      const interval = getInterval(m);
      const totalCharges = summaries.reduce((s, d) => s + d.totalCharges, 0);
      const totalPayments = summaries.reduce((s, d) => s + d.payments, 0);
      const balance = summaries.reduce((s, d) => s + d.balance, 0);
      const carryover = summaries.reduce((s, d) => s + d.carryover, 0);
      const expensesTotal = expenses
        .filter((e) => inMonth(e.date, interval))
        .reduce((s, e) => s + e.amount, 0);
      const withdrawalsTotal = withdrawals
        .filter((w) => inMonth(w.date, interval))
        .reduce((s, w) => s + w.amount, 0);

      return {
        totalCharges,
        totalPayments,
        balance,
        carryover,
        expenses: expensesTotal,
        withdrawals: withdrawalsTotal,
        utility: totalPayments - expensesTotal - withdrawalsTotal,
      };
    },
    [expenses, withdrawals]
  );

  return {
    drivers,
    vehicles,
    charges,
    payments,
    debts,
    expenses,
    withdrawals,
    monthlyBalances,
    isLoading,
    getDriverVehicle,
    getDriverMonthSummaries,
    getMonthTotals,
    getDriverPaymentsInMonth,
    getDriverChargesInMonth,
    getDriverDebtsInMonth,
    fleetVehicles,
    activeDrivers,
    ownerNames,
  };
}
