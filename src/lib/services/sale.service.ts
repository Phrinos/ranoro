

import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  query,
  DocumentReference,
  Timestamp,
  orderBy,
  limit,
  where
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { SaleReceipt, InventoryItem, User, Payment } from "@/types";
import { cleanObjectForFirestore } from '../forms';
import { adminService } from './admin.service';
import { cashService } from './cash.service';
import type { POSFormValues } from '@/schemas/pos-form-schema';

const onSalesUpdate = (callback: (sales: SaleReceipt[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "sales"), orderBy("saleDate", "desc"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleReceipt)));
    });
};

const onSalesUpdatePromise = async (): Promise<SaleReceipt[]> => {
    if (!db) return [];
    const q = query(collection(db, "sales"), orderBy("saleDate", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleReceipt));
}

const updateSale = async (saleId: string, data: Partial<SaleReceipt>): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'sales', saleId);
    await updateDoc(docRef, cleanObjectForFirestore(data));
};

const registerSale = async (
  saleId: string, 
  saleData: POSFormValues, 
  inventoryItems: InventoryItem[], 
  currentUser: User,
  batch?: any // Accept an optional batch
): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    
    const wasBatchProvided = !!batch;
    const workBatch = batch || writeBatch(db);

    const saleRef = doc(db, 'sales', saleId);
    
    const inventoryMap = new Map(inventoryItems.map(i => [i.id, i]));
    const totalAmount = saleData.items.reduce((acc, item) => acc + item.totalPrice, 0);
    const subTotal = totalAmount / 1.16;
    const tax = totalAmount - subTotal;

    const newSale: Omit<SaleReceipt, 'id'> = {
        saleDate: new Date().toISOString(),
        items: saleData.items,
        subTotal,
        tax,
        totalAmount,
        payments: saleData.payments,
        customerName: saleData.customerName || 'Cliente Mostrador',
        registeredById: currentUser.id,
        registeredByName: currentUser.name,
        status: 'Completado',
        cardCommission: saleData.cardCommission || 0,
    };

    workBatch.set(saleRef, cleanObjectForFirestore(newSale));

    for (const item of saleData.items) {
        if (!item.isService) {
            const inventoryItem = inventoryMap.get(item.inventoryItemId);
            if (inventoryItem) {
                const itemRef = doc(db, 'inventory', item.inventoryItemId);
                const newQuantity = inventoryItem.quantity - item.quantity;
                workBatch.update(itemRef, { quantity: newQuantity });
            }
        }
    }

    for (const payment of saleData.payments) {
        if (payment.method === 'Efectivo') {
            const cashTransactionRef = doc(collection(db, 'cashDrawerTransactions'));
            workBatch.set(cashTransactionRef, {
                date: new Date().toISOString(),
                type: 'Entrada',
                amount: payment.amount,
                concept: `Venta POS #${saleId.slice(-6)}`,
                userId: currentUser.id,
                userName: currentUser.name,
                relatedType: 'Venta',
                relatedId: saleId,
            });
        }
    }
    
    if (!wasBatchProvided) {
        await workBatch.commit();
    }
};

const cancelSale = async (saleId: string, reason: string, currentUser: User | null): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const saleRef = doc(db, 'sales', saleId);
    const saleDoc = await getDoc(saleRef);
    if (!saleDoc.exists()) throw new Error("Sale not found.");
    
    const saleData = saleDoc.data() as SaleReceipt;
    if (saleData.status === 'Cancelado') return;

    const batch = writeBatch(db);
    batch.update(saleRef, { status: 'Cancelado', cancellationReason: reason });
    
    // Restore inventory
    for (const item of saleData.items) {
        if (!item.isService) {
            const itemRef = doc(db, 'inventory', item.inventoryItemId);
            const inventoryDoc = await getDoc(itemRef);
            if (inventoryDoc.exists()) {
                const currentQuantity = inventoryDoc.data().quantity || 0;
                batch.update(itemRef, { quantity: currentQuantity + item.quantity });
            }
        }
    }
    
    // Remove cash transactions related to this sale
    const cashQuery = query(collection(db, "cashDrawerTransactions"), where("relatedId", "==", saleId));
    const cashDocs = await getDocs(cashQuery);
    cashDocs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    await adminService.logAudit('Cancelar', `Canceló la venta #${saleId.slice(-6)} por: ${reason}`, { entityType: 'Venta', entityId: saleId, userId: currentUser?.id || 'system', userName: currentUser?.name || 'Sistema' });
};


const deleteSale = async (saleId: string, currentUser: User | null): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const saleRef = doc(db, 'sales', saleId);
    const saleDoc = await getDoc(saleRef);
    if (!saleDoc.exists()) return;

    const saleData = saleDoc.data() as SaleReceipt;

    // Restore stock if the sale was not already cancelled
    if (saleData.status !== 'Cancelado') {
        const batch = writeBatch(db);
        for (const item of saleData.items) {
            if (!item.isService) {
                const itemRef = doc(db, 'inventory', item.inventoryItemId);
                const invDoc = await getDoc(itemRef);
                if (invDoc.exists()) {
                    const currentQuantity = invDoc.data().quantity || 0;
                    batch.update(itemRef, { quantity: currentQuantity + item.quantity });
                }
            }
        }
        await batch.commit();
    }
    
    // Delete cash transactions related to this sale
    const cashQuery = query(collection(db, "cashDrawerTransactions"), where("relatedId", "==", saleId));
    const cashDocs = await getDocs(cashQuery);
    const deleteBatch = writeBatch(db);
    cashDocs.forEach(doc => {
        deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();

    await deleteDoc(saleRef);
    
    await adminService.logAudit('Eliminar', `Eliminó permanentemente la venta #${saleId.slice(-6)}.`, {
      entityType: 'Venta',
      entityId: saleId,
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'Sistema',
    });
};


export const saleService = {
  onSalesUpdate,
  onSalesUpdatePromise,
  updateSale,
  registerSale,
  cancelSale,
  deleteSale,
};
