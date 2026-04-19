// src/app/(app)/administracion/hooks/use-admin-data.ts
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebaseClient";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import type { ServiceRecord, SaleReceipt, User, CashDrawerTransaction } from "@/types";

// ── Tipos nuevos ──────────────────────────────────────────────────────────────

export interface DailyCut {
  id: string;
  date: string;             // 'YYYY-MM-DD'
  income: number;
  expenses: number;
  netBalance: number;
  breakdown: {
    cash: { income: number; expenses: number; net: number };
    card: { income: number; expenses: number; net: number };
    transfer: { income: number; expenses: number; net: number };
  };
  bySource: Record<string, { total: number; count: number }>;
  transactionCount: number;
  closedBy: string;
  closedByName: string;
  closedAt: string;
  notes?: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: "mensual" | "quincenal" | "semanal";
  nextDueDate?: string;
  isActive: boolean;
}

export interface AdminPurchase {
  id: string;
  invoiceDate: string;
  invoiceTotal: number;
  supplierId: string;
  supplierName: string;
  paymentMethod: string;
  [k: string]: any;
}

// Tipos de transacción que pertenecen a Flotilla — se excluyen del corte de taller
const FLOTILLA_TYPES = new Set(["Flotilla", "GastoVehiculo", "RetiroSocio", "OwnerWithdrawal"]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function tsToIso(v: any): string | undefined {
  if (!v) return undefined;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === "string") return v;
  return undefined;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface AdminData {
  services: ServiceRecord[];
  sales: SaleReceipt[];
  cashTransactions: CashDrawerTransaction[];   // Solo taller (filtrado)
  users: User[];
  fixedExpenses: FixedExpense[];
  purchases: AdminPurchase[];
  dailyCuts: DailyCut[];
  isLoading: boolean;
}

export function useAdminData(): AdminData {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [sales, setSales] = useState<SaleReceipt[]>([]);
  const [allCashTxs, setAllCashTxs] = useState<CashDrawerTransaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [purchases, setPurchases] = useState<AdminPurchase[]>([]);
  const [dailyCuts, setDailyCuts] = useState<DailyCut[]>([]);
  const [loadCount, setLoadCount] = useState(0);

  const isLoading = loadCount < 7;
  const done = () => setLoadCount((c) => c + 1);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(
      query(collection(db, "serviceRecords"), orderBy("createdAt", "desc")),
      (snap) => { setServices(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))); done(); }
    ));

    unsubs.push(onSnapshot(
      query(collection(db, "sales"), orderBy("saleDate", "desc")),
      (snap) => { setSales(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))); done(); }
    ));

    unsubs.push(onSnapshot(
      query(collection(db, "cashDrawerTransactions"), orderBy("date", "desc")),
      (snap) => {
        setAllCashTxs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        done();
      }
    ));

    unsubs.push(onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      done();
    }));

    unsubs.push(onSnapshot(collection(db, "fixedExpenses"), (snap) => {
      setFixedExpenses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as FixedExpense)));
      done();
    }));

    unsubs.push(onSnapshot(
      query(collection(db, "purchases"), orderBy("invoiceDate", "desc")),
      (snap) => { setPurchases(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as AdminPurchase))); done(); }
    ));

    unsubs.push(onSnapshot(
      query(collection(db, "dailyCuts"), orderBy("date", "desc")),
      (snap) => {
        setDailyCuts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any), closedAt: tsToIso((d.data() as any).closedAt) ?? "" })));
        done();
      }
    ));

    return () => unsubs.forEach((u) => u());
  }, []);

  // Filtra transacciones: solo del taller, excluye flotilla
  const cashTransactions = useMemo(
    () => allCashTxs.filter((t) => !FLOTILLA_TYPES.has(t.relatedType ?? t.type ?? "")),
    [allCashTxs]
  );

  return { services, sales, cashTransactions, users, fixedExpenses, purchases, dailyCuts, isLoading };
}
