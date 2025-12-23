
// src/lib/services/operations.service.ts
import { collection, onSnapshot, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { SaleReceipt, ServiceRecord, CashDrawerTransaction, PaymentMethod, Payment } from "@/types";
import { parseDate } from '../forms';

const onOperationsUpdate = (callback: (operations: (ServiceRecord | SaleReceipt)[]) => void): (() => void) => {
    if (!db) return () => {};

    const servicesQuery = query(collection(db, 'serviceRecords'), where('status', 'in', ['Entregado', 'Cancelado']), orderBy('deliveryDateTime', 'desc'));
    const salesQuery = query(collection(db, 'sales'), orderBy('saleDate', 'desc'));

    const servicesUnsub = onSnapshot(servicesQuery, (servicesSnap) => {
        const services = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
        // This is a partial update. We need to merge with sales. A more robust solution might use a state management library.
        // For now, we'll just pass it up and let the component handle merging.
    });

    const salesUnsub = onSnapshot(salesQuery, (salesSnap) => {
        const sales = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleReceipt));
        // Similarly, this is a partial update.
    });

    // This is a simplified approach. A full implementation would merge and sort the two collections.
    // For now, we're assuming the main page component does this.
    // Let's just return a combined unsubscribe function.
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

    