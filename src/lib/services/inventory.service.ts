

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
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { InventoryItem, InventoryCategory, Supplier, Vehicle, VehiclePriceList, ServiceTypeRecord, MonthlyFixedExpense, PayableAccount } from "@/types";
import type { InventoryItemFormValues } from "@/schemas/inventory-item-form-schema";
import type { VehicleFormValues } from "@/schemas/vehicle-form-schema";
import type { PriceListFormValues } from "@/app/(app)/precios/components/price-list-form";
import type { SupplierFormValues } from '@/schemas/supplier-form-schema';
import { logAudit } from '../placeholder-data';
import { cleanObjectForFirestore } from '../forms';

// --- Generic Document Getter ---
const getDocById = async (collectionName: string, id: string): Promise<any> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

const deleteDocById = async (collectionName: string, id: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await deleteDoc(doc(db, collectionName, id));
};


// --- Inventory Items ---

const onItemsUpdate = (callback: (items: InventoryItem[]) => void): (() => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "inventory"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    });
    return unsubscribe;
};

const onItemsUpdatePromise = async (): Promise<InventoryItem[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "inventory"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
}

const addItem = async (data: InventoryItemFormValues): Promise<InventoryItem> => {
    if (!db) throw new Error("Database not initialized.");
    const newItemData = {
      ...data,
      isService: data.isService || false,
      quantity: data.isService ? 0 : Number(data.quantity) || 0,
      lowStockThreshold: data.isService ? 0 : Number(data.lowStockThreshold) || 5,
      unitPrice: Number(data.unitPrice) || 0,
      sellingPrice: Number(data.sellingPrice) || 0,
    };
    const cleanedData = cleanObjectForFirestore(newItemData);
    const docRef = await addDoc(collection(db, 'inventory'), cleanedData);
    return { id: docRef.id, ...newItemData } as InventoryItem;
};


// --- Categories ---

const onCategoriesUpdate = (callback: (categories: InventoryCategory[]) => void): (() => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "inventoryCategories"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryCategory)));
    });
    return unsubscribe;
};

const onCategoriesUpdatePromise = async (): Promise<InventoryCategory[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "inventoryCategories"));
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
    await deleteDoc(doc(db, 'inventoryCategories', id));
};


// --- Service Types ---
const onServiceTypesUpdate = (callback: (types: ServiceTypeRecord[]) => void): (() => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "serviceTypes"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceTypeRecord)));
    });
    return unsubscribe;
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
    await deleteDoc(doc(db, 'serviceTypes', id));
};


const onServiceTypesUpdatePromise = async (): Promise<ServiceTypeRecord[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "serviceTypes"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceTypeRecord));
};


// --- Suppliers ---

const onSuppliersUpdate = (callback: (suppliers: Supplier[]) => void): (() => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "suppliers"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });
    return unsubscribe;
};

const onSuppliersUpdatePromise = async (): Promise<Supplier[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "suppliers"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
};

const saveSupplier = async (data: SupplierFormValues, id?: string): Promise<Supplier> => {
    if (!db) throw new Error("Database not initialized.");
    const dataToSave = { ...data };

    if (id) {
        await updateDoc(doc(db, 'suppliers', id), cleanObjectForFirestore(dataToSave));
        const updatedDoc = await getDoc(doc(db, 'suppliers', id));
        return { id, ...(updatedDoc.data() as Omit<Supplier, 'id'>) };
    } else {
        const newSupplierData = { ...dataToSave, debtAmount: 0 };
        const docRef = await addDoc(collection(db, 'suppliers'), cleanObjectForFirestore(newSupplierData));
        return { id: docRef.id, ...newSupplierData };
    }
};

const deleteSupplier = async (id: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await deleteDoc(doc(db, 'suppliers', id));
};


// --- Vehicles ---

const onVehiclesUpdate = (callback: (vehicles: Vehicle[]) => void): (() => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "vehicles"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    });
    return unsubscribe;
};

const onVehiclesUpdatePromise = async (): Promise<Vehicle[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "vehicles"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
}


const getVehicleById = async (id: string): Promise<Vehicle | undefined> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'vehicles', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Vehicle : undefined;
};

const addVehicle = async (data: VehicleFormValues): Promise<Vehicle> => {
    if (!db) throw new Error("Database not initialized.");
    const newVehicleData = {
      ...data,
      year: Number(data.year),
    };
    const docRef = await addDoc(collection(db, 'vehicles'), cleanObjectForFirestore(newVehicleData));
    return { id: docRef.id, ...newVehicleData } as Vehicle;
};

const saveVehicle = async (data: Partial<VehicleFormValues>, id: string): Promise<Vehicle> => {
    if (!db) throw new Error("Database not initialized.");
    const dataToSave = { ...data, year: data.year ? Number(data.year) : undefined };
    
    const docRef = doc(db, 'vehicles', id);
    await updateDoc(docRef, cleanObjectForFirestore(dataToSave));

    const updatedDoc = await getDoc(docRef);
    return { id: updatedDoc.id, ...updatedDoc.data() } as Vehicle;
};

const updateVehicle = async (id: string, data: Partial<Vehicle>): Promise<Vehicle> => {
  if (!db) throw new Error("Database not initialized.");
  const docRef = doc(db, 'vehicles', id);
  await updateDoc(docRef, cleanObjectForFirestore(data));
  const updatedDoc = await getDoc(docRef);
  return { id, ...(updatedDoc.data() as Omit<Vehicle, 'id'>) };
}

const getVehicleDocRef = (id: string): DocumentReference => {
  if (!db) throw new Error("Database not initialized.");
  return doc(db, 'vehicles', id);
};


// --- Price Lists ---

const onPriceListsUpdate = (callback: (lists: VehiclePriceList[]) => void): (() => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "vehiclePriceLists"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehiclePriceList)));
    });
    return unsubscribe;
};

const savePriceList = async (formData: PriceListFormValues, recordId?: string): Promise<VehiclePriceList> => {
    if (!db) throw new Error("Database not initialized.");
    const dataToSave = { ...formData, years: formData.years.sort((a,b) => a-b) };
    if (recordId) {
        const docRef = doc(db, 'vehiclePriceLists', recordId);
        await updateDoc(docRef, cleanObjectForFirestore(dataToSave));
        return { id: recordId, ...dataToSave };
    } else {
        const docRef = await addDoc(collection(db, 'vehiclePriceLists'), cleanObjectForFirestore(dataToSave));
        return { id: docRef.id, ...dataToSave };
    }
};

const deletePriceList = async (recordId: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'vehiclePriceLists', recordId);
    await deleteDoc(docRef);
};


// --- Fixed Expenses ---
const onFixedExpensesUpdate = (callback: (expenses: MonthlyFixedExpense[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = collection(db, "fixedMonthlyExpenses");
    const unsubscribe = onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyFixedExpense)));
    });
    return unsubscribe;
};

const onFixedExpensesUpdatePromise = async (): Promise<MonthlyFixedExpense[]> => {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, "fixedMonthlyExpenses")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyFixedExpense));
};

// --- Payable Accounts ---
const onPayableAccountsUpdate = (callback: (accounts: PayableAccount[]) => void): (() => void) => {
  if (!db) return () => {};
  const q = query(collection(db, "payableAccounts"));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    callback(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayableAccount)));
  });
  return unsubscribe;
};

const savePayableAccount = async (data: Partial<PayableAccount>, id?: string): Promise<PayableAccount> => {
  if (!db) throw new Error("Database not initialized.");
  const cleanedData = cleanObjectForFirestore(data);
  if (id) {
    const docRef = doc(db, 'payableAccounts', id);
    await updateDoc(docRef, cleanedData);
    const updatedDoc = await getDoc(docRef);
    return { id, ...(updatedDoc.data() as Omit<PayableAccount, 'id'>) };
  } else {
    const docRef = await addDoc(collection(db, 'payableAccounts'), cleanedData);
    return { id: docRef.id, ...data } as PayableAccount;
  }
};


export const inventoryService = {
    onItemsUpdate,
    onItemsUpdatePromise,
    addItem,
    saveItem: async (data: Partial<InventoryItemFormValues>, id: string) => {
        if (!db) throw new Error("Database not initialized.");
        await updateDoc(doc(db, 'inventory', id), cleanObjectForFirestore(data));
    },
    deleteDoc: deleteDocById,
    onCategoriesUpdate,
    onCategoriesUpdatePromise,
    saveCategory,
    deleteCategory,
    onServiceTypesUpdate,
    onServiceTypesUpdatePromise,
    saveServiceType,
    deleteServiceType,
    onSuppliersUpdate,
    onSuppliersUpdatePromise,
    saveSupplier,
    deleteSupplier,
    onVehiclesUpdate,
    onVehiclesUpdatePromise,
    getVehicleById,
    getVehicleDocRef,
    addVehicle,
    saveVehicle,
    updateVehicle,
    onPriceListsUpdate,
    savePriceList,
    deletePriceList,
    onFixedExpensesUpdate,
    onFixedExpensesUpdatePromise,
    onPayableAccountsUpdate,
    savePayableAccount
};
