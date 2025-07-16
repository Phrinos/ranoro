

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
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { InventoryItem, InventoryCategory, Supplier, Vehicle, VehiclePriceList, ServiceTypeRecord, MonthlyFixedExpense } from "@/types";
import type { InventoryItemFormValues } from "@/app/(app)/inventario/components/inventory-item-form";
import type { VehicleFormValues } from "@/app/(app)/vehiculos/components/vehicle-form";
import type { PriceListFormValues } from "@/app/(app)/precios/components/price-list-form";
import type { SupplierFormValues } from '@/app/(app)/inventario/proveedores/components/supplier-form';
import { logAudit } from '../placeholder-data';
import { cleanObjectForFirestore } from '../forms';

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
    const docRef = await addDoc(collection(db, 'inventory'), cleanObjectForFirestore(newItemData));
    return { id: docRef.id, ...newItemData };
};


// --- Categories ---

const onCategoriesUpdate = (callback: (categories: InventoryCategory[]) => void): (() => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "inventoryCategories"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryCategory)));
    });
    return unsubscribe;
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

const saveSupplier = async (data: SupplierFormValues, id?: string): Promise<Supplier> => {
    if (!db) throw new Error("Database not initialized.");
    const dataToSave = { ...data, debtAmount: Number(data.debtAmount) || 0 };

    if (id) {
        await updateDoc(doc(db, 'suppliers', id), cleanObjectForFirestore(dataToSave));
        return { id, ...dataToSave };
    } else {
        const docRef = await addDoc(collection(db, 'suppliers'), cleanObjectForFirestore(dataToSave));
        return { id: docRef.id, ...dataToSave };
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



export const inventoryService = {
    onItemsUpdate,
    onItemsUpdatePromise,
    addItem,
    onCategoriesUpdate,
    saveCategory,
    deleteCategory,
    onServiceTypesUpdate,
    onServiceTypesUpdatePromise,
    saveServiceType,
    deleteServiceType,
    onSuppliersUpdate,
    saveSupplier,
    deleteSupplier,
    onVehiclesUpdate,
    onVehiclesUpdatePromise,
    getVehicleById,
    addVehicle,
    saveVehicle,
    updateVehicle,
    onPriceListsUpdate,
    savePriceList,
    deletePriceList,
    onFixedExpensesUpdate,
    onFixedExpensesUpdatePromise,
};
