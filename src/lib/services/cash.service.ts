
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


export const cashService = {
  setInitialCashBalance,
  addCashTransaction,
  deleteCashTransaction,
};
