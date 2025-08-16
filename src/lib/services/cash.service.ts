

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
import type { CashDrawerTransaction } from "@/types";
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
  const q = query(
    collection(db, "cashDrawerTransactions"),
    where("relatedType", "==", "Flotilla"),
    where("type", "==", "Entrada"),
    orderBy("date", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashDrawerTransaction)));
  }, (error) => {
    console.error("Error listening to fleet cash entries:", error.message);
    callback([]);
  });
};


export const cashService = {
  addCashTransaction,
  onCashTransactionsUpdate,
  onFleetCashEntriesUpdate,
};
