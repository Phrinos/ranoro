
// src/lib/services/purchase.service.ts

import {
  collection,
  doc,
  writeBatch,
  Timestamp,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  runTransaction, // Importar runTransaction
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { PurchaseFormValues } from '@/app/(app)/inventario/components/register-purchase-dialog';
import type { User, PayableAccount, PaymentMethod } from '@/types';
import { inventoryService } from './inventory.service';
import { adminService } from './admin.service';
import { cleanObjectForFirestore } from '../forms';
import { formatCurrency } from '../utils';

// --- Accounts Payable ---
const onPayableAccountsUpdate = (callback: (accounts: PayableAccount[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "payableAccounts"), orderBy("dueDate", "asc"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayableAccount)));
    });
};


const registerPurchase = async (data: PurchaseFormValues): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");

  const batch = writeBatch(db);
  const userString = localStorage.getItem('authUser');
  const user: User | null = userString ? JSON.parse(userString) : null;

  // 1. Update inventory quantities and unit prices for each item
  const inventoryUpdateItems = data.items.map(item => ({
    id: item.inventoryItemId,
    quantity: item.quantity,
    unitPrice: item.purchasePrice,
  }));

  if (inventoryUpdateItems.length > 0) {
    await inventoryService.updateInventoryStock(batch, inventoryUpdateItems, 'add');
  }

  // 2. If it's a credit purchase, create or update a payable account
  if (data.paymentMethod === 'Crédito') {
    const supplierDoc = await inventoryService.getDocById('suppliers', data.supplierId);
    const newPayableAccount: Omit<PayableAccount, 'id'> = {
      supplierId: data.supplierId,
      supplierName: supplierDoc?.name || 'N/A',
      invoiceId: data.invoiceId || `COMPRA-${Date.now()}`,
      invoiceDate: new Date().toISOString(),
      dueDate: data.dueDate!.toISOString(),
      totalAmount: data.invoiceTotal,
      paidAmount: 0,
      status: 'Pendiente',
    };
    const payableAccountRef = doc(collection(db, 'payableAccounts'));
    batch.set(payableAccountRef, cleanObjectForFirestore(newPayableAccount));
    
     // 3. Update the supplier's debt amount
    const supplierRef = doc(db, 'suppliers', data.supplierId);
    if(supplierDoc){
        const currentDebt = supplierDoc.debtAmount || 0;
        batch.update(supplierRef, { debtAmount: currentDebt + data.invoiceTotal });
    }

  } else {
    // If it's a cash/card/transfer purchase, it's considered an expense from cash drawer
    const supplierDoc = await inventoryService.getDocById('suppliers', data.supplierId);
    const transactionConcept = `Compra a ${ supplierDoc?.name || 'Proveedor' } (Factura: ${data.invoiceId || 'N/A'})`;
    const cashTransactionRef = doc(collection(db, 'cashDrawerTransactions'));
    batch.set(cashTransactionRef, {
        date: new Date().toISOString(),
        type: 'Salida',
        amount: data.invoiceTotal,
        concept: transactionConcept,
        userId: user?.id || 'system',
        userName: user?.name || 'Sistema',
        relatedType: 'Compra',
        relatedId: data.supplierId
    });
  }
  
  // Log the audit event
  const description = `Registró compra al proveedor con factura #${data.invoiceId || 'N/A'} por un total de ${formatCurrency(data.invoiceTotal)}.`;
  await adminService.logAudit('Registrar', description, {
    entityType: 'Compra',
    entityId: data.supplierId,
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema',
  });
  
  await batch.commit();
};


const registerPayableAccountPayment = async (
    accountId: string, 
    amount: number, 
    paymentMethod: PaymentMethod, 
    note: string | undefined, 
    user: User | null
): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");

    const accountRef = doc(db, 'payableAccounts', accountId);

    // Usamos una transacción para asegurar la atomicidad de las operaciones
    await runTransaction(db, async (transaction) => {
        // --- 1. ALL READS FIRST ---
        const accountSnap = await transaction.get(accountRef);
        if (!accountSnap.exists()) {
            throw new Error("La cuenta por pagar no fue encontrada.");
        }
        const accountData = accountSnap.data() as PayableAccount;
        
        const supplierRef = doc(db, 'suppliers', accountData.supplierId);
        const supplierSnap = await transaction.get(supplierRef);
        
        // --- 2. ALL WRITES AFTER ---
        const newPaidAmount = (accountData.paidAmount || 0) + amount;
        const newStatus = (accountData.totalAmount - newPaidAmount) <= 0.01 ? 'Pagado' : 'Pagado Parcialmente';

        // Update payable account
        transaction.update(accountRef, {
            paidAmount: newPaidAmount,
            status: newStatus,
        });

        // Update supplier's debt
        if (supplierSnap.exists()) {
            const currentDebt = supplierSnap.data().debtAmount || 0;
            transaction.update(supplierRef, { debtAmount: currentDebt - amount });
        }

        // Register cash out if applicable
        if (paymentMethod === 'Efectivo') {
            const cashTransactionRef = doc(collection(db, 'cashDrawerTransactions'));
            transaction.set(cashTransactionRef, {
                date: new Date().toISOString(),
                type: 'Salida',
                amount,
                concept: `Pago a proveedor: ${accountData.supplierName} (Factura: ${accountData.invoiceId})`,
                userId: user?.id || 'system',
                userName: user?.name || 'Sistema',
                relatedType: 'Compra',
                relatedId: accountId,
            });
        }
    });

    // 4. Log de auditoría (fuera de la transacción)
    const accountData = (await getDoc(accountRef)).data() as PayableAccount;
    await adminService.logAudit('Pagar', `Registró pago de ${formatCurrency(amount)} a la cuenta de ${accountData.supplierName}.`, { 
        entityType: 'Cuentas Por Pagar', 
        entityId: accountId, 
        userId: user?.id || 'system', 
        userName: user?.name || 'Sistema' 
    });
};


export const purchaseService = {
  onPayableAccountsUpdate,
  registerPurchase,
  registerPayableAccountPayment,
};
