

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  query,
  where,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, QuoteRecord, SaleReceipt, Vehicle, CashDrawerTransaction, InitialCashBalance, InventoryItem } from "@/types";
import { savePublicDocument } from '@/lib/public-document';
import { inventoryService } from './inventory.service';
import { nanoid } from 'nanoid';
import type { ExtractedService } from '@/ai/flows/service-migration-flow';
import { format, parse, isValid, startOfDay, isSameDay } from 'date-fns';

// --- Services ---

const onServicesUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    if(!db) return () => {};
    const q = query(collection(db, "serviceRecords"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const services: ServiceRecord[] = [];
        querySnapshot.forEach((doc) => {
            services.push({ id: doc.id, ...doc.data() } as ServiceRecord);
        });
        callback(services);
    });
    return unsubscribe;
};

const updateService = async (serviceId: string, data: Partial<ServiceRecord>): Promise<ServiceRecord> => {
    if(!db) throw new Error("Database not connected");
    const serviceRef = doc(db, "serviceRecords", serviceId);
    await updateDoc(serviceRef, data);
    
    // For simplicity, returning the partial data. A full implementation
    // would fetch the updated document to return the complete object.
    return { id: serviceId, ...data } as ServiceRecord;
};

const cancelService = async (serviceId: string, reason: string): Promise<void> => {
    if(!db) throw new Error("Database not connected");
    const serviceRef = doc(db, "serviceRecords", serviceId);
    await updateDoc(serviceRef, {
        status: 'Cancelado',
        cancellationReason: reason,
    });
};

const completeService = async (serviceId: string, paymentDetails: { paymentMethod: any, cardFolio?: string, transferFolio?: string }): Promise<ServiceRecord> => {
    if(!db) throw new Error("Database not connected");
    const serviceRef = doc(db, "serviceRecords", serviceId);
    
    const updatedServiceData = {
      status: 'Entregado',
      deliveryDateTime: new Date().toISOString(),
      ...paymentDetails,
    };
    
    await updateDoc(serviceRef, updatedServiceData);
    
    return { id: serviceId, ...updatedServiceData } as ServiceRecord;
};

const saveMigratedServices = async (services: ExtractedService[]): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
    const vehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
    const vehicleMap = new Map(vehicles.map(v => [v.licensePlate, v.id]));
    
    const batch = writeBatch(db);

    for (const service of services) {
        let vehicleId = vehicleMap.get(service.vehicleLicensePlate);
        
        if (!vehicleId) {
            const newVehicleRef = doc(collection(db, 'vehicles'));
            vehicleId = newVehicleRef.id;
            
            const newVehicleData = {
                licensePlate: service.vehicleLicensePlate,
                make: '', model: '', year: 0, ownerName: '', ownerPhone: '',
            };
            
            batch.set(newVehicleRef, newVehicleData);
            vehicleMap.set(service.vehicleLicensePlate, vehicleId);
        }

        let parsedDate: Date | null = null;
        const possibleFormats = ['M/d/yy', 'MM/dd/yy', 'M-d-yy', 'MM-dd-yy', 'yyyy-MM-dd', 'dd/MM/yyyy'];
        for (const fmt of possibleFormats) {
            const dt = parse(service.serviceDate, fmt, new Date());
            if (isValid(dt)) { parsedDate = dt; break; }
        }
        
        if (!parsedDate) continue;

        const serviceRecord: Omit<ServiceRecord, 'id'> = {
            vehicleId: vehicleId, vehicleIdentifier: service.vehicleLicensePlate,
            serviceDate: parsedDate.toISOString(), description: service.description,
            totalCost: service.totalCost, status: 'Completado', 
            deliveryDateTime: parsedDate.toISOString(), subTotal: service.totalCost / 1.16,
            taxAmount: service.totalCost - (service.totalCost / 1.16),
            serviceProfit: 0, totalSuppliesCost: 0, technicianId: 'N/A',
            serviceItems: [{ id: 'migrated-item', name: service.description, price: service.totalCost, suppliesUsed: [] }],
        };
        const newDocRef = doc(collection(db, "serviceRecords"));
        batch.set(newDocRef, serviceRecord);
    }
    await batch.commit();
}

// --- Sales ---
const onSalesUpdate = (callback: (sales: SaleReceipt[]) => void): (() => void) => {
    if(!db) return () => {};
    const q = query(collection(db, "sales"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const sales: SaleReceipt[] = [];
        querySnapshot.forEach((doc) => {
            sales.push({ id: doc.id, ...doc.data() } as SaleReceipt);
        });
        callback(sales);
    });
    return unsubscribe;
};

const registerSale = async (saleData: Omit<SaleReceipt, 'id' | 'saleDate'>, inventoryItems: InventoryItem[], batch: ReturnType<typeof writeBatch>): Promise<string> => {
    const IVA_RATE = 0.16;
    const totalAmount = saleData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const subTotal = totalAmount / (1 + IVA_RATE);
    const tax = totalAmount - subTotal;

    const newSale: Omit<SaleReceipt, 'id'> = {
      ...saleData,
      saleDate: new Date().toISOString(),
      subTotal, tax, totalAmount,
      status: 'Completado',
    };
    
    const newSaleRef = doc(collection(db, "sales"));
    batch.set(newSaleRef, newSale);

    saleData.items.forEach(soldItem => {
        const inventoryItem = inventoryItems.find(invItem => invItem.id === soldItem.inventoryItemId);
        if (inventoryItem && !inventoryItem.isService) {
            const itemRef = doc(db, "inventory", soldItem.inventoryItemId);
            batch.update(itemRef, { quantity: inventoryItem.quantity - soldItem.quantity });
        }
    });
    
    if (newSale.paymentMethod === 'Efectivo') {
        const cashTransactionRef = doc(collection(db, "cashDrawerTransactions"));
        batch.set(cashTransactionRef, {
            date: new Date().toISOString(),
            type: 'Entrada',
            amount: totalAmount,
            concept: `Venta POS #${newSaleRef.id.slice(0, 6)}`,
            userId: 'system', // Replace with actual user ID
            userName: 'Sistema',
        });
    }
    
    return newSaleRef.id;
};

// --- Cash Drawer ---
const onCashTransactionsUpdate = (callback: (transactions: CashDrawerTransaction[]) => void): (() => void) => {
    if(!db) return () => {};
    const q = query(collection(db, "cashDrawerTransactions"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        callback(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashDrawerTransaction)));
    });
    return unsubscribe;
};

const addCashTransaction = async (transaction: Omit<CashDrawerTransaction, 'id' | 'date'>): Promise<void> => {
    if (!db) throw new Error("Database not connected");
    await addDoc(collection(db, 'cashDrawerTransactions'), {
        ...transaction,
        date: new Date().toISOString()
    });
};

const onInitialCashBalanceUpdate = (callback: (balance: InitialCashBalance | null) => void): (() => void) => {
    if(!db) return () => {};
    const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const docRef = doc(db, "initialCashBalances", todayStr);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        callback(docSnap.exists() ? docSnap.data() as InitialCashBalance : null);
    });
    return unsubscribe;
};

const setInitialCashBalance = async (balance: InitialCashBalance): Promise<void> => {
    if (!db) throw new Error("Database not connected");
    const docId = format(parseISO(balance.date), 'yyyy-MM-dd');
    const docRef = doc(db, "initialCashBalances", docId);
    await addDoc(collection(db, 'initialCashBalances'), balance);
};


export const operationsService = {
    onServicesUpdate,
    updateService,
    cancelService,
    completeService,
    saveMigratedServices,
    onSalesUpdate,
    registerSale,
    onCashTransactionsUpdate,
    addCashTransaction,
    onInitialCashBalanceUpdate,
    setInitialCashBalance,
};
