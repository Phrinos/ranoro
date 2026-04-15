
// src/lib/services/operations.service.ts
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { SaleReceipt, ServiceRecord, CashDrawerTransaction, Payment } from "@/types";

/**
 * Subscribes to completed/cancelled services and sales, merging them into a single sorted list.
 * Uses two separate queries (no composite index needed) and merges in memory.
 */
const onOperationsUpdate = (callback: (operations: (ServiceRecord | SaleReceipt)[]) => void): (() => void) => {
    if (!db) return () => {};

    let latestServices: ServiceRecord[] = [];
    let latestSales: SaleReceipt[] = [];

    const mergeAndEmit = () => {
        const combined = [...latestServices, ...latestSales];
        // Sort descending by most relevant date
        combined.sort((a, b) => {
            const dateA = new Date((a as any).deliveryDateTime || (a as any).saleDate || (a as any).serviceDate || 0);
            const dateB = new Date((b as any).deliveryDateTime || (b as any).saleDate || (b as any).serviceDate || 0);
            return dateB.getTime() - dateA.getTime();
        });
        callback(combined);
    };

    // Query 1: Services with terminal statuses. 
    // Using 'in' filter only (single-field) — no composite index needed. Sort in memory.
    const servicesQuery = query(
        collection(db, 'serviceRecords'), 
        where('status', 'in', ['Entregado', 'Cancelado'])
    );

    // Query 2: All sales, ordered by date (single-field index, auto-created).
    const salesQuery = query(
        collection(db, 'sales'), 
        orderBy('saleDate', 'desc')
    );

    const servicesUnsub = onSnapshot(servicesQuery, (snap) => {
        latestServices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
        mergeAndEmit();
    });

    const salesUnsub = onSnapshot(salesQuery, (snap) => {
        latestSales = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleReceipt));
        mergeAndEmit();
    });

    return () => {
        servicesUnsub();
        salesUnsub();
    };
};

const onCashDrawerUpdate = (callback: (transactions: CashDrawerTransaction[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'cashDrawerTransactions'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashDrawerTransaction)));
    });
};

const getAggregatedPaymentData = (records: (ServiceRecord | SaleReceipt)[]): {
    totalIncome: number,
    cashIncome: number,
    cardIncome: number,
    transferIncome: number,
} => {
    let totalIncome = 0;
    let cashIncome = 0;
    let cardIncome = 0;
    let transferIncome = 0;

    const processPayments = (payments: Payment[] | undefined) => {
        if (!payments) return;
        payments.forEach(p => {
            totalIncome += p.amount;
            if (p.method === 'Efectivo') cashIncome += p.amount;
            else if (p.method.includes('Tarjeta')) cardIncome += p.amount;
            else if (p.method === 'Transferencia') transferIncome += p.amount;
        });
    };

    records.forEach(record => {
        if (record.status === 'Cancelado') return;
        processPayments((record as any).payments);
    });

    return { totalIncome, cashIncome, cardIncome, transferIncome };
};


export const operationsService = {
  onOperationsUpdate,
  onCashDrawerUpdate,
  getAggregatedPaymentData,
};
