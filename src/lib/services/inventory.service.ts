
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { InventoryItem, InventoryCategory, Supplier, Vehicle, VehiclePriceList } from "@/types";
import type { InventoryItemFormValues } from "@/app/(app)/inventario/components/inventory-item-form";
import type { VehicleFormValues } from "@/app/(app)/vehiculos/components/vehicle-form";
import type { PriceListFormValues } from "@/app/(app)/precios/components/price-list-form";

// --- Inventory Items ---

const onItemsUpdate = (callback: (items: InventoryItem[]) => void): (() => void) => {
    const unsubscribe = onSnapshot(collection(db, "inventory"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    });
    return unsubscribe;
};

const addItem = async (data: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItemData = {
      ...data,
      isService: data.isService || false,
      quantity: data.isService ? 0 : Number(data.quantity) || 0,
      lowStockThreshold: data.isService ? 0 : Number(data.lowStockThreshold) || 5,
      unitPrice: Number(data.unitPrice) || 0,
      sellingPrice: Number(data.sellingPrice) || 0,
    };
    const docRef = await addDoc(collection(db, 'inventory'), newItemData);
    return { id: docRef.id, ...newItemData };
};


// --- Categories ---

const onCategoriesUpdate = (callback: (categories: InventoryCategory[]) => void): (() => void) => {
    const unsubscribe = onSnapshot(collection(db, "inventoryCategories"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryCategory)));
    });
    return unsubscribe;
};

// --- Suppliers ---

const onSuppliersUpdate = (callback: (suppliers: Supplier[]) => void): (() => void) => {
    const unsubscribe = onSnapshot(collection(db, "suppliers"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });
    return unsubscribe;
};

// --- Vehicles ---

const onVehiclesUpdate = (callback: (vehicles: Vehicle[]) => void): (() => void) => {
    const unsubscribe = onSnapshot(collection(db, "vehicles"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    });
    return unsubscribe;
};


const getVehicleById = async (id: string): Promise<Vehicle | undefined> => {
    const docRef = doc(db, 'vehicles', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Vehicle : undefined;
};

const addVehicle = async (data: VehicleFormValues): Promise<Vehicle> => {
    const newVehicleData = {
      ...data,
      year: Number(data.year),
    };
    const docRef = await addDoc(collection(db, 'vehicles'), newVehicleData);
    return { id: docRef.id, ...newVehicleData };
};

// --- Price Lists ---

const onPriceListsUpdate = (callback: (lists: VehiclePriceList[]) => void): (() => void) => {
    const unsubscribe = onSnapshot(collection(db, "vehiclePriceLists"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehiclePriceList)));
    });
    return unsubscribe;
};

const savePriceList = async (formData: PriceListFormValues, recordId?: string): Promise<VehiclePriceList> => {
    const dataToSave = { ...formData, years: formData.years.sort((a,b) => a-b) };
    if (recordId) {
        const docRef = doc(db, 'vehiclePriceLists', recordId);
        await updateDoc(docRef, dataToSave);
        return { id: recordId, ...dataToSave };
    } else {
        const docRef = await addDoc(collection(db, 'vehiclePriceLists'), dataToSave);
        return { id: docRef.id, ...dataToSave };
    }
};

const deletePriceList = async (recordId: string): Promise<void> => {
    const docRef = doc(db, 'vehiclePriceLists', recordId);
    await deleteDoc(docRef);
};

export const inventoryService = {
    onItemsUpdate,
    addItem,
    onCategoriesUpdate,
    onSuppliersUpdate,
    onVehiclesUpdate,
    getVehicleById,
    addVehicle,
    onPriceListsUpdate,
    savePriceList,
    deletePriceList,
};
