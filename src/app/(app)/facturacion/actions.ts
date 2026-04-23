'use server';

import { getAdminDb } from '@/lib/firebaseAdmin';

export async function getInvoicedTicketsAction() {
  try {
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
