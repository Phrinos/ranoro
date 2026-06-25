

'use server';

import { createInvoice } from '@/ai/flows/billing-flow';
import { type BillingFormValues } from './components/billing-schema';
import type { SaleReceipt, ServiceRecord } from '@/types';
import { revalidatePath } from 'next/cache';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';

const LOCK_TTL_MS = 60_000;

/**
 * Server Action para timbrar una factura. Es IDEMPOTENTE: si el ticket ya tiene
 * invoiceId no re-timbra (evita CFDI duplicados por doble-click, reintento de red,
 * o invocación directa del endpoint público). Un lock transaccional cierra además
 * la ventana de carrera entre dos timbrados concurrentes del mismo ticket.
 */
export async function createInvoiceAction(
  customerData: BillingFormValues,
  ticketData: SaleReceipt | ServiceRecord
) {
  const adminDb = getAdminDb();
  const docId = ticketData.id;

  if (!docId) {
    return { success: false, error: 'Ticket inválido (sin identificador).' };
  }

  // Doc principal del ticket (sales o serviceRecords) para el lock idempotente.
  let primaryRef: DocumentReference | null = null;
  for (const coll of ['serviceRecords', 'sales']) {
    const ref = adminDb.collection(coll).doc(docId);
    if ((await ref.get()).exists) { primaryRef = ref; break; }
  }

  try {
    // 1. Idempotencia + lock atómico.
    if (primaryRef) {
      const guard = await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(primaryRef!);
        const data = snap.data() || {};
        if (data.invoiceId) {
          return { alreadyInvoiced: true, invoiceId: data.invoiceId, invoiceUrl: data.invoiceUrl, status: data.invoiceStatus };
        }
        const lockMs = data.invoicingLockAt?.toMillis ? data.invoicingLockAt.toMillis() : 0;
        if (lockMs && Date.now() - lockMs < LOCK_TTL_MS) {
          throw new Error('Ya hay un timbrado en curso para este ticket. Espera unos segundos.');
        }
        tx.update(primaryRef!, { invoicingLockAt: FieldValue.serverTimestamp() });
        return null;
      });
      if (guard?.alreadyInvoiced) {
        return { success: true, invoiceId: guard.invoiceId, invoiceUrl: guard.invoiceUrl, status: guard.status, error: undefined, alreadyInvoiced: true };
      }
    }

    // 2. Timbrar en el SAT (fuera de la transacción — llamada externa).
    const response = await createInvoice({
      customer: {
        address: { zip: customerData.address.zip },
        name: customerData.name,
        email: customerData.email,
        rfc: customerData.rfc,
        taxSystem: customerData.taxSystem,
        cfdiUse: customerData.cfdiUse,
      },
      ticket: ticketData,
    });

    if (!response?.success) {
      if (primaryRef) await primaryRef.update({ invoicingLockAt: FieldValue.delete() }).catch(() => {});
      throw new Error(response?.error || 'Error inesperado desde el flujo de creación.');
    }

    // 3. Persistir el invoiceId en todas las colecciones y liberar el lock.
    const collections = ['sales', 'serviceRecords', 'publicServices'];
    for (const coll of collections) {
      const ref = adminDb.collection(coll).doc(docId);
      if ((await ref.get()).exists) {
        await ref.update({
          invoiceId: response.invoiceId,
          invoiceUrl: response.invoiceUrl,
          invoiceStatus: response.status,
          invoicedAt: new Date().toISOString(),
          billingData: customerData,
          invoicingLockAt: FieldValue.delete(),
        });
      }
    }

    revalidatePath('/facturacion-admin');

    return response;
  } catch (error) {
    console.error("Error in createInvoiceAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}

export async function findTicketAction(folio: string, total: number) {
  try {
    const adminDb = getAdminDb();

    console.log(`[findTicketAction] Searching for ticket: "${folio}", total: ${total}`);
    
    const collections = ['sales', 'serviceRecords', 'publicServices'];
    let foundDoc: any = null;
    let foundDocId: string = "";
    
    // Helper to verify total
    const checkTotal = (data: any) => {
      const recordTotal = Number(data.totalAmount ?? data.totalCost ?? data.total ?? 0);
      return Math.abs(recordTotal - total) < 0.01;
    };

    // 1. Try by exact document ID
    for (const collectionName of collections) {
      const docSnap = await adminDb.collection(collectionName).doc(folio).get();
      if (docSnap.exists && checkTotal(docSnap.data())) {
        foundDoc = docSnap.data();
        foundDocId = docSnap.id;
        
        // If we found it in publicServices, try to get the real serviceRecord for completeness
        if (collectionName === 'publicServices' && foundDoc.serviceId) {
          const realDoc = await adminDb.collection('serviceRecords').doc(foundDoc.serviceId).get();
          if (realDoc.exists) {
            foundDoc = realDoc.data();
            foundDocId = realDoc.id;
          }
        }
        break;
      }
    }
    
    // 2. Try by publicId field
    if (!foundDoc) {
      const publicSnap = await adminDb.collection('serviceRecords').where('publicId', '==', folio).get();
      for (const docSnap of publicSnap.docs) {
        if (checkTotal(docSnap.data())) {
          foundDoc = docSnap.data();
          foundDocId = docSnap.id;
          break;
        }
      }
    }
    
    // 3. Try by folio field (case insensitive fallback)
    if (!foundDoc) {
      const upperFolio = folio.toUpperCase();
      for (const collectionName of collections) {
        let qSnap = await adminDb.collection(collectionName).where('folio', '==', folio).get();
        if (qSnap.empty && folio !== upperFolio) {
          qSnap = await adminDb.collection(collectionName).where('folio', '==', upperFolio).get();
        }
        
        for (const docSnap of qSnap.docs) {
          if (checkTotal(docSnap.data())) {
            foundDoc = docSnap.data();
            foundDocId = docSnap.id;
            
            if (collectionName === 'publicServices' && foundDoc.serviceId) {
              const realDoc = await adminDb.collection('serviceRecords').doc(foundDoc.serviceId).get();
              if (realDoc.exists) {
                foundDoc = realDoc.data();
                foundDocId = realDoc.id;
              }
            }
            break;
          }
        }
        if (foundDoc) break;
      }
    }
    
    if (foundDoc) {
      console.log(`[findTicketAction] Match found! docId: ${foundDocId}`);
      // Convert Timestamp to ISO strings for serialization
      const serializeDate = (val: any) => {
        if (!val) return val;
        if (val.toDate) return val.toDate().toISOString();
        if (val._seconds) return new Date(val._seconds * 1000).toISOString();
        return val;
      };
      
      foundDoc.serviceDate = serializeDate(foundDoc.serviceDate);
      foundDoc.receptionDateTime = serializeDate(foundDoc.receptionDateTime);
      foundDoc.deliveryDateTime = serializeDate(foundDoc.deliveryDateTime);
      foundDoc.createdAt = serializeDate(foundDoc.createdAt);
      foundDoc.updatedAt = serializeDate(foundDoc.updatedAt);
      
      return { success: true, ticket: { id: foundDocId, ...foundDoc } };
    }
    
    console.log(`[findTicketAction] No matches found.`);
    return { success: false, error: "No se encontró ningún ticket con la información proporcionada. Por favor, verifique el folio y el monto exacto." };
  } catch (error) {
    console.error("Error in findTicketAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ocurrió un error al buscar el ticket.",
    };
  }
}
