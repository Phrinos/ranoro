

import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  query,
  DocumentReference,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { CashDrawerTransaction, InitialCashBalance } from "@/types";
import { cleanObjectForFirestore } from '../forms';

const setInitialCashBalance = async (balanceData: Omit<InitialCashBalance, 'id'>): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const { date, ...restData } = balanceData;
    const docId = new Date(date).toISOString().split('T')[0];
    const docRef = doc(db, 'initialCashBalances', docId);
    await setDoc(docRef, { date, ...restData }, { merge: true });
};

const addCashTransaction = async (transactionData: Omit<CashDrawerTransaction, 'id' | 'date'> & { date?: string }): Promise<CashDrawerTransaction> => {
    if (!db) throw new Error("Database not initialized.");
    const dataToSave = {
        ...transactionData,
        date: transactionData.date || new Date().toISOString(),
    };
    const cleanedData = cleanObjectForFirestore(dataToSave);
    const docRef = await addDoc(collection(db, 'cashDrawerTransactions'), cleanedData);
    return { id: docRef.id, ...dataToSave } as CashDrawerTransaction;
};

const deleteCashTransaction = async (transactionId: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await deleteDoc(doc(db, 'cashDrawerTransactions', transactionId));
};

const onCashTransactionsUpdate = (callback: (transactions: CashDrawerTransaction[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'cashDrawerTransactions'), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashDrawerTransaction)));
    }, (error) => {
        console.error("Error listening to cash transactions:", error.message);
        callback([]);
    });
};


export const cashService = {
  setInitialCashBalance,
  addCashTransaction,
  deleteCashTransaction,
  onCashTransactionsUpdate,
};
