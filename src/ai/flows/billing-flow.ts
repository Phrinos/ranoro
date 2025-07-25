
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { billingFormSchema } from '@/app/(public)/facturar/components/billing-schema';
import type { SaleReceipt, ServiceRecord, WorkshopInfo } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient.js';
import { format } from 'date-fns';
import { regimesFisica, regimesMoral, detectarTipoPersona } from '@/lib/sat-catalogs';


const FDC_API_BASE_URL = 'https://api.factura.com/v1';

// --- Utility to get Factura.com API credentials ---
const getFacturaComInstance = async () => {
  if (!db) return null;
  const configSnap = await getDoc(doc(db, 'workshopConfig', 'main'));
  if (!configSnap.exists()) return null;
  
  const workshopInfo = configSnap.data() as WorkshopInfo;
  
  const apiKey = (workshopInfo.facturaComApiKey || '').trim();
  if (!apiKey) return null; // Explicitly return null if API key is not set.

  const isLiveMode = workshopInfo.facturaComBillingMode === 'live';
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔑 Factura.com credentials in use. Mode:', isLiveMode ? 'Live' : 'Test');
    console.log('🔑 Token (cortado):', apiKey.slice(0, 8) + '…');
  }
  
  return { apiKey, isLiveMode };
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
 * Main function to create a CFDI invoice with Factura.com
 */
export async function createInvoice(
  input: z.infer<typeof CreateInvoiceInputSchema>
): Promise<z.infer<typeof CreateInvoiceOutputSchema>> {
  try {
    return await createInvoiceFlow(input);
  } catch (e: any) {
    console.error('❌ Error en createInvoice wrapper:', e);
    return {
      success: false,
      error: e.message || 'Error inesperado en el wrapper de facturación',
    };
  }
}

const createInvoiceFlow = ai.defineFlow(
  {
    name: 'createInvoiceFlow',
    inputSchema: CreateInvoiceInputSchema,
    outputSchema: CreateInvoiceOutputSchema,
  },
  async (input) => {
    try {
      const facturaCom = await getFacturaComInstance();
      if (!facturaCom) {
        throw new Error('La configuración de facturación no ha sido establecida. Contacte al administrador del taller.');
      }
      const { apiKey, isLiveMode } = facturaCom;
      
      const { customer, ticket } = input;
      const rfc = (customer.rfc || '').trim();
      const taxSystem = (customer.taxSystem || '').trim();
      
      const rfcType = detectarTipoPersona(rfc);
      if (rfcType === 'invalido') throw new Error('El RFC proporcionado no tiene un formato válido.');

      if (rfcType === 'fisica' && !regimesFisica.includes(taxSystem)) {
        throw new Error(`El régimen fiscal (${taxSystem}) no es válido para persona física.`);
      }
      if (rfcType === 'moral' && !regimesMoral.includes(taxSystem)) {
          throw new Error(`El régimen fiscal (${taxSystem}) no es válido para persona moral.`);
      }

      const IVA_RATE = 0.16;
      let ticketItems;

      // Determine ticket type and process items accordingly
      if ('items' in ticket && Array.isArray(ticket.items)) { // This is a SaleReceipt
          ticketItems = ticket.items.map((item: any) => ({
              quantity: item.quantity,
              product: {
                  description: item.itemName,
                  price: item.totalPrice / item.quantity / (1 + IVA_RATE), // Correctly calculate pre-tax unit price
                  tax_included: false,
                  product_key: '01010101', 
                  unit_key: 'H87', 
              }
          }));
      } else { // This is a ServiceRecord
          ticketItems = (ticket.serviceItems || []).map((item: any) => ({
              quantity: 1, 
              product: {
                  description: item.name,
                  price: item.price / (1 + IVA_RATE),
                  tax_included: false,
                  product_key: '81111500', 
                  unit_key: 'E48', 
              }
          }));
      }


      const invoiceData = {
        use: customer.cfdiUse,
        customer: {
          legal_name: customer.name,
          tax_id: customer.rfc,
          email: customer.email,
          tax_system: customer.taxSystem,
          address: {
            zip: customer.address.zip
          }
        },
        items: ticketItems,
        payment_form: customer.paymentForm || '01',
      };

      const url = `${FDC_API_BASE_URL}/invoices`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...invoiceData, mode: isLiveMode ? 'live' : 'test' })
      });
      
      if (!response.ok) {
        // Read the response text to avoid JSON parsing errors on HTML error pages
        const errorText = await response.text();
        console.error(`❌ Factura.com API Error (${response.status}):`, errorText);
        try {
          // Attempt to parse as JSON, but handle failure gracefully
          const errorJson = JSON.parse(errorText);
          const errorMessage = errorJson.message || (Array.isArray(errorJson.errors) ? errorJson.errors.map((e: any) => e.message).join(', ') : 'Error desconocido de Factura.com');
          throw new Error(errorMessage);
        } catch (jsonError) {
          // If parsing fails, it means the response was not JSON (e.g., HTML error page)
          throw new Error(`Error de comunicación con el servicio de facturación (código: ${response.status}). Intente de nuevo más tarde.`);
        }
      }
      
      const responseData = await response.json();

      return {
        success: true,
        invoiceId: responseData.id,
        invoiceUrl: responseData.pdf_url,
        status: responseData.status,
      };

    } catch (e: any) {
      console.error('❌ Error general en createInvoiceFlow:', e.message);
      // Ensure the error is re-thrown so the wrapper can catch it.
      throw e;
    }
  }
);


/* -------------------------------------
 * ❌ Cancelar factura CFDI con Factura.com
 * ------------------------------------- */

export async function cancelInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const facturaCom = await getFacturaComInstance();
    if (!facturaCom) throw new Error('Credenciales de facturación no configuradas.');
    const { apiKey } = facturaCom;

    const response = await fetch(`${FDC_API_BASE_URL}/invoices/${invoiceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cancelar la factura.');
    }

    return { success: true };
  } catch (e: any) {
    console.error('Cancelación de factura fallida:', e.message);
    return { success: false, error: e.message };
  }
}

/* -------------------------------------
 * 📥 Obtener PDF de factura CFDI
 * ------------------------------------- */

export async function getInvoicePdfUrl(invoiceId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const facturaCom = await getFacturaComInstance();
    if (!facturaCom) throw new Error('Credenciales de facturación no configuradas.');
    const { apiKey } = facturaCom;

    const response = await fetch(`${FDC_API_BASE_URL}/invoices/${invoiceId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al obtener la factura.');
    }
    return { success: true, url: responseData.pdf_url };
  } catch (e: any) {
     console.error('Get PDF URL error:', e.message);
     return { success: false, error: e.message };
  }
}

/* -------------------------------------
 * 🧾 Obtener historial de facturas
 * ------------------------------------- */

export async function getInvoices(): Promise<any> {
  const facturaCom = await getFacturaComInstance();
  if (facturaCom === null) {
    return { data: [], error: "No se han configurado las credenciales de Factura.com." };
  }
  const { apiKey } = facturaCom;

  try {
    const response = await fetch(`${FDC_API_BASE_URL}/invoices?limit=100`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error del servidor: ${response.status}`);
    }

    const responseData = await response.json();

    return {
      data: responseData.data || [], // Ensure data is always an array
      page: responseData.page,
      total_pages: responseData.total_pages,
      total_results: responseData.total_results,
    };
  } catch (e: any) {
    console.error('Factura.com list invoices error:', e.message);
    return { data: [], error: `Error al obtener facturas: ${e.message}` };
  }
}
