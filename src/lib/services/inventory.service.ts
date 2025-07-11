

import type { InventoryItem, InventoryCategory, Supplier, Vehicle, VehiclePriceList } from "@/types";
import type { InventoryItemFormValues } from "@/app/(app)/inventario/components/inventory-item-form";
import type { VehicleFormValues } from "@/app/(app)/vehiculos/components/vehicle-form";
import type { PurchaseFormValues } from "@/app/(app)/inventario/components/register-purchase-dialog";
import type { PriceListFormValues } from "@/app/(app)/precios/components/price-list-form";
import { formatCurrency, capitalizeWords } from "@/lib/utils";
import { subMonths, isBefore, parseISO, isValid } from 'date-fns';
import { db } from '@/lib/firebaseClient.js';
import { collection, onSnapshot, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { logAudit } from '../placeholder-data';

// --- Inventory Items ---

const onItemsUpdate = (callback: (items: InventoryItem[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'inventory'), snapshot => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
        callback(items);
    });
};

const addItem = async (data: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItemRef = await addDoc(collection(db, 'inventory'), data);
    const newLog = logAudit('Crear', `Creó el producto "${data.name}" (SKU: ${data.sku})`, { entityType: 'Producto', entityId: newItemRef.id });
    await addDoc(collection(db, 'auditLogs'), newLog);
    return { id: newItemRef.id, ...data } as InventoryItem;
};

// --- Categories ---

const onCategoriesUpdate = (callback: (categories: InventoryCategory[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'categories'), snapshot => {
        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryCategory));
        callback(categories);
    });
};

// --- Suppliers ---

const onSuppliersUpdate = (callback: (suppliers: Supplier[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'suppliers'), snapshot => {
        const suppliers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
        callback(suppliers);
    });
};

// --- Vehicles ---

const onVehiclesUpdate = (callback: (vehicles: Vehicle[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'vehicles'), snapshot => {
        const vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
        callback(vehicles);
    });
};


const getVehicleById = async (id: string): Promise<Vehicle | undefined> => {
    const docRef = doc(db, 'vehicles', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Vehicle : undefined;
};

const addVehicle = async (data: VehicleFormValues): Promise<Vehicle> => {
    const newVehicleRef = await addDoc(collection(db, 'vehicles'), data);
    return { id: newVehicleRef.id, ...data, year: Number(data.year) };
};

const getVehiclesSummary = (vehiclesWithLastService: Vehicle[]) => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);
    const twelveMonthsAgo = subMonths(now, 12);
    let count6 = 0; let count12 = 0;

    vehiclesWithLastService.forEach(v => {
        if (!v.lastServiceDate) {
            count6++; count12++;
        } else {
            const lastService = parseISO(v.lastServiceDate);
            if (!isValid(lastService)) return;
            if (isBefore(lastService, sixMonthsAgo)) count6++;
            if (isBefore(lastService, twelveMonthsAgo)) count12++;
        }
    });
    
    const vehicleCounts = vehiclesWithLastService.reduce((acc, v) => {
        const key = `${v.make} ${v.model}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topEntry = Object.entries(vehicleCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]);

    return {
        totalVehiclesCount: vehiclesWithLastService.length,
        inactive6MonthsCount: count6,
        inactive12MonthsCount: count12,
        uniqueOwnersCount: new Set(vehiclesWithLastService.map(v => v.ownerName)).size,
        fleetVehiclesCount: vehiclesWithLastService.filter(v => v.isFleetVehicle).length,
        mostCommonVehicle: topEntry[0] || "N/A",
    };
};

// --- Price Lists ---

const onPriceListsUpdate = (callback: (lists: VehiclePriceList[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'vehiclePriceLists'), snapshot => {
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehiclePriceList));
        callback(lists);
    });
};

const savePriceList = async (formData: PriceListFormValues, recordId?: string): Promise<VehiclePriceList> => {
    const dataToSave = { ...formData, years: formData.years.sort((a,b) => a-b) };
    if (recordId) {
        await setDoc(doc(db, 'vehiclePriceLists', recordId), dataToSave, { merge: true });
        return { id: recordId, ...dataToSave };
    } else {
        const newRef = await addDoc(collection(db, 'vehiclePriceLists'), dataToSave);
        return { id: newRef.id, ...dataToSave };
    }
};

const deletePriceList = async (recordId: string): Promise<void> => {
    await deleteDoc(doc(db, 'vehiclePriceLists', recordId));
};

// --- Purchases ---

const registerPurchase = async (data: PurchaseFormValues): Promise<void> => {
    // This function involves multiple writes, ideally it should be a transaction.
    // For simplicity, we'll do separate writes.
    const supplierRef = doc(db, 'suppliers', data.supplierId);
    
    if (data.paymentMethod === 'Crédito') {
        const supplierSnap = await getDoc(supplierRef);
        const currentDebt = supplierSnap.data()?.debtAmount || 0;
        await setDoc(supplierRef, { debtAmount: currentDebt + data.invoiceTotal }, { merge: true });
    } else if (data.paymentMethod === 'Efectivo') {
        const supplierSnap = await getDoc(supplierRef);
        const supplierName = supplierSnap.data()?.name || 'desconocido';
        await addDoc(collection(db, 'cashDrawerTransactions'), {
            id: `trx_${Date.now()}`,
            date: new Date().toISOString(),
            type: 'Salida',
            amount: data.invoiceTotal,
            concept: `Compra a ${supplierName} (Factura)`,
            userId: 'system', // TODO: Get current user
            userName: 'Sistema',
        });
    }
    
    for (const purchasedItem of data.items) {
        const itemRef = doc(db, 'inventory', purchasedItem.inventoryItemId);
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
            const currentQuantity = itemSnap.data().quantity || 0;
            await setDoc(itemRef, {
                quantity: currentQuantity + purchasedItem.quantity,
                unitPrice: purchasedItem.unitPrice,
                sellingPrice: parseFloat((purchasedItem.unitPrice * 1.20).toFixed(2))
            }, { merge: true });
        }
    }
    const supplierSnap = await getDoc(supplierRef);
    const supplierName = supplierSnap.data()?.name || 'desconocido';
    const newLog = logAudit('Registrar', `Registró una compra al proveedor "${supplierName}" por ${formatCurrency(data.invoiceTotal)}.`, { entityType: 'Compra', entityId: data.supplierId });
    await addDoc(collection(db, 'auditLogs'), newLog);
};


export const inventoryService = {
    onItemsUpdate,
    addItem,
    onCategoriesUpdate,
    onSuppliersUpdate,
    onVehiclesUpdate,
    getVehicleById,
    addVehicle,
    getVehiclesSummary,
    onPriceListsUpdate,
    savePriceList,
    deletePriceList,
    registerPurchase,
};
