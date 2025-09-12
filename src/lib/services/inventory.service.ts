

import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  getDocs,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier, Vehicle, MonthlyFixedExpense } from "@/types";
import { cleanObjectForFirestore } from '../forms';

// --- Items ---

const onItemsUpdate = (callback: (items: InventoryItem[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "inventory"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    });
};

const onItemsUpdatePromise = async (): Promise<InventoryItem[]> => {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, "inventory")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
};

const saveItem = async (data: Partial<InventoryItem>, id?: string): Promise<InventoryItem> => {
    if (!db) throw new Error("Database not initialized.");
    if (id) {
        await updateDoc(doc(db, 'inventory', id), cleanObjectForFirestore(data));
        return { ...(await getDoc(doc(db, 'inventory', id))).data(), id } as InventoryItem;
    } else {
        const docRef = await addDoc(collection(db, 'inventory'), cleanObjectForFirestore(data));
        return { ...(await getDoc(docRef)).data(), id: docRef.id } as InventoryItem;
    }
};

const deleteItem = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await deleteDoc(doc(db, "inventory", id));
};

// --- Service Types ---

const onServiceTypesUpdate = (callback: (types: ServiceTypeRecord[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "serviceTypes"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceTypeRecord)));
    });
};

const onServiceTypesUpdatePromise = async (): Promise<ServiceTypeRecord[]> => {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, "serviceTypes")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceTypeRecord));
};

const saveServiceType = async (data: Omit<ServiceTypeRecord, 'id'>, id?: string): Promise<ServiceTypeRecord> => {
    if (!db) throw new Error("Database not initialized.");
    if (id) {
        await updateDoc(doc(db, 'serviceTypes', id), data);
        return { id, ...data };
    } else {
        const docRef = await addDoc(collection(db, 'serviceTypes'), data);
        return { id: docRef.id, ...data };
    }
};

const deleteServiceType = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await deleteDoc(doc(db, "serviceTypes", id));
};


// --- Categories ---

const onCategoriesUpdate = (callback: (categories: InventoryCategory[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "inventoryCategories"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryCategory)));
    });
};

const onCategoriesUpdatePromise = async (): Promise<InventoryCategory[]> => {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, "inventoryCategories")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryCategory));
};

const saveCategory = async (data: Omit<InventoryCategory, 'id'>, id?: string): Promise<InventoryCategory> => {
    if (!db) throw new Error("Database not initialized.");
    if (id) {
        await updateDoc(doc(db, 'inventoryCategories', id), data);
        return { id, ...data };
    } else {
        const docRef = await addDoc(collection(db, 'inventoryCategories'), data);
        return { id: docRef.id, ...data };
    }
};

const deleteCategory = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await deleteDoc(doc(db, "inventoryCategories", id));
};

// --- Suppliers ---

const onSuppliersUpdate = (callback: (suppliers: Supplier[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "suppliers"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });
};

const onSuppliersUpdatePromise = async (): Promise<Supplier[]> => {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, "suppliers")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
};

const saveSupplier = async (data: Omit<Supplier, 'id'>, id?: string): Promise<Supplier> => {
    if (!db) throw new Error("Database not initialized.");
    if (id) {
        await updateDoc(doc(db, 'suppliers', id), data);
        return { id, ...data };
    } else {
        const docRef = await addDoc(collection(db, 'suppliers'), data);
        return { id: docRef.id, ...data };
    }
};

const deleteSupplier = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await deleteDoc(doc(db, "suppliers", id));
};

// --- Vehicles ---

const onVehiclesUpdate = (callback: (vehicles: Vehicle[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "vehicles"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    });
};

const onVehiclesUpdatePromise = async (): Promise<Vehicle[]> => {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, "vehicles")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
};

const getVehicleById = async (id: string): Promise<Vehicle | undefined> => {
    if (!db) return undefined;
    const docSnap = await getDoc(doc(db, "vehicles", id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Vehicle : undefined;
};

const addVehicle = async (data: Partial<Vehicle>): Promise<Vehicle> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = await addDoc(collection(db, 'vehicles'), cleanObjectForFirestore(data));
    return { id: docRef.id, ...data } as Vehicle;
};

const getVehicleDocRef = (id: string) => {
    if (!db) throw new Error("Database not initialized.");
    return doc(db, 'vehicles', id);
}

// --- Monthly Fixed Expenses ---
const onFixedExpensesUpdate = (callback: (expenses: MonthlyFixedExpense[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "monthlyFixedExpenses"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyFixedExpense)));
    });
};

const saveFixedExpense = async (data: Omit<MonthlyFixedExpense, 'id'>, id?: string): Promise<MonthlyFixedExpense> => {
    if (!db) throw new Error("Database not initialized.");
    if (id) {
        await updateDoc(doc(db, 'monthlyFixedExpenses', id), data);
        return { id, ...data };
    } else {
        const docRef = await addDoc(collection(db, 'monthlyFixedExpenses'), data);
        return { id: docRef.id, ...data };
    }
};

const deleteFixedExpense = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await deleteDoc(doc(db, "monthlyFixedExpenses", id));
};

export const inventoryService = {
  onItemsUpdate,
  onItemsUpdatePromise,
  saveItem,
  deleteItem,
  onServiceTypesUpdate,
  onServiceTypesUpdatePromise,
  saveServiceType,
  deleteServiceType,
  onCategoriesUpdate,
  onCategoriesUpdatePromise,
  saveCategory,
  deleteCategory,
  onSuppliersUpdate,
  onSuppliersUpdatePromise,
  saveSupplier,
  deleteSupplier,
  onVehiclesUpdate,
  onVehiclesUpdatePromise,
  getVehicleById,
  addVehicle,
  getVehicleDocRef,
  onFixedExpensesUpdate,
  saveFixedExpense,
  deleteFixedExpense,
};
