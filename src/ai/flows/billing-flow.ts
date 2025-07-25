
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
import Facturapi, { type Invoice } from 'facturapi';

/* -------------------------------------
 * Utility to get FacturAPI instance
 * ------------------------------------- */
const getFacturapiInstance = async (): Promise<Facturapi> => {
    if (!db) throw new Error('Database not initialized.');

    const configSnap = await getDoc(doc(db, 'workshopConfig', 'main'));
    if (!configSnap.exists()) {
      throw new Error('La configuración del taller no ha sido establecida.');
    }

    const workshopInfo = configSnap.data() as WorkshopInfo;

    const apiKey = workshopInfo.facturapiBillingMode === 'live'
      ? workshopInfo.facturapiLiveApiKey
      : workshopInfo.facturapiTestApiKey || process.env.FACTURAPI_TEST_API_KEY;

    if (!apiKey) throw new Error('La API Key de FacturAPI no está configurada.');

    return new Facturapi(apiKey);
};


/* -------------------------------------
 * ✅ Crear factura CFDI
 * ------------------------------------- */

const CreateInvoiceInputSchema = z.object({
  customer: billingFormSchema.extend({
    paymentForm: z.string().optional(), // "01" = efectivo, etc.
  }),
  ticket: z.any(), // SaleReceipt o ServiceRecord
});

// --- Catálogos para validación en backend ---
const regimesFisica = ["605", "606", "607", "608", "611", "612", "614", "615", "621", "625", "626", "616"];
const regimesMoral = ["601", "603", "620", "622", "623", "624", "628", "610", "616"];


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
    const facturapi = await getFacturapiInstance();
    const ticket = input.ticket as SaleReceipt | ServiceRecord;

    // --- RFC & Tax Regime Validation ---
    const rfc = input.customer.rfc.toUpperCase();
    const taxSystem = input.customer.taxSystem;
    const isMoral = rfc.length === 12;
    const isFisica = rfc.length === 13;

    if (!isFisica && !isMoral) {
      throw new Error('El RFC proporcionado no parece ser válido (debe tener 12 o 13 caracteres).');
    }
    
    if (isFisica && !regimesFisica.includes(taxSystem)) {
      throw new Error(`El régimen fiscal seleccionado (${taxSystem}) no es válido para una persona física.`);
    }

    if (isMoral && !regimesMoral.includes(taxSystem)) {
      throw new Error(`El régimen fiscal seleccionado (${taxSystem}) no es válido para una persona moral.`);
    }

    let customer;
    try {
      const existing = await facturapi.customers.list({ q: rfc });
      customer = existing.data.length > 0 ? existing.data[0] : await facturapi.customers.create({
        legal_name: input.customer.name,
        tax_id: rfc,
        email: input.customer.email,
        address: {
          zip: input.customer.address.zip,
        },
        tax_system: taxSystem,
      });
    } catch (e: any) {
      console.error('FacturAPI customer error:', e.data || e.message);
      throw new Error(`Error con cliente en FacturAPI: ${e.data?.message || e.message}`);
    }

    if (!('items' in ticket) && !('serviceItems' in ticket)) {
      throw new Error('El ticket no contiene artículos válidos para facturar.');
    }
    
    const items = ('items' in ticket && Array.isArray(ticket.items) ? ticket.items : ('serviceItems' in ticket && Array.isArray(ticket.serviceItems) ? ticket.serviceItems : [])).map(item => {
      let unitPriceWithTax: number;
      let description: string;
      let quantity: number;
    
      if ('totalPrice' in item && 'quantity' in item && item.quantity > 0) {
        unitPriceWithTax = item.totalPrice / item.quantity;
        description = item.itemName;
        quantity = item.quantity;
      } else if ('price' in item) {
        unitPriceWithTax = item.price || 0;
        description = item.name;
        quantity = 1; 
      } else {
        unitPriceWithTax = 0;
        description = 'Artículo sin descripción';
        quantity = 1;
      }
      
      const unitPriceBeforeTax = unitPriceWithTax / 1.16;
    
      return {
        quantity: quantity,
        product: {
          description,
          product_key: '81111500', 
          price: unitPriceBeforeTax,
          taxes: [{
            type: 'IVA',
            rate: 0.16,
            withholding: false
          }]
        }
      };
    }).filter(item => item.product.price > 0 && item.quantity > 0); 

    if (items.length === 0) {
        throw new Error("No se encontraron artículos con costo para facturar en este ticket.");
    }

    try {
      const invoice = await facturapi.invoices.create({
        customer: customer.id,
        use: input.customer.cfdiUse,
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
    const facturapi = await getFacturapiInstance();
    await facturapi.invoices.cancel(invoiceId, {
      motive: '02', // 01: Comprobante emitido con errores con relación. 02: Comprobante emitido con errores sin relación. 
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
    const facturapi = await getFacturapiInstance();
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


/* -------------------------------------
 * 🧾 Obtener historial de facturas
 * ------------------------------------- */
const InvoiceSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  total: z.number(),
  status: z.string(),
  folio_number: z.string().nullable(),
  customer: z.object({
    legal_name: z.string(),
    tax_id: z.string(),
  }),
  pdf_url: z.string().url().nullable(),
  xml_url: z.string().url().nullable(),
});

const GetInvoicesOutputSchema = z.object({
  data: z.array(z.any()),
  page: z.number(),
  total_pages: z.number(),
  total_results: z.number(),
});

export async function getInvoices(): Promise<z.infer<typeof GetInvoicesOutputSchema>> {
  return getInvoicesFlow();
}

const getInvoicesFlow = ai.defineFlow(
  {
    name: 'getInvoicesFlow',
    inputSchema: z.void(),
    outputSchema: GetInvoicesOutputSchema,
  },
  async () => {
    try {
      const facturapi = await getFacturapiInstance();
      // Fetch all invoices, sorted by date descending.
      const response = await facturapi.invoices.list({ limit: 100, page: 1, 'date[gte]': '2023-01-01' });
      return response;
    } catch (e: any) {
      console.error('FacturAPI list invoices error:', e.data || e.message);
      throw new Error(`Error al obtener facturas: ${e.data?.message || e.message}`);
    }
  }
);
