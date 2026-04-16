// src/lib/services/inventory.service.ts

import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc as fbDeleteDoc,
  writeBatch,
  query,
  getDocs,
  where,
  type WriteBatch,
  serverTimestamp,
  setDoc,
  limit,
  orderBy,
  getCountFromServer,
  increment,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier, Vehicle, MonthlyFixedExpense, Paperwork, FineCheck, ServiceItem, VehicleGroup } from "@/types";
import { cleanObjectForFirestore } from '../forms';
import { nanoid } from 'nanoid';
import { VEHICLE_COLLECTION, MASTER_CATALOG_COLLECTION } from '../vehicle-constants';

const getDocById = async (collectionName: string, id: string): Promise<any> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const deleteCollectionDoc = async (collectionName: string, id: string) => {
    if (!db) throw new Error("Database not initialized.");
    await fbDeleteDoc(doc(db, collectionName, id));
}

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
  await fbDeleteDoc(doc(db, "inventory", id));
};

const updateInventoryStock = async (
    batch: WriteBatch,
    items: { id: string; quantity: number; unitPrice?: number; sellingPrice?: number }[],
    operation: 'add' | 'subtract'
) => {
    if (!db) throw new Error("Database not initialized.");

    // Aggregating by ID to prevent batch overwrites for duplicate items
    const aggregatedItems = items.reduce((acc, item) => {
        if (!item.id) {
            console.warn('updateInventoryStock received an item without an ID. Skipping.', item);
            return acc;
        }
        if (!acc[item.id]) {
            acc[item.id] = { ...item, quantity: 0 };
        }
        acc[item.id].quantity += item.quantity;
        // For prices, latest one wins
        if (item.unitPrice !== undefined) acc[item.id].unitPrice = item.unitPrice;
        if (item.sellingPrice !== undefined) acc[item.id].sellingPrice = item.sellingPrice;
        return acc;
    }, {} as Record<string, typeof items[0]>);

    const itemUpdates = Object.values(aggregatedItems).map(async (item) => {
        const itemRef = doc(db, 'inventory', item.id);
        const itemDoc = await getDoc(itemRef);

        if (itemDoc.exists()) {
            const incrementValue = operation === 'add' ? item.quantity : -item.quantity;
            
            const updateData: any = { 
                quantity: increment(incrementValue),
                updatedAt: serverTimestamp() 
            };
            if (item.unitPrice !== undefined) {
                updateData.unitPrice = item.unitPrice;
            }
            if (item.sellingPrice !== undefined) {
                updateData.sellingPrice = item.sellingPrice;
            }

            batch.update(itemRef, updateData);
        } else {
            console.warn(`Item with id ${item.id} not found in inventory. Cannot update stock.`);
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
        const cost = inventoryMap.get((supply as any).supplyId) ?? supply.unitPrice ?? 0;
        return totalCost + (cost || 0) * (supply.quantity ?? 0);
    }, 0);
};

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
        await updateDoc(doc(db, 'serviceTypes', id), data as any);
        return { id, ...data };
    } else {
        const docRef = await addDoc(collection(db, 'serviceTypes'), data as any);
        return { id: docRef.id, ...data };
    }
};

const deleteServiceType = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await fbDeleteDoc(doc(db, "serviceTypes", id));
};


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
        await updateDoc(doc(db, 'inventoryCategories', id), data as any);
        return { id, ...data };
    } else {
        const docRef = await addDoc(collection(db, 'inventoryCategories'), data as any);
        return { id: docRef.id, ...data };
    }
};

const deleteCategory = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await fbDeleteDoc(doc(db, "inventoryCategories", id));
};

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
        await updateDoc(doc(db, 'suppliers', id), data as any);
        return { id, ...data };
    } else {
        const docRef = await addDoc(collection(db, 'suppliers'), data as any);
        return { id: docRef.id, ...data };
    }
};

const deleteSupplier = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await fbDeleteDoc(doc(db, "suppliers", id));
};

const getVehicleCount = async (): Promise<number> => {
    if (!db) return 0;
    const coll = collection(db, "vehicles");
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
};

const searchVehicles = async (term: string): Promise<Vehicle[]> => {
    if (!db) return [];
    const upperTerm = term.toUpperCase().trim();
    if (!upperTerm) return [];
    
    // Simular un buscador sobre la db con prefijos limitados (para Placas y Nombres)
    const qPlate = query(
        collection(db, "vehicles"),
        where("licensePlate", ">=", upperTerm),
        where("licensePlate", "<=", upperTerm + '\uf8ff'),
        limit(50)
    );
    // Nota: Nombres requieren coincidencia de mayúsculas o normalización. Lo más común es la placa.
    const [snap1] = await Promise.all([getDocs(qPlate)]);
    
    const map = new Map<string, Vehicle>();
    snap1.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() } as Vehicle));
    return Array.from(map.values());
};

const onVehiclesUpdate = (callback: (vehicles: Vehicle[]) => void): (() => void) => {
    if (!db) return () => {};
    // Optimized: Only load 25 latest vehicles initially. The rest are loaded through search.
    const q = query(collection(db, "vehicles"), orderBy("lastServiceDate", "desc"), limit(25));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    });
};

const onVehiclesUpdatePromise = async (): Promise<Vehicle[]> => {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, "vehicles"), orderBy("lastServiceDate", "desc"), limit(25)));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
};

const onSystemVehicleStatsUpdate = (callback: (stats: any) => void): (() => void) => {
    if (!db) return () => {};
    return onSnapshot(doc(db, "systemStats", "vehicles"), (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            callback(null);
        }
    });
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
    await fbDeleteDoc(doc(db, "vehicles", id));
};

const savePaperwork = async (vehicleId: string, paperwork: Omit<Paperwork, 'id'>, id?: string): Promise<void> => {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const vehicleDoc = await getDoc(vehicleRef);
    if (!vehicleDoc.exists()) throw new Error("Vehicle not found.");
    
    const existingPaperwork: Paperwork[] = (vehicleDoc.data() as any).paperwork || [];
    if (id) {
        const index = existingPaperwork.findIndex(p => p.id === id);
        existingPaperwork[index] = { ...(paperwork as Paperwork), id };
    } else {
        existingPaperwork.push({ ...(paperwork as Paperwork), id: nanoid() });
    }
    await updateDoc(vehicleRef, { paperwork: existingPaperwork });
};

const deletePaperwork = async (vehicleId: string, paperworkId: string): Promise<void> => {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const vehicleDoc = await getDoc(vehicleRef);
    if (!vehicleDoc.exists()) throw new Error("Vehicle not found.");
    
    const existingPaperwork: Paperwork[] = (vehicleDoc.data() as any).paperwork || [];
    const updatedPaperwork = existingPaperwork.filter(p => p.id !== paperworkId);
    await updateDoc(vehicleRef, { paperwork: updatedPaperwork });
};

const saveFineCheck = async (vehicleId: string, fineCheck: Omit<FineCheck, 'id'>, id?: string): Promise<void> => {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const vehicleDoc = await getDoc(vehicleRef);
    if (!vehicleDoc.exists()) throw new Error("Vehicle not found.");
    
    const existingFineChecks: FineCheck[] = (vehicleDoc.data() as any).fineChecks || [];
    if (id) {
        const index = existingFineChecks.findIndex(f => f.id === id);
        existingFineChecks[index] = { ...(fineCheck as FineCheck), id };
    } else {
        existingFineChecks.push({ ...(fineCheck as FineCheck), id: nanoid() });
    }
    await updateDoc(vehicleRef, { fineChecks: existingFineChecks });
};

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
        await updateDoc(doc(db, 'monthlyFixedExpenses', id), data as any);
        return { id, ...data } as MonthlyFixedExpense;
    } else {
        const docRef = await addDoc(collection(db, 'monthlyFixedExpenses'), data as any);
        return { id: docRef.id, ...data } as MonthlyFixedExpense;
    }
};

const deleteFixedExpense = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await fbDeleteDoc(doc(db, "monthlyFixedExpenses", id));
};

const onVehicleDataUpdate = (callback: (data: any[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, VEHICLE_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ make: doc.id, ...doc.data() })));
    });
};

const onVehicleMakeDataUpdate = (make: string, callback: (data: any | null) => void): (() => void) => {
    if (!db) return () => {};
    // Ensure make is properly capitalized/trimmed if needed, or matched exactly as stored.
    // Assuming 'make' here matches the document ID stored in Firestore.
    const docRef = doc(db, VEHICLE_COLLECTION, make);
    return onSnapshot(docRef, (docSnap) => {
        callback(docSnap.exists() ? { make: docSnap.id, ...docSnap.data() } : null);
    });
};

// --- Master Catalog Dedicados ---

const onMasterVehicleDataUpdate = (callback: (data: any[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, MASTER_CATALOG_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ make: doc.id, ...doc.data() })));
    });
};

const createMasterMake = async (makeName: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const makeRef = doc(db, MASTER_CATALOG_COLLECTION, makeName.toUpperCase().trim());
    await setDoc(makeRef, { models: [] }, { merge: false });
};

const renameMasterMake = async (oldName: string, newName: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const oldRef = doc(db, MASTER_CATALOG_COLLECTION, oldName);
    const newRef = doc(db, MASTER_CATALOG_COLLECTION, newName.toUpperCase().trim());
    
    const snap = await getDoc(oldRef);
    if (!snap.exists()) throw new Error("Source make not found.");
    
    const data = snap.data();
    await setDoc(newRef, data);
    await fbDeleteDoc(oldRef);
};

const deleteMasterMake = async (makeName: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await fbDeleteDoc(doc(db, MASTER_CATALOG_COLLECTION, makeName));
};

// --- Vehicle Groups ---

const onVehicleGroupsUpdate = (callback: (groups: VehicleGroup[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "vehicleGroups"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleGroup)));
    });
};

const saveVehicleGroup = async (group: Partial<VehicleGroup>, id?: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const dataToSave = { ...cleanObjectForFirestore(group), updatedAt: serverTimestamp() };
    if (id) {
        await updateDoc(doc(db, 'vehicleGroups', id), dataToSave);
    } else {
        await addDoc(collection(db, 'vehicleGroups'), { ...dataToSave, createdAt: serverTimestamp() });
    }
};

const deleteVehicleGroup = async (id: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await fbDeleteDoc(doc(db, "vehicleGroups", id));
};

const createNewMake = async (makeName: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const makeRef = doc(db, VEHICLE_COLLECTION, makeName.toUpperCase().trim());
    await setDoc(makeRef, { models: [] }, { merge: false });
};

const deleteMake = async (makeName: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await fbDeleteDoc(doc(db, VEHICLE_COLLECTION, makeName));
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
  getVehicleCount,
  searchVehicles,
  onVehiclesUpdate,
  onVehiclesUpdatePromise, onSystemVehicleStatsUpdate,
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
  onVehicleDataUpdate,
  onVehicleMakeDataUpdate,
  deleteCollectionDoc,
  // New Group Functions
  onVehicleGroupsUpdate,
  saveVehicleGroup,
  deleteVehicleGroup,
  createNewMake,
  deleteMake,
  // Master Catalog
  onMasterVehicleDataUpdate,
  createMasterMake,
  renameMasterMake,
  deleteMasterMake,
};
