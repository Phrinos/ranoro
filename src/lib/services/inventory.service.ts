

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
  WriteBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier, Vehicle, MonthlyFixedExpense, Paperwork, FineCheck, VehiclePriceList, ServiceItem } from "@/types";
import { cleanObjectForFirestore } from '../forms';
import { nanoid } from 'nanoid';
import { VEHICLE_COLLECTION } from '../vehicle-constants';

// Generic function to get a document by ID from any collection
const getDocById = async (collectionName: string, id: string): Promise<any> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};


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
    const dataToSave = { ...cleanObjectForFirestore(data), updatedAt: serverTimestamp() };
    if (id) {
        await updateDoc(doc(db, 'inventory', id), dataToSave);
        const updatedDoc = await getDoc(doc(db, 'inventory', id));
        if (!updatedDoc.exists()) throw new Error("Failed to retrieve updated item.");
        return { ...updatedDoc.data(), id } as InventoryItem;
    } else {
        const docRef = await addDoc(collection(db, 'inventory'), { ...dataToSave, createdAt: serverTimestamp() });
        const newDoc = await getDoc(docRef);
        return { ...newDoc.data(), id: docRef.id } as InventoryItem;
    }
};

const addItem = async (data: Partial<InventoryItem>): Promise<InventoryItem> => {
    if (!db) throw new Error("Database not initialized.");
    const dataToSave = { ...cleanObjectForFirestore(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, 'inventory'), dataToSave);
    const docSnap = await getDoc(docRef);
    return { id: docSnap.id, ...docSnap.data() } as InventoryItem;
};


const deleteItem = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await deleteDoc(doc(db, "inventory", id));
};

const updateInventoryStock = async (
    batch: WriteBatch,
    items: { id: string; quantity: number; unitPrice?: number }[],
    operation: 'add' | 'subtract'
) => {
    if (!db) throw new Error("Database not initialized.");

    const itemUpdates = items.map(async (item) => {
        const itemRef = doc(db, 'inventory', item.id);
        const itemDoc = await getDoc(itemRef);

        if (itemDoc.exists()) {
            const currentStock = itemDoc.data().quantity || 0;
            const newStock = operation === 'add'
                ? currentStock + item.quantity
                : currentStock - item.quantity;
            
            const updateData: { quantity: number; unitPrice?: number, updatedAt: any } = { 
                quantity: newStock,
                updatedAt: serverTimestamp() 
            };
            if (item.unitPrice !== undefined) {
                updateData.unitPrice = item.unitPrice;
            }

            batch.update(itemRef, updateData);
        }
    });

    await Promise.all(itemUpdates);
};

const getSuppliesCostForItem = (
    serviceItem: ServiceItem,
    inventory: InventoryItem[]
): number => {
    if (!serviceItem.suppliesUsed || serviceItem.suppliesUsed.length === 0) {
        return 0;
    }
    const inventoryMap = new Map(inventory.map(i => [i.id, i.unitPrice]));
    return serviceItem.suppliesUsed.reduce((totalCost, supply) => {
        const cost = inventoryMap.get(supply.supplyId) ?? supply.unitPrice ?? 0;
        return totalCost + cost * supply.quantity;
    }, 0);
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

const saveVehicle = async (data: Partial<Vehicle>, id?: string): Promise<Vehicle> => {
    if (!db) throw new Error("Database not initialized.");
    if(id) {
      const vehicleRef = doc(db, 'vehicles', id);
      await updateDoc(vehicleRef, cleanObjectForFirestore(data));
      const updatedDoc = await getDoc(vehicleRef);
      if (!updatedDoc.exists()) throw new Error("Failed to retrieve updated vehicle");
      return { id, ...updatedDoc.data() } as Vehicle;
    }
    const docRef = await addDoc(collection(db, 'vehicles'), cleanObjectForFirestore(data));
    const newDoc = await getDoc(docRef);
    if (!newDoc.exists()) throw new Error("Failed to create or retrieve new vehicle");
    return { id: docRef.id, ...newDoc.data() } as Vehicle;
};

const addVehicle = async (data: Partial<Vehicle>): Promise<Vehicle> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = await addDoc(collection(db, 'vehicles'), cleanObjectForFirestore(data));
    const newDoc = await getDoc(docRef);
    return { id: docRef.id, ...newDoc.data() } as Vehicle;
};

const getVehicleDocRef = (id: string) => {
    if (!db) throw new Error("Database not initialized.");
    return doc(db, 'vehicles', id);
}

const deleteVehicle = async (id: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await deleteDoc(doc(db, "vehicles", id));
};

// --- Paperwork and Fines (Sub-collections of Vehicle) ---

const savePaperwork = async (vehicleId: string, paperwork: Omit<Paperwork, 'id'>, id?: string): Promise<void> => {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const vehicleDoc = await getDoc(vehicleRef);
    if (!vehicleDoc.exists()) throw new Error("Vehicle not found.");
    
    const existingPaperwork: Paperwork[] = vehicleDoc.data().paperwork || [];
    if (id) {
        const index = existingPaperwork.findIndex(p => p.id === id);
        existingPaperwork[index] = { ...paperwork, id };
    } else {
        existingPaperwork.push({ ...paperwork, id: nanoid() });
    }
    await updateDoc(vehicleRef, { paperwork: existingPaperwork });
};

const deletePaperwork = async (vehicleId: string, paperworkId: string): Promise<void> => {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const vehicleDoc = await getDoc(vehicleRef);
    if (!vehicleDoc.exists()) throw new Error("Vehicle not found.");
    
    const existingPaperwork: Paperwork[] = vehicleDoc.data().paperwork || [];
    const updatedPaperwork = existingPaperwork.filter(p => p.id !== paperworkId);
    await updateDoc(vehicleRef, { paperwork: updatedPaperwork });
};

const saveFineCheck = async (vehicleId: string, fineCheck: Omit<FineCheck, 'id'>, id?: string): Promise<void> => {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const vehicleDoc = await getDoc(vehicleRef);
    if (!vehicleDoc.exists()) throw new Error("Vehicle not found.");
    
    const existingFineChecks: FineCheck[] = vehicleDoc.data().fineChecks || [];
    if (id) {
        const index = existingFineChecks.findIndex(f => f.id === id);
        existingFineChecks[index] = { ...fineCheck, id };
    } else {
        existingFineChecks.push({ ...fineCheck, id: nanoid() });
    }
    await updateDoc(vehicleRef, { fineChecks: existingFineChecks });
};

// --- Monthly Fixed Expenses ---
const onFixedExpensesUpdate = (callback: (expenses: MonthlyFixedExpense[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "fixedMonthlyExpenses"));
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

// --- Price Lists ---
const onPriceListsUpdate = (callback: (lists: VehiclePriceList[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "vehiclePriceLists"));
    return onSnapshot(q, (snapshot) => {
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehiclePriceList));
        callback(lists);
    });
};

const onVehicleDataUpdate = (callback: (data: any[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, VEHICLE_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ make: doc.id, ...doc.data() })));
    });
};

const savePriceList = async (data: Partial<VehiclePriceList>, id?: string): Promise<VehiclePriceList> => {
    if (!db) throw new Error("Database not initialized.");
    if (id) {
        await updateDoc(doc(db, 'vehicleData', id), cleanObjectForFirestore(data));
        const updatedDoc = await getDoc(doc(db, 'vehicleData', id));
        return { ...updatedDoc.data(), id } as VehiclePriceList;
    } else {
        const docRef = await addDoc(collection(db, 'vehicleData'), cleanObjectForFirestore(data));
        const newDoc = await getDoc(docRef);
        return { ...newDoc.data(), id: docRef.id } as VehiclePriceList;
    }
};

const deletePriceList = async (id: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await deleteDoc(doc(db, "vehicleData", id));
};


export const inventoryService = {
  getDocById,
  onItemsUpdate,
  onItemsUpdatePromise,
  saveItem,
  addItem,
  deleteItem,
  updateInventoryStock,
  getSuppliesCostForItem,
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
  saveVehicle,
  deleteVehicle,
  getVehicleDocRef,
  savePaperwork,
  deletePaperwork,
  saveFineCheck,
  onFixedExpensesUpdate,
  saveFixedExpense,
  deleteFixedExpense,
  onPriceListsUpdate,
  savePriceList,
  deletePriceList,
  onVehicleDataUpdate,
};
