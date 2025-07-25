
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
import { 
  detectarTipoPersona, 
  regimesFisica, 
  regimesMoral 
} from '@/lib/sat-catalogs';

// --- Utility to get FacturAPI instance ---
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

// --- Zod Schemas ---
const CreateInvoiceInputSchema = z.object({
  customer: billingFormSchema,
  ticket: z.any(),
});

const CreateInvoiceOutputSchema = z.object({
  success: z.boolean(),
  invoiceId: z.string().optional(),
  invoiceUrl: z.string().optional(),
  status: z.string().optional(),
  error: z.string().optional(),
});

/**
 * Main function to create a CFDI invoice.
 */
export async function createInvoice(
  input: z.infer<typeof CreateInvoiceInputSchema>
): Promise<z.infer<typeof CreateInvoiceOutputSchema>> {
  return createInvoiceFlow(input);
}

/**
 * Genkit flow to create an invoice.
 */
const createInvoiceFlow = ai.defineFlow(
  {
    name: 'createInvoiceFlow',
    inputSchema: CreateInvoiceInputSchema,
    outputSchema: z.any(), // Step 1: Relax output schema for debugging
  },
  async (input) => {
    try {
      // 1. Get FacturAPI instance
      const facturapi = await getFacturapiInstance();

      // 2. Validate RFC and Tax Regime from input
      const { rfc: rawRfc, taxSystem: rawTaxSystem, name, email, address, cfdiUse, paymentForm } = input.customer;
      const rfc = rawRfc.trim().toUpperCase();
      const taxSystem = rawTaxSystem.trim();
      
      const tipoPersona = detectarTipoPersona(rfc);
      if (tipoPersona === 'invalido') {
        return { success: false, error: 'El RFC proporcionado no tiene un formato válido según el SAT.' };
      }
      
      const isFisica = tipoPersona === 'fisica';
      const isMoral = tipoPersona === 'moral';

      if (isFisica && !regimesFisica.includes(taxSystem)) {
        return { success: false, error: `El régimen fiscal seleccionado (${taxSystem}) no es válido para una persona física.` };
      }
      if (isMoral && !regimesMoral.includes(taxSystem)) {
        return { success: false, error: `El régimen fiscal seleccionado (${taxSystem}) no es válido para una persona moral.` };
      }

      // 3. Construct customer object
      const customerData = {
        legal_name: name,
        tax_id: rfc,
        email: email,
        address: { zip: address.zip },
        tax_system: taxSystem,
      };

      // 4. Process ticket items
      const ticket = input.ticket as SaleReceipt | ServiceRecord;
      if (!('items' in ticket || 'serviceItems' in ticket)) {
        return { success: false, error: 'El ticket no contiene artículos válidos para facturar.' };
      }
      
      const items = ('items' in ticket && Array.isArray(ticket.items) ? ticket.items : ('serviceItems' in ticket && Array.isArray(ticket.serviceItems) ? ticket.serviceItems : []))
        .map(item => {
          const unitPriceWithTax = ('totalPrice' in item && item.quantity > 0) ? (item.totalPrice / item.quantity) : ('price' in item ? item.price || 0 : 0);
          const description = 'itemName' in item ? item.itemName : 'name' in item ? item.name : 'Artículo sin descripción';
          const quantity = 'quantity' in item ? item.quantity : 1;
          
          if (unitPriceWithTax <= 0 || quantity <= 0) return null;

          return {
            quantity,
            product: {
              description,
              product_key: '81111500', 
              price: unitPriceWithTax / 1.16,
              taxes: [{ type: 'IVA', rate: 0.16, withholding: false }],
            }
          };
        })
        .filter(Boolean);

      if (items.length === 0) {
        return { success: false, error: "No se encontraron artículos con costo para facturar en este ticket." };
      }

      // 5. DEBUG LOGGING
      console.log('🚨 Sending data to FacturAPI:');
      console.log('  - RFC:', `"${rfc}"`);
      console.log('✔ Tipo detectado por regex:', tipoPersona);
      console.log('  - Régimen fiscal:', `"${taxSystem}"`);

      // 6. Create Invoice
      const invoice = await facturapi.invoices.create({
        customer: customerData,
        use: cfdiUse,
        payment_form: paymentForm ?? '01',
        items: items as any, 
        folio_number: `RAN-${ticket.id?.slice(-6) || Date.now()}`
      });
      
      // 7. Send by email
      await facturapi.invoices.sendByEmail(invoice.id);
      return {
        success: true,
        invoiceId: invoice.id,
        invoiceUrl: invoice.pdf_url,
        status: invoice.status
      };

    } catch (e: any) {
        // Step 1 (cont.): Ensure catch block returns a simple, serializable object.
        console.error('❌ Error general en createInvoiceFlow:', e);
        return {
            success: false,
            error: e?.data?.message || e?.message || 'Error inesperado al crear la factura'
        };
    }
  }
);

// ... (resto del archivo sin cambios)
/* -------------------------------------
 * ❌ Cancelar factura CFDI
 * ------------------------------------- */

export async function cancelInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const facturapi = await getFacturapiInstance();
    await facturapi.invoices.cancel(invoiceId, {
      motive: '02',
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
      const response = await facturapi.invoices.list({ limit: 100, page: 1, 'date[gte]': '2023-01-01' });
      return response;
    } catch (e: any) {
      console.error('FacturAPI list invoices error:', e.data || e.message);
      throw new Error(`Error al obtener facturas: ${e.data?.message || e.message}`);
    }
  }
);
