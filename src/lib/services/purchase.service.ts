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

/**
 * Registra una compra:
 * - Actualiza inventario (batch).
 * - Crea documento de compra en 'purchases'.
 * - Si es Crédito: crea cuenta por pagar y aumenta deuda del proveedor.
 * - Si es pago inmediato: registra salida en caja SOLO si paymentMethod === 'Efectivo'.
 * - Log de auditoría.
 */
const registerPurchase = async (data: PurchaseFormValues): Promise<void> => {
  if (!db) throw new Error('Database not initialized.');

  const batch = writeBatch(db);
  const userString = typeof window !== 'undefined' ? localStorage.getItem('authUser') : null;
  const user: User | null = userString ? JSON.parse(userString) : null;

  // 0) Sanitizar y validar mínimos
  if (!data.items || data.items.length === 0) {
    throw new Error('La compra debe incluir al menos un artículo.');
  }
  if (!data.supplierId) {
    throw new Error('Falta el proveedor en la compra.');
  }

  // 1) Actualización de inventario (sumar existencias y actualizar costo unitario)
  const inventoryUpdateItems = data.items.map((item) => ({
    id: item.inventoryItemId,
    quantity: item.quantity,
    unitPrice: item.purchasePrice,
  }));
  await inventoryService.updateInventoryStock(batch, inventoryUpdateItems, 'add');

  // 2) Datos del proveedor
  const supplierDoc = await inventoryService.getDocById('suppliers', data.supplierId);
  const supplierName = (supplierDoc as any)?.name || 'N/A';
  const supplierRef = doc(db, 'suppliers', data.supplierId);

  // 3) Crear documento de compra (para tener ID y referenciar en caja/cxp)
  const purchaseRef = doc(collection(db, 'purchases'));
  const purchaseId = purchaseRef.id;

  const purchaseDoc = cleanObjectForFirestore({
    supplierId: data.supplierId,
    supplierName,
    invoiceId: data.invoiceId || `COMPRA-${Date.now()}`,
    date: new Date().toISOString(), // Use current date for purchase
    dueDate:
      data.paymentMethod === 'Crédito' && data.dueDate
        ? data.dueDate.toISOString()
        : null,
    items: data.items.map((it:any) => ({
      inventoryItemId: it.inventoryItemId,
      itemName: it.itemName,
      quantity: it.quantity,
      purchasePrice: it.purchasePrice,
      unit: it.unit,
      subtotal: (it.quantity ?? 0) * (it.purchasePrice ?? 0),
    })),
    subtotal: data.subtotal,
    taxes: data.taxes,
    discounts: data.discounts,
    invoiceTotal: data.invoiceTotal,
    paymentMethod: data.paymentMethod, // 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Crédito' ...
    status: 'Registrada',
    paymentStatus: data.paymentMethod === 'Crédito' ? 'Pendiente' : 'Pagado',
    createdAt: serverTimestamp(),
    createdBy: {
      userId: user?.id || 'system',
      userName: user?.name || 'Sistema',
    },
  });

  batch.set(purchaseRef, purchaseDoc);

  // 4) Cuentas por pagar vs pago inmediato
  if (data.paymentMethod === 'Crédito') {
    // 4a) Crea cuenta por pagar y aumenta deuda del proveedor
    const payableRef = doc(collection(db, 'payableAccounts'));
    const newPayableAccount: Omit<PayableAccount, 'id'> = {
      supplierId: data.supplierId,
      supplierName,
      invoiceId: purchaseDoc.invoiceId,
      invoiceDate: purchaseDoc.date,
      dueDate: purchaseDoc.dueDate ?? purchaseDoc.date,
      totalAmount: data.invoiceTotal,
      paidAmount: 0,
      status: 'Pendiente',
      // Opcional: referencia a la compra
      purchaseId,
      createdAt: serverTimestamp(),
    } as any;

    batch.set(payableRef, cleanObjectForFirestore(newPayableAccount));

    // Actualiza deuda del proveedor
    const currentDebt = (supplierDoc as any)?.debtAmount || 0;
    batch.update(supplierRef, { debtAmount: currentDebt + data.invoiceTotal });
  } else {
    // 4b) Pago inmediato:
    // Registrar salida de caja para métodos de pago que representan egreso de efectivo/banco
    const paymentMethodsForCashOut = ['Efectivo', 'Transferencia', 'Tarjeta'];
    if (paymentMethodsForCashOut.includes(data.paymentMethod)) {
      const cashTxRef = doc(collection(db, 'cashDrawerTransactions'));
      batch.set(
        cashTxRef,
        cleanObjectForFirestore({
          date: serverTimestamp(),
          type: 'Salida',
          amount: data.invoiceTotal,
          concept: `Compra a ${supplierName} (Factura: ${purchaseDoc.invoiceId})`,
          paymentMethod: data.paymentMethod,
          userId: user?.id || 'system',
          userName: user?.name || 'Sistema',
          relatedType: 'Compra',
          relatedId: purchaseId,
        })
      );
    }
  }

  // 5) Commit de todo el batch
  await batch.commit();

  // 6) Auditoría (fuera del batch)
  const description = `Registró compra a ${supplierName} con factura #${
    purchaseDoc.invoiceId
  } por un total de ${formatCurrency(data.invoiceTotal)}. Método: ${data.paymentMethod}.`;
  await adminService.logAudit('Registrar', description, {
    entityType: 'Compra',
    entityId: purchaseId,
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema',
  });
};

/**
 * Paga una cuenta por pagar con atomicidad:
 * - Actualiza paidAmount/status de la CxP.
 * - Reduce deuda del proveedor.
 * - Registra salida en caja SOLO si paymentMethod === 'Efectivo'.
 * - Log de auditoría (fuera de la transacción).
 */
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
    // --- 1) LECTURAS ---
    const accountSnap = await transaction.get(accountRef);
    if (!accountSnap.exists()) {
      throw new Error('La cuenta por pagar no fue encontrada.');
    }
    const accountData = accountSnap.data() as PayableAccount;

    const supplierRef = doc(db, 'suppliers', accountData.supplierId);
    const supplierSnap = await transaction.get(supplierRef);

    // --- 2) ESCRITURAS ---
    const prevPaid = accountData.paidAmount || 0;
    const newPaidAmount = prevPaid + amount;
    const remaining = (accountData.totalAmount || 0) - newPaidAmount;
    const newStatus = remaining <= 0.01 ? 'Pagado' : 'Pagado Parcialmente';

    // Actualiza cuenta por pagar
    transaction.update(accountRef, {
      paidAmount: newPaidAmount,
      status: newStatus,
      updatedAt: serverTimestamp(),
      lastPaymentNote: note || null,
      lastPaymentMethod: paymentMethod,
    });

    // Reduce deuda del proveedor
    if (supplierSnap.exists()) {
      const currentDebt = (supplierSnap.data() as any).debtAmount || 0;
      transaction.update(supplierRef, { debtAmount: currentDebt - amount });
    }

    // Registra salida en caja si el pago fue en efectivo
    if (paymentMethod === 'Efectivo') {
      const cashTransactionRef = doc(collection(db, 'cashDrawerTransactions'));
      transaction.set(
        cashTransactionRef,
        cleanObjectForFirestore({
          date: serverTimestamp(),
          type: 'Salida',
          amount,
          concept: `Pago a proveedor: ${accountData.supplierName} (Factura: ${accountData.invoiceId})`,
          userId: user?.id || 'system',
          userName: user?.name || 'Sistema',
          relatedType: 'CuentaPorPagar',
          relatedId: accountId,
        })
      );
    }
  });

  // Auditoría (fuera de la transacción)
  const accountData = (await getDoc(accountRef)).data() as PayableAccount;
  await adminService.logAudit(
    'Pagar',
    `Registró pago de ${formatCurrency(amount)} a la cuenta de ${accountData.supplierName}.`,
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
  registerPurchase,
  registerPayableAccountPayment,
};
