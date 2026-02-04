// src/lib/services/purchase.service.ts

import {
  collection,
  doc,
  writeBatch,
  Timestamp,
  getDoc,
  onSnapshot,
  query,
  getDocs,
  where,
  type WriteBatch,
  serverTimestamp,
  orderBy,
  runTransaction,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { PurchaseFormValues } from '@/app/(app)/inventario/compras/components/register-purchase-dialog';
import type { User, PayableAccount, PaymentMethod } from '@/types';
import { inventoryService } from './inventory.service';
import { adminService } from './admin.service';
import { cleanObjectForFirestore } from '../forms';
import { formatCurrency } from '../utils';

// --- Accounts Payable (listener) ---
const onPayableAccountsUpdate = (callback: (accounts: PayableAccount[]) => void): (() => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'payableAccounts'), orderBy('dueDate', 'asc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PayableAccount)));
  });
};

// --- Listener para compras ---
const onPurchasesUpdate = (callback: (purchases: any[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'purchases'), orderBy('invoiceDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
        console.error("Error listening to purchases:", error);
    });
};

// Helpers
const asMoney = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (typeof v === 'number' ? v : 0);
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

const isCash = (m: string | PaymentMethod) => String(m).toLowerCase() === 'efectivo';
const isCard = (m: string | PaymentMethod) => String(m).toLowerCase() === 'tarjeta';
const isTransfer = (m: string | PaymentMethod) => String(m).toLowerCase() === 'transferencia';
const isImmediatePayment = (m: string | PaymentMethod) => isCash(m) || isCard(m) || isTransfer(m);
const isCredit = (m: string | PaymentMethod) => String(m).toLowerCase() === 'crédito' || String(m).toLowerCase() === 'credito';

/**
 * Registra una compra:
 * - Actualiza inventario (batch).
 * - Crea documento de compra en 'purchases'.
 * - Si es Crédito: crea cuenta por pagar (vinculada) y aumenta deuda del proveedor.
 * - Si es pago inmediato: crea salida en caja SOLO si paymentMethod === 'Efectivo' (vinculada).
 * - Log de auditoría.
 */
const registerPurchase = async (data: PurchaseFormValues): Promise<void> => {
  if (!db) throw new Error('Database not initialized.');

  const batch = writeBatch(db);
  const userString = typeof window !== 'undefined' ? localStorage.getItem('authUser') : null;
  const user: User | null = userString ? JSON.parse(userString) : null;

  // --- Validaciones mínimas
  if (!data.items || data.items.length === 0) {
    throw new Error('La compra debe incluir al menos un artículo.');
  }
  if (!data.supplierId) {
    throw new Error('Falta el proveedor en la compra.');
  }
  if (isCredit(data.paymentMethod) && !data.dueDate) {
    throw new Error('Para compras a crédito, debes indicar la fecha de vencimiento (dueDate).');
  }

  // Normalización de importes
  const invoiceTotal = asMoney(data.invoiceTotal);
  const subtotal = data.subtotal != null ? asMoney(data.subtotal) : undefined;
  const taxes = data.taxes != null ? asMoney(data.taxes) : undefined;
  const discounts = data.discounts != null ? asMoney(data.discounts) : undefined;

  // --- 1) Actualización de inventario (sumar existencias y actualizar costo unitario + precio venta)
  const inventoryUpdateItems = data.items.map((item: any) => ({
    id: item.inventoryItemId,
    quantity: item.quantity,
    unitPrice: asMoney(item.purchasePrice),
    sellingPrice: item.sellingPrice != null ? asMoney(item.sellingPrice) : undefined,
  }));
  await inventoryService.updateInventoryStock(batch, inventoryUpdateItems, 'add');

  // --- 2) Datos del proveedor
  const supplierDoc = await inventoryService.getDocById('suppliers', data.supplierId);
  const supplierName = (supplierDoc as any)?.name || 'N/A';
  const supplierRef = doc(db, 'suppliers', data.supplierId);

  // --- 3) IDs relacionados que usaremos en ambos sentidos
  const purchaseRef = doc(collection(db, 'purchases'));
  const purchaseId = purchaseRef.id;

  const payableRef = isCredit(data.paymentMethod) ? doc(collection(db, 'payableAccounts')) : null;
  const payableAccountId = payableRef?.id ?? null;

  const cashTxRef = isCash(data.paymentMethod) ? doc(collection(db, 'cashDrawerTransactions')) : null;
  const cashTransactionId = cashTxRef?.id ?? null;

  // --- 4) Documento de compra
  const purchaseDoc = cleanObjectForFirestore({
    supplierId: data.supplierId,
    supplierName,
    invoiceId: data.invoiceId || `COMPRA-${Date.now()}`,
    invoiceDate: new Date().toISOString(),
    dueDate: isCredit(data.paymentMethod) && data.dueDate ? Timestamp.fromDate(new Date(data.dueDate)) : null,
    items: data.items.map((it:any) => ({
      inventoryItemId: it.inventoryItemId,
      itemName: it.itemName,
      quantity: it.quantity,
      purchasePrice: asMoney(it.purchasePrice),
      sellingPrice: it.sellingPrice != null ? asMoney(it.sellingPrice) : undefined,
      subtotal: asMoney((it.quantity ?? 0) * (asMoney(it.purchasePrice) ?? 0)),
    })),
    subtotal,
    taxes,
    discounts,
    invoiceTotal,
    paymentMethod: data.paymentMethod,
    status: 'Completado',
    paymentStatus: isCredit(data.paymentMethod) ? 'Pendiente' : 'Pagado',
    // vínculos
    payableAccountId,
    cashTransactionId,
    createdAt: serverTimestamp(),
    createdBy: {
      userId: user?.id || 'system',
      userName: user?.name || 'Sistema',
    },
  });
  batch.set(purchaseRef, purchaseDoc);

  // --- 5) Cuentas por pagar vs pago inmediato
  if (isCredit(data.paymentMethod) && payableRef) {
    const newPayableAccount: Omit<PayableAccount, 'id'> = {
      supplierId: data.supplierId,
      supplierName,
      invoiceId: purchaseDoc.invoiceId,
      invoiceDate: purchaseDoc.invoiceDate,
      dueDate: purchaseDoc.dueDate,
      totalAmount: invoiceTotal,
      paidAmount: 0,
      status: 'Pendiente',
      purchaseId,
      createdAt: serverTimestamp(),
    } as any;

    batch.set(payableRef, cleanObjectForFirestore(newPayableAccount));
    const currentDebt = (supplierDoc as any)?.debtAmount || 0;
    batch.set(supplierRef, { debtAmount: asMoney(currentDebt + invoiceTotal) }, { merge: true });
  } else if (isCash(data.paymentMethod) && cashTxRef) {
    // 5b) Pago inmediato: salida en caja
    batch.set(
      cashTxRef,
      cleanObjectForFirestore({
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        type: 'Salida',
        amount: invoiceTotal,
        concept: `Compra a ${supplierName} (Factura: ${purchaseDoc.invoiceId})`,
        paymentMethod: data.paymentMethod,
        userId: user?.id || 'system',
        userName: user?.name || 'Sistema',
        relatedType: 'Compra',
        relatedId: purchaseId,
      })
    );
  }
  
  await batch.commit();

  const description = `Registró compra a ${supplierName} con factura #${purchaseDoc.invoiceId} por un total de ${formatCurrency(
    invoiceTotal
  )}. Método: ${data.paymentMethod}.`;
  await adminService.logAudit('Registrar', description, {
    entityType: 'Compra',
    entityId: purchaseId,
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema',
  });
};

/**
 * Elimina una compra y restaura el inventario.
 */
const deletePurchase = async (purchaseId: string, currentUser: User | null): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");

  const purchaseRef = doc(db, 'purchases', purchaseId);
  const purchaseSnap = await getDoc(purchaseRef);

  if (!purchaseSnap.exists()) throw new Error("La compra no existe.");
  const data = purchaseSnap.data();

  const batch = writeBatch(db);

  // 1. Restaurar Stock (Restar lo que se compró)
  const inventoryUpdateItems = (data.items || []).map((item: any) => ({
    id: item.inventoryItemId,
    quantity: item.quantity,
  }));
  if (inventoryUpdateItems.length > 0) {
    await inventoryService.updateInventoryStock(batch, inventoryUpdateItems, 'subtract');
  }

  // 2. Limpiar Cuentas por Pagar / Deuda de Proveedor
  if (data.payableAccountId) {
    const payableRef = doc(db, 'payableAccounts', data.payableAccountId);
    const payableSnap = await getDoc(payableRef);
    if (payableSnap.exists()) {
      const payableData = payableSnap.data();
      const supplierRef = doc(db, 'suppliers', data.supplierId);
      const supplierSnap = await getDoc(supplierRef);
      if (supplierSnap.exists()) {
        const currentDebt = supplierSnap.data().debtAmount || 0;
        // Restar el total de la factura de la deuda acumulada del proveedor
        batch.update(supplierRef, { debtAmount: Math.max(0, currentDebt - (payableData.totalAmount || 0)) });
      }
      batch.delete(payableRef);
    }
  }

  // 3. Eliminar Transacción de Caja (si existe)
  if (data.cashTransactionId) {
    batch.delete(doc(db, 'cashDrawerTransactions', data.cashTransactionId));
  } else {
    // Buscar transacciones huérfanas vinculadas por relatedId por si acaso
    const cashQuery = query(collection(db, "cashDrawerTransactions"), where("relatedId", "==", purchaseId));
    const cashDocs = await getDocs(cashQuery);
    cashDocs.forEach(d => batch.delete(d.ref));
  }

  // 4. Eliminar el documento de compra
  batch.delete(purchaseRef);

  await batch.commit();

  await adminService.logAudit('Eliminar', `Eliminó la compra #${data.invoiceId || purchaseId} de ${data.supplierName} por ${formatCurrency(data.invoiceTotal || 0)}. El inventario fue restaurado.`, {
    entityType: 'Compra',
    entityId: purchaseId,
    userId: currentUser?.id || 'system',
    userName: currentUser?.name || 'Sistema',
  });
};

const registerPayableAccountPayment = async (
  accountId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  note?: string,
  user?: User | null
): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");

  await runTransaction(db, async (transaction) => {
    const accountRef = doc(db, "payableAccounts", accountId);
    const accountSnap = await transaction.get(accountRef);

    if (!accountSnap.exists()) throw new Error("Payable account not found.");

    const data = accountSnap.data() as PayableAccount;
    const paidAmount = (data.paidAmount || 0) + amount;
    const totalAmount = data.totalAmount || 0;

    let status = "Pagado Parcialmente";
    if (Math.abs(paidAmount - totalAmount) < 0.01) {
      status = "Pagado";
    }

    transaction.update(accountRef, { paidAmount, status });

    const supplierRef = doc(db, "suppliers", data.supplierId);
    const supplierSnap = await transaction.get(supplierRef);

    if (supplierSnap.exists()) {
      const currentDebt = supplierSnap.data().debtAmount || 0;
      transaction.update(supplierRef, { debtAmount: Math.max(0, currentDebt - amount) });
    }

    if (paymentMethod === "Efectivo") {
      const cashTxRef = doc(collection(db, "cashDrawerTransactions"));
      transaction.set(cashTxRef, cleanObjectForFirestore({
        date: new Date().toISOString(),
        type: "Salida",
        amount,
        concept: `Pago a proveedor ${data.supplierName} - Factura ${data.invoiceId}`,
        note,
        userId: user?.id || "system",
        userName: user?.name || "Sistema",
        relatedType: "Manual",
        paymentMethod: "Efectivo",
      }));
    }
  });
};

export const purchaseService = {
  onPayableAccountsUpdate,
  onPurchasesUpdate,
  registerPurchase,
  deletePurchase,
  registerPayableAccountPayment,
};
