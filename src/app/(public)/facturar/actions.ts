

'use server';

import { createInvoice } from '@/ai/flows/billing-flow';
import { type BillingFormValues } from './components/billing-schema';
import type { SaleReceipt, ServiceRecord } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Server Action to create an invoice.
 * This function is designed to be called from a client component.
 */
export async function createInvoiceAction(
  customerData: BillingFormValues,
  ticketData: SaleReceipt | ServiceRecord
) {
  try {
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
        throw new Error(response?.error || 'Error inesperado desde el flujo de creación.');
    }

    const { getAdminDb } = await import('@/lib/firebaseAdmin');
    const adminDb = getAdminDb();
    
    const docId = ticketData.id;
    if (docId) {
      const collections = ['sales', 'serviceRecords', 'publicServices'];
      for (const coll of collections) {
        const snap = await adminDb.collection(coll).doc(docId).get();
        if (snap.exists) {
          await adminDb.collection(coll).doc(docId).update({
             invoiceId: response.invoiceId,
             invoiceUrl: response.invoiceUrl,
             invoiceStatus: response.status,
             invoicedAt: new Date().toISOString(),
             billingData: customerData
          });
        }
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
    const { getAdminDb } = await import('@/lib/firebaseAdmin');
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
