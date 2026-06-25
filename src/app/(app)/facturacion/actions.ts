'use server';

import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireActionAuth } from '@/lib/server-auth';

/**
 * Estado de la config de facturación SIN exponer la sk_live_ al cliente.
 * Devuelve solo flags de "ya configurado" y el usuario (no secreto).
 */
export async function getBillingConfigAction(idToken: string): Promise<{ facturapiUser: string; hasLiveKey: boolean; hasPass: boolean }> {
  await requireActionAuth(idToken, { minRole: 'superadmin' });
  const db = getAdminDb();
  const snap = await db.collection('settings').doc('billing').get();
  const d = (snap.exists ? snap.data() : {}) as { facturapiUser?: string; liveSecretKey?: string; facturapiPass?: string };
  return { facturapiUser: d.facturapiUser || '', hasLiveKey: !!d.liveSecretKey, hasPass: !!d.facturapiPass };
}

/**
 * Guarda la config de facturación. La key/contraseña solo se sobrescriben si
 * el usuario ingresó un valor nuevo (campo vacío = conservar el actual).
 */
export async function saveBillingConfigAction(
  idToken: string,
  values: { liveSecretKey?: string; facturapiUser?: string; facturapiPass?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireActionAuth(idToken, { minRole: 'superadmin' });
    const db = getAdminDb();
    const update: Record<string, string> = {};
    if (typeof values.facturapiUser === 'string') update.facturapiUser = values.facturapiUser;
    if (values.liveSecretKey) update.liveSecretKey = values.liveSecretKey;
    if (values.facturapiPass) update.facturapiPass = values.facturapiPass;
    await db.collection('settings').doc('billing').set(update, { merge: true });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'No autorizado' };
  }
}

export async function getInvoicedTicketsAction(idToken: string) {
  try {
    await requireActionAuth(idToken, { minRole: 'staff' });
    const adminDb = getAdminDb();
    
    const invoiced: any[] = [];
    
    const salesSnap = await adminDb.collection('sales').where('invoiceId', '!=', null).get();
    salesSnap.forEach(doc => {
        const data = doc.data();
        if (data.invoiceId) {
            invoiced.push({
                type: 'sale',
                id: doc.id,
                folio: data.folio || doc.id,
                customer: data.customerName || 'Cliente General',
                total: data.totalAmount || data.totalCost || data.total || 0,
                invoiceId: data.invoiceId,
                invoiceUrl: data.invoiceUrl,
                status: data.invoiceStatus || 'Desconocido',
                date: data.invoicedAt || data.createdAt,
                billingData: data.billingData || null,
            });
        }
    });
    
    const servicesSnap = await adminDb.collection('serviceRecords').where('invoiceId', '!=', null).get();
    servicesSnap.forEach(doc => {
        const data = doc.data();
        if (data.invoiceId) {
            invoiced.push({
                type: 'service',
                id: doc.id,
                folio: data.folio || doc.id,
                customer: data.customerName || 'Cliente General',
                total: data.totalAmount || data.totalCost || data.total || 0,
                invoiceId: data.invoiceId,
                invoiceUrl: data.invoiceUrl,
                status: data.invoiceStatus || 'Desconocido',
                date: data.invoicedAt || data.createdAt,
                billingData: data.billingData || null,
            });
        }
    });
    
    invoiced.sort((a, b) => {
        const dA = new Date(a.date?._seconds ? a.date._seconds * 1000 : a.date).getTime();
        const dB = new Date(b.date?._seconds ? b.date._seconds * 1000 : b.date).getTime();
        return dB - dA;
    });
    
    return { success: true, data: invoiced };
  } catch (error) {
    console.error("Error fetching invoiced tickets:", error);
    return { success: false, error: 'Ocurrió un error al cargar el historial.' };
  }
}
