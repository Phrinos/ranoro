

import type { InventoryItem, InventoryCategory, Supplier, Vehicle, VehiclePriceList } from "@/types";
import type { InventoryItemFormValues } from "@/app/(app)/inventario/components/inventory-item-form";
import type { VehicleFormValues } from "@/app/(app)/vehiculos/components/vehicle-form";
import type { PurchaseFormValues } from "@/app/(app)/inventario/components/register-purchase-dialog";
import type { PriceListFormValues } from "@/app/(app)/precios/components/price-list-form";
import { formatCurrency } from "@/lib/utils";
import { subMonths, isBefore, parseISO, isValid } from 'date-fns';
import {
    placeholderInventory,
    placeholderCategories,
    placeholderSuppliers,
    placeholderVehicles,
    placeholderVehiclePriceLists,
    persistToFirestore,
    logAudit,
} from '../placeholder-data';

// --- Inventory Items ---

const onItemsUpdate = (callback: (items: InventoryItem[]) => void): (() => void) => {
    // In local mode, we just return the data once.
    // The event listener 'databaseUpdated' will trigger re-renders.
    callback([...placeholderInventory]);
    return () => {}; // Return an empty unsubscribe function
};

const addItem = async (data: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem: InventoryItem = {
      id: `prod_${Date.now()}`,
      ...data,
      isService: data.isService || false,
      quantity: data.isService ? 0 : Number(data.quantity) || 0,
      lowStockThreshold: data.isService ? 0 : Number(data.lowStockThreshold) || 5,
      unitPrice: Number(data.unitPrice) || 0,
      sellingPrice: Number(data.sellingPrice) || 0,
    };
    placeholderInventory.push(newItem);
    await logAudit('Crear', `Creó el producto "${data.name}" (SKU: ${data.sku})`, { entityType: 'Producto', entityId: newItem.id });
    await persistToFirestore(['inventory', 'auditLogs']);
    return newItem;
};


// --- Categories ---

const onCategoriesUpdate = (callback: (categories: InventoryCategory[]) => void): (() => void) => {
    callback([...placeholderCategories]);
    return () => {};
};

// --- Suppliers ---

const onSuppliersUpdate = (callback: (suppliers: Supplier[]) => void): (() => void) => {
    callback([...placeholderSuppliers]);
    return () => {};
};

// --- Vehicles ---

const onVehiclesUpdate = (callback: (vehicles: Vehicle[]) => void): (() => void) => {
    callback([...placeholderVehicles]);
    return () => {};
};


const getVehicleById = async (id: string): Promise<Vehicle | undefined> => {
    return placeholderVehicles.find(v => v.id === id);
};

const addVehicle = async (data: VehicleFormValues): Promise<Vehicle> => {
    const newVehicle: Vehicle = {
      id: `V${String(placeholderVehicles.length + 1).padStart(3, '0')}${Date.now().toString().slice(-4)}`,
      ...data,
      year: Number(data.year),
    };
    placeholderVehicles.push(newVehicle);
    await persistToFirestore(['vehicles']);
    return newVehicle;
};

// --- Price Lists ---

const onPriceListsUpdate = (callback: (lists: VehiclePriceList[]) => void): (() => void) => {
    callback([...placeholderVehiclePriceLists]);
    return () => {};
};

const savePriceList = async (formData: PriceListFormValues, recordId?: string): Promise<VehiclePriceList> => {
    const dataToSave = { ...formData, years: formData.years.sort((a,b) => a-b) };
    if (recordId) {
        const index = placeholderVehiclePriceLists.findIndex(p => p.id === recordId);
        if (index > -1) {
            placeholderVehiclePriceLists[index] = { ...placeholderVehiclePriceLists[index], ...dataToSave };
            await persistToFirestore(['vehiclePriceLists']);
            return placeholderVehiclePriceLists[index];
        }
        throw new Error("Record not found");
    } else {
        const newRecord = { id: `PL_${Date.now()}`, ...dataToSave };
        placeholderVehiclePriceLists.push(newRecord);
        await persistToFirestore(['vehiclePriceLists']);
        return newRecord;
    }
};

const deletePriceList = async (recordId: string): Promise<void> => {
    const index = placeholderVehiclePriceLists.findIndex(p => p.id === recordId);
    if (index > -1) {
        placeholderVehiclePriceLists.splice(index, 1);
        await persistToFirestore(['vehiclePriceLists']);
    }
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
