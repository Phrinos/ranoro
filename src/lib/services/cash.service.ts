

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
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { CashDrawerTransaction, InitialCashBalance } from "@/types";
import { cleanObjectForFirestore } from '../forms';

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

const deleteCashTransaction = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await deleteDoc(doc(db, 'cashDrawerTransactions', id));
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

const onFleetCashEntriesUpdate = (callback: (entries: CashDrawerTransaction[]) => void): (() => void) => {
  if (!db) return () => {};
  // Simplified query to avoid composite index error. Filtering will happen on the client.
  const q = query(
    collection(db, "cashDrawerTransactions"),
    orderBy("date", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const allTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashDrawerTransaction));
    const fleetEntries = allTransactions.filter(t => t.relatedType === 'Flotilla' && t.type === 'Entrada');
    callback(fleetEntries);
  }, (error) => {
    console.error("Error listening to fleet cash entries:", error.message);
    callback([]);
  });
};

const getInitialBalance = async (): Promise<InitialCashBalance | null> => {
    if (!db) return null;
    const docRef = doc(db, 'cashDrawerState', 'initialBalance');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as InitialCashBalance : null;
};

const setInitialBalance = async (balance: number, userId: string, userName: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'cashDrawerState', 'initialBalance');
    const data = { 
        balance,
        date: new Date().toISOString(),
        setByUserId: userId,
        setByUserName: userName,
    };
    await updateDoc(docRef, data);
};

export const cashService = {
  addCashTransaction,
  deleteCashTransaction,
  onCashTransactionsUpdate,
  onFleetCashEntriesUpdate,
  getInitialBalance,
  setInitialBalance,
};
