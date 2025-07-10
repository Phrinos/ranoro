
'use server';

import type { InventoryItem, InventoryCategory, Supplier, Vehicle, VehiclePriceList } from "@/types";
import { placeholderInventory, placeholderCategories, placeholderSuppliers, placeholderVehicles, placeholderVehiclePriceLists, persistToFirestore, logAudit, placeholderCashDrawerTransactions } from "@/lib/placeholder-data";
import type { InventoryItemFormValues } from "@/app/(app)/inventario/components/inventory-item-form";
import type { VehicleFormValues } from "@/app/(app)/vehiculos/components/vehicle-form";
import type { PurchaseFormValues } from "@/app/(app)/inventario/components/register-purchase-dialog";
import type { PriceListFormValues } from "@/app/(app)/precios/components/price-list-form";
import { formatCurrency, capitalizeWords } from "@/lib/utils";
import { subMonths, isBefore, parseISO, isValid } from 'date-fns';

// --- Inventory Items ---

const getItems = async (): Promise<InventoryItem[]> => {
    return [...placeholderInventory];
};

const addItem = async (data: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem: InventoryItem = {
        id: `PROD_${Date.now().toString(36)}`,
        ...data,
        isService: data.isService || false,
        quantity: 0,
        lowStockThreshold: data.lowStockThreshold === undefined ? 5 : data.lowStockThreshold,
        unitPrice: data.unitPrice || 0,
        sellingPrice: data.sellingPrice || 0,
    };
    placeholderInventory.push(newItem);
    await logAudit('Crear', `Creó el producto "${newItem.name}" (SKU: ${newItem.sku})`, { entityType: 'Producto', entityId: newItem.id });
    await persistToFirestore(['inventory']);
    return newItem;
};

// --- Categories ---

const getCategories = async (): Promise<InventoryCategory[]> => {
    return [...placeholderCategories];
};

const addCategory = async (name: string): Promise<InventoryCategory> => {
    const newCategory = { id: `CAT${Date.now()}`, name };
    placeholderCategories.push(newCategory);
    await persistToFirestore(['categories']);
    return newCategory;
};

// --- Suppliers ---

const getSuppliers = async (): Promise<Supplier[]> => {
    return [...placeholderSuppliers];
};

// --- Vehicles ---

const getVehicles = async (): Promise<Vehicle[]> => {
    return [...placeholderVehicles];
};

const getVehicleById = async (id: string): Promise<Vehicle | undefined> => {
    return placeholderVehicles.find(v => v.id === id);
};

const addVehicle = async (data: VehicleFormValues): Promise<Vehicle> => {
    const newVehicle: Vehicle = {
        id: `VEH_${Date.now().toString(36)}`,
        ...data,
        year: Number(data.year),
    };
    placeholderVehicles.push(newVehicle);
    await persistToFirestore(['vehicles']);
    return newVehicle;
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

const getPriceLists = async (): Promise<VehiclePriceList[]> => {
    return [...placeholderVehiclePriceLists];
};

const savePriceList = async (formData: PriceListFormValues, recordId?: string): Promise<VehiclePriceList> => {
    let recordToSave: VehiclePriceList;
    if (recordId) {
        const index = placeholderVehiclePriceLists.findIndex(r => r.id === recordId);
        if (index > -1) {
            recordToSave = { ...placeholderVehiclePriceLists[index], ...formData };
            placeholderVehiclePriceLists[index] = recordToSave;
        } else {
            throw new Error("Record not found for update");
        }
    } else {
        recordToSave = { id: `VPL_${Date.now().toString(36)}`, ...formData };
        placeholderVehiclePriceLists.push(recordToSave);
    }
    await persistToFirestore(['vehiclePriceLists']);
    return recordToSave;
};

const deletePriceList = async (recordId: string): Promise<void> => {
    const index = placeholderVehiclePriceLists.findIndex(r => r.id === recordId);
    if (index > -1) {
        placeholderVehiclePriceLists.splice(index, 1);
        await persistToFirestore(['vehiclePriceLists']);
    }
};

// --- Purchases ---

const registerPurchase = async (data: PurchaseFormValues): Promise<void> => {
    const supplier = placeholderSuppliers.find(s => s.id === data.supplierId);
    if (!supplier) throw new Error("Supplier not found");

    const keysToPersist: ('suppliers' | 'inventory' | 'cashDrawerTransactions' | 'auditLogs')[] = ['suppliers', 'inventory', 'auditLogs'];

    if (data.paymentMethod === 'Crédito') {
        supplier.debtAmount = (supplier.debtAmount || 0) + data.invoiceTotal;
    } else if (data.paymentMethod === 'Efectivo') {
        placeholderCashDrawerTransactions.push({
            id: `trx_${Date.now()}`,
            date: new Date().toISOString(),
            type: 'Salida',
            amount: data.invoiceTotal,
            concept: `Compra a ${supplier.name} (Factura)`,
            userId: 'system',
            userName: 'Sistema',
        });
        keysToPersist.push('cashDrawerTransactions');
    }
    
    data.items.forEach(purchasedItem => {
      const inventoryIndex = placeholderInventory.findIndex(i => i.id === purchasedItem.inventoryItemId);
      if (inventoryIndex > -1) {
        const item = placeholderInventory[inventoryIndex];
        item.quantity += purchasedItem.quantity;
        item.unitPrice = purchasedItem.unitPrice;
        item.sellingPrice = parseFloat((purchasedItem.unitPrice * 1.20).toFixed(2));
      }
    });

    await logAudit('Registrar', `Registró una compra al proveedor "${supplier.name}" por ${formatCurrency(data.invoiceTotal)}.`, { entityType: 'Compra', entityId: data.supplierId });
    await persistToFirestore(keysToPersist);
};


export const inventoryService = {
    getItems,
    addItem,
    getCategories,
    addCategory,
    getSuppliers,
    getVehicles,
    getVehicleById,
    addVehicle,
    getVehiclesSummary,
    getPriceLists,
    savePriceList,
    deletePriceList,
    registerPurchase,
};
