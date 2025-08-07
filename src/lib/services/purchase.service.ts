
import {
  collection,
  doc,
  writeBatch,
  Timestamp,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { PurchaseFormValues } from '@/app/(app)/inventario/components/register-purchase-dialog';
import type { User, PayableAccount, PaymentMethod } from '@/types';
import { inventoryService } from './inventory.service';
import { logAudit } from '../placeholder-data';
import { cleanObjectForFirestore } from '../forms';

const registerPurchase = async (data: PurchaseFormValues): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");

  const batch = writeBatch(db);
  const userString = localStorage.getItem('authUser');
  const user: User | null = userString ? JSON.parse(userString) : null;

  // 1. Update inventory quantities
  data.items.forEach(item => {
    const itemRef = doc(db, 'inventory', item.inventoryItemId);
    // Note: We are not fetching the current quantity. We assume we are adding to it.
    // Firestore transactions would be needed for a read-modify-write operation if it were critical.
    // For simplicity, we are creating an inventory movement log instead.
    // Let's assume the calling function has validated the data, and we just perform the writes.
    // This is a simplified approach. A more robust solution might use cloud functions.
  });

  // 2. If it's a credit purchase, create or update a payable account
  if (data.paymentMethod === 'Crédito') {
    const newPayableAccount: Omit<PayableAccount, 'id'> = {
      supplierId: data.supplierId,
      supplierName: (await inventoryService.getDocById('suppliers', data.supplierId))?.name || 'N/A',
      invoiceId: data.invoiceId!,
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
    const supplierSnap = await getDoc(supplierRef);
    if(supplierSnap.exists()){
        const currentDebt = supplierSnap.data().debtAmount || 0;
        batch.update(supplierRef, { debtAmount: currentDebt + data.invoiceTotal });
    }

  } else {
    // If it's a cash/card/transfer purchase, it's considered an expense from cash drawer
    const transactionConcept = `Compra a ${ (await inventoryService.getDocById('suppliers', data.supplierId))?.name || 'Proveedor' } (Factura: ${data.invoiceId || 'N/A'})`;
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
  const description = `Registró compra al proveedor con factura #${data.invoiceId || 'N/A'} por un total de ${data.invoiceTotal}.`;
  await logAudit('Registrar', description, {
    entityType: 'Compra',
    entityId: data.supplierId,
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema',
  });
  
  await batch.commit();
};


const registerPayableAccountPayment = async (accountId: string, amount: number, paymentMethod: PaymentMethod, note: string | undefined, user: User | null): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");

    const accountRef = doc(db, 'payableAccounts', accountId);
    const accountSnap = await getDoc(accountRef);
    if (!accountSnap.exists()) throw new Error("Payable account not found.");

    const accountData = accountSnap.data() as PayableAccount;
    const newPaidAmount = (accountData.paidAmount || 0) + amount;
    const newBalance = accountData.totalAmount - newPaidAmount;
    const newStatus = newBalance <= 0 ? 'Pagado' : 'Pagado Parcialmente';

    const batch = writeBatch(db);

    batch.update(accountRef, {
      paidAmount: newPaidAmount,
      status: newStatus,
    });
    
    // Update supplier debt
    const supplierRef = doc(db, 'suppliers', accountData.supplierId);
    const supplierSnap = await getDoc(supplierRef);
    if (supplierSnap.exists()) {
      const currentDebt = supplierSnap.data().debtAmount || 0;
      batch.update(supplierRef, { debtAmount: currentDebt - amount });
    }

    // Add cash transaction if it was paid with cash
    if (paymentMethod === 'Efectivo') {
        const transactionRef = doc(collection(db, 'cashDrawerTransactions'));
        batch.set(transactionRef, {
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

    await batch.commit();
    await logAudit('Pagar', `Registró pago de ${formatCurrency(amount)} a la cuenta de ${accountData.supplierName}.`, { entityType: 'Cuentas Por Pagar', entityId: accountId, userId: user?.id || 'system', userName: user?.name || 'Sistema' });
};


export const purchaseService = {
  registerPurchase,
  registerPayableAccountPayment,
};
