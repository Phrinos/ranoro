
// src/lib/services/purchase.service.ts

import {
  collection,
  doc,
  writeBatch,
  Timestamp,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { PurchaseFormValues } from '@/app/(app)/inventario/compras/components/register-purchase-dialog';
import type { User, PayableAccount, PaymentMethod, SaleReceipt } from '@/types';
import { inventoryService } from './inventory.service';
import { adminService } from './admin.service';
import { cleanObjectForFirestore } from '../forms';
import { formatCurrency } from '../utils';

// --- Listener para compras ---
const onPurchasesUpdate = (callback: (purchases: SaleReceipt[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'purchases'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as unknown as SaleReceipt)));
    }, (error) => {
        console.error("Error listening to purchases:", error);
    });
};

// --- Accounts Payable (listener) ---
const onPayableAccountsUpdate = (callback: (accounts: PayableAccount[]) => void): (() => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'payableAccounts'), orderBy('dueDate', 'asc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PayableAccount)));
  });
};

// Helpers
const asMoney = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (typeof v === 'number' ? v : 0);
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

const isCash = (m: string | PaymentMethod) => String(m).toLowerCase() === 'efectivo';
const isCredit = (m: string | PaymentMethod) => String(m).toLowerCase() === 'crédito' || String(m).toLowerCase() === 'credito';

/**
 * Registra una compra:
 * - Actualiza inventario (batch).
 * - Crea documento de compra en 'purchases'.
 * - Si es Crédito: crea cuenta por pagar (vinculada) y aumenta deuda del proveedor.
 * - Si es pago inmediato: crea salida en caja SOLO si paymentMethod === 'Efectivo'.
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

  // --- 1) Actualización de inventario (sumar existencias y actualizar costo unitario)
  const inventoryUpdateItems = data.items.map((item) => ({
    id: item.inventoryItemId,
    quantity: item.quantity,
    unitPrice: asMoney(item.purchasePrice),
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
    invoiceDate: data.invoiceDate ? Timestamp.fromDate(new Date(data.invoiceDate)) : serverTimestamp(),
    dueDate: isCredit(data.paymentMethod) && data.dueDate ? Timestamp.fromDate(new Date(data.dueDate)) : null,
    items: data.items.map((it:any) => ({
      inventoryItemId: it.inventoryItemId,
      itemName: it.itemName,
      quantity: it.quantity,
      purchasePrice: asMoney(it.purchasePrice),
      subtotal: asMoney((it.quantity ?? 0) * (asMoney(it.purchasePrice) ?? 0)),
    })),
    subtotal,
    taxes,
    discounts,
    invoiceTotal,
    paymentMethod: data.paymentMethod, 
    status: 'Completado', // Estado corregido
    paymentStatus: isCredit(data.paymentMethod) ? 'Pendiente' : 'Pagado',
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
      invoiceDate: purchaseDoc.invoiceDate ?? serverTimestamp(),
      dueDate: purchaseDoc.dueDate ?? serverTimestamp(),
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
    batch.set(
      cashTxRef,
      cleanObjectForFirestore({
        date: serverTimestamp(),
        type: 'Salida',
        amount: invoiceTotal,
        concept: `Compra a ${supplierName} (Factura: ${purchaseDoc.invoiceId})`,
        paymentMethod: 'Efectivo',
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

const registerPayableAccountPayment = async (
  accountId: string,
  amount: number,
  paymentMethod: PaymentMethod | string,
  note: string | undefined,
  user: User | null
): Promise<void> => {
  if (!db) throw new Error('Database not initialized.');

  const accountRef = doc(db, 'payableAccounts', accountId);

  await runTransaction(db, async (transaction) => {
    const accountSnap = await transaction.get(accountRef);
    if (!accountSnap.exists()) {
      throw new Error('La cuenta por pagar no fue encontrada.');
    }
    const accountData = accountSnap.data() as PayableAccount;

    const supplierRef = doc(db, 'suppliers', accountData.supplierId);
    const supplierSnap = await transaction.get(supplierRef);

    const payAmount = asMoney(amount);
    const prevPaid = accountData.paidAmount || 0;
    const newPaidAmount = asMoney(prevPaid + payAmount);
    const remaining = asMoney((accountData.totalAmount || 0) - newPaidAmount);
    const newStatus = remaining <= 0.01 ? 'Pagado' : 'Pagado Parcialmente';

    transaction.update(accountRef, {
      paidAmount: newPaidAmount,
      status: newStatus,
      updatedAt: serverTimestamp(),
      lastPaymentNote: note || null,
      lastPaymentMethod: paymentMethod,
    });

    if (supplierSnap.exists()) {
      const currentDebt = asMoney((supplierSnap.data() as any).debtAmount || 0);
      transaction.update(supplierRef, { debtAmount: asMoney(currentDebt - payAmount) });
    }

    if (isCash(paymentMethod)) {
      const cashTransactionRef = doc(collection(db, 'cashDrawerTransactions'));
      transaction.set(
        cashTransactionRef,
        cleanObjectForFirestore({
          date: serverTimestamp(),
          type: 'Salida',
          amount: payAmount,
          concept: `Pago a proveedor: ${accountData.supplierName} (Factura: ${accountData.invoiceId})`,
          userId: user?.id || 'system',
          userName: user?.name || 'Sistema',
          relatedType: 'CuentaPorPagar',
          relatedId: accountId,
        })
      );
    }
  });

  const accountData = (await getDoc(accountRef)).data() as PayableAccount;
  await adminService.logAudit(
    'Pagar',
    `Registró pago de ${formatCurrency(asMoney(amount))} a la cuenta de ${accountData.supplierName}.`,
    {
      entityType: 'Cuentas Por Pagar',
      entityId: accountId,
      userId: user?.id || 'system',
      userName: user?.name || 'Sistema',
    }
  );
};

export const purchaseService = {
  onPayableAccountsUpdate,
  onPurchasesUpdate, // <-- Exportar nueva función
  registerPurchase,
  registerPayableAccountPayment,
};
