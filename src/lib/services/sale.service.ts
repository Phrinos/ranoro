


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
import { inventoryService } from './inventory.service';
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
  batch?: any
): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    
    const wasBatchProvided = !!batch;
    const workBatch = batch || writeBatch(db);

    const saleRef = doc(db, 'sales', saleId);
    
    const totalAmount = saleData.items.reduce((acc, item) => acc + item.totalPrice, 0);
    const subTotal = totalAmount / 1.16;
    const tax = totalAmount - subTotal;

    const newSale: Omit<SaleReceipt, 'id'> = {
        saleDate: new Date(),
        items: saleData.items.map(it => ({
            itemId: it.inventoryItemId ?? crypto.randomUUID(),
            itemName: it.itemName,
            quantity: it.quantity,
            total: it.totalPrice ?? (it.unitPrice ?? 0) * it.quantity,
        })),
        subTotal,
        tax,
        totalAmount,
        payments: (saleData.payments ?? []).map(p => ({
            method: p.method,
            amount: p.amount ?? 0,
            folio: p.folio,
        })),
        customerName: saleData.customerName || 'Cliente Mostrador',
        registeredById: currentUser.id,
        registeredByName: currentUser.name,
        status: 'Completado',
        cardCommission: saleData.cardCommission || 0,
    };

    workBatch.set(saleRef, cleanObjectForFirestore(newSale));

    const inventoryUpdateItems = saleData.items
        .filter(item => !item.isService)
        .map(item => ({ id: item.inventoryItemId, quantity: item.quantity }));

    if (inventoryUpdateItems.length > 0) {
        await inventoryService.updateInventoryStock(workBatch, inventoryUpdateItems, 'subtract');
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
    
    const inventoryUpdateItems = saleData.items
        .filter(item => !(item as any).isService)
        .map(item => ({ id: (item as any).inventoryItemId, quantity: item.quantity }));

    if (inventoryUpdateItems.length > 0) {
        await inventoryService.updateInventoryStock(batch, inventoryUpdateItems, 'add');
    }
    
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
    const batch = writeBatch(db);

    if (saleData.status !== 'Cancelado') {
        const inventoryUpdateItems = saleData.items
            .filter(item => !(item as any).isService)
            .map(item => ({ id: (item as any).inventoryItemId, quantity: item.quantity }));
        
        if (inventoryUpdateItems.length > 0) {
            await inventoryService.updateInventoryStock(batch, inventoryUpdateItems, 'add');
        }
    }
    
    const cashQuery = query(collection(db, "cashDrawerTransactions"), where("relatedId", "==", saleId));
    const cashDocs = await getDocs(cashQuery);
    cashDocs.forEach(doc => {
        batch.delete(doc.ref);
    });

    batch.delete(saleRef);
    await batch.commit();
    
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
