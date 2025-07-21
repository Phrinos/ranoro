
'use server';
/**
 * @fileOverview Módulo completo para crear, cancelar y obtener PDF de facturas CFDI con FacturAPI v2.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { billingFormSchema } from '@/app/(public)/facturar/components/billing-schema';
import type { SaleReceipt, ServiceRecord, WorkshopInfo } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebasePublic';
import Facturapi from 'facturapi';

/* -------------------------------------
 * ✅ Crear factura CFDI
 * ------------------------------------- */

const CreateInvoiceInputSchema = z.object({
  customer: billingFormSchema.extend({
    paymentForm: z.string().optional(), // "01" = efectivo, etc.
  }),
  ticket: z.any(), // SaleReceipt o ServiceRecord
});

export async function createInvoice(
  input: z.infer<typeof CreateInvoiceInputSchema>
): Promise<{
  success: boolean;
  invoiceId?: string;
  invoiceUrl?: string;
  status?: string;
  error?: string;
}> {
  return createInvoiceFlow(input);
}

const createInvoiceFlow = ai.defineFlow(
  {
    name: 'createInvoiceFlow',
    inputSchema: CreateInvoiceInputSchema,
    outputSchema: z.any(),
  },
  async (input) => {
    if (!db) throw new Error('Database not initialized.');

    const configSnap = await getDoc(doc(db, 'workshopConfig', 'main'));
    if (!configSnap.exists()) {
      throw new Error('La configuración del taller no ha sido establecida.');
    }

    const workshopInfo = configSnap.data() as WorkshopInfo;

    const apiKey = workshopInfo.facturapiBillingMode === 'live'
      ? workshopInfo.facturapiLiveApiKey
      : workshopInfo.facturapiTestApiKey || 'sk_test_1Wz0BaKGxlLrMVxQ3d3kWpxtjZweYZvydp4ODEe23g';

    if (!apiKey) throw new Error('La API Key de FacturAPI no está configurada.');

    const facturapi = new Facturapi(apiKey);
    const ticket = input.ticket as SaleReceipt | ServiceRecord;

    let customer;
    try {
      const existing = await facturapi.customers.list({ q: input.customer.rfc });
      customer = existing.data.length ? existing.data[0] : await facturapi.customers.create({
        legal_name: input.customer.name,
        tax_id: input.customer.rfc,
        email: input.customer.email,
        address: {
          zip: input.customer.address.zip,
        },
        tax_system: input.customer.taxSystem,
      });
    } catch (e: any) {
      console.error('FacturAPI customer error:', e.data || e.message);
      throw new Error(`Error con cliente en FacturAPI: ${e.data?.message || e.message}`);
    }

    if (!('items' in ticket) && !('serviceItems' in ticket)) {
      throw new Error('El ticket no contiene artículos válidos para facturar.');
    }
    
    // Improved item extraction logic
    const items = ('items' in ticket && Array.isArray(ticket.items) ? ticket.items : ('serviceItems' in ticket && Array.isArray(ticket.serviceItems) ? ticket.serviceItems : [])).map(item => {
      // Determine price, description and quantity based on item type
      let unitPriceWithTax: number;
      let description: string;
      let quantity: number;

      if ('totalPrice' in item && 'quantity' in item && item.quantity > 0) { // Likely a SaleItem from SaleReceipt
        unitPriceWithTax = item.totalPrice / item.quantity;
        description = item.itemName;
        quantity = item.quantity;
      } else if ('price' in item) { // Likely a ServiceItem from ServiceRecord
        unitPriceWithTax = item.price || 0;
        description = item.name;
        quantity = 1; // Service items are treated as a single unit
      } else {
        // Fallback for unexpected item structures
        unitPriceWithTax = 0;
        description = 'Artículo sin descripción';
        quantity = 1;
      }
      
      const unitPriceBeforeTax = Number((unitPriceWithTax / 1.16).toFixed(2));

      return {
        quantity: quantity,
        product: {
          description,
          product_key: '81111500', // Servicios de reparación y mantenimiento automotriz
          unit_price: unitPriceBeforeTax,
          taxes: [{
            type: 'IVA',
            rate: 0.16,
            withholding: false
          }]
        }
      };
    }).filter(item => item.product.unit_price > 0); // Ensure we don't bill for items with no cost

    if (items.length === 0) {
        throw new Error("No se encontraron artículos con costo para facturar en este ticket.");
    }

    try {
      const invoice = await facturapi.invoices.create({
        customer: customer.id,
        cfdi_use: input.customer.cfdiUse, // Correct for v2.0
        payment_form: input.customer.paymentForm ?? '01',
        items,
        folio_number: `RAN-${ticket.id?.slice(-6) || Date.now()}`
      });

      await facturapi.invoices.sendByEmail(invoice.id);

      return {
        success: true,
        invoiceId: invoice.id,
        invoiceUrl: invoice.pdf_url,
        status: invoice.status
      };
    } catch (e: any) {
      console.error('FacturAPI invoice error:', e.data || e.message);
      return {
        success: false,
        error: `Error al crear factura: ${e.data?.message || e.message}`
      };
    }
  }
);

/* -------------------------------------
 * ❌ Cancelar factura CFDI
 * ------------------------------------- */

export async function cancelInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const configSnap = await getDoc(doc(db, 'workshopConfig', 'main'));
    if (!configSnap.exists()) {
      throw new Error('La configuración del taller no ha sido encontrada.');
    }

    const workshopInfo = configSnap.data() as WorkshopInfo;

    const apiKey = workshopInfo.facturapiBillingMode === 'live'
      ? workshopInfo.facturapiLiveApiKey
      : workshopInfo.facturapiTestApiKey || 'sk_test_1Wz0BaKGxlLrMVxQ3d3kWpxtjZweYZvydp4ODEe23g';

    const facturapi = new Facturapi(apiKey);

    await facturapi.invoices.cancel(invoiceId, {
      motive: '02', // 01: Error en la factura, 02: Operación no realizada
    });

    return { success: true };
  } catch (e: any) {
    console.error('Cancelación de factura fallida:', e);
    return { success: false, error: e?.data?.message || e.message };
  }
}

/* -------------------------------------
 * 📥 Obtener PDF de factura CFDI
 * ------------------------------------- */

export async function getInvoicePdfUrl(invoiceId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const configSnap = await getDoc(doc(db, 'workshopConfig', 'main'));
    if (!configSnap.exists()) {
      throw new Error('No se encontró configuración del taller.');
    }

    const workshopInfo = configSnap.data() as WorkshopInfo;

    const apiKey = workshopInfo.facturapiBillingMode === 'live'
      ? workshopInfo.facturapiLiveApiKey
      : workshopInfo.facturapiTestApiKey || 'sk_test_1Wz0BaKGxlLrMVxQ3d3kWpxtjZweYZvydp4ODEe23g';

    const facturapi = new Facturapi(apiKey);
    const invoice = await facturapi.invoices.retrieve(invoiceId);

    return {
      success: true,
      url: invoice.pdf_url
    };
  } catch (e: any) {
    console.error('Error al obtener PDF de factura:', e);
    return {
      success: false,
      error: e?.data?.message || e.message
    };
  }
}
