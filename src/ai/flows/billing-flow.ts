
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { billingFormSchema } from '@/app/(public)/facturar/components/billing-schema';
import type { SaleReceipt, ServiceRecord, WorkshopInfo } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebasePublic';
import axios from 'axios';
import { format } from 'date-fns';
import { regimesFisica, regimesMoral, detectarTipoPersona } from '@/lib/sat-catalogs';


const FDC_API_BASE_URL = 'https://www.facturapi.io/v2';

// --- Utility to get Factura.com API credentials ---
const getFacturaComInstance = async () => {
  if (!db) return null;
  const configSnap = await getDoc(doc(db, 'workshopConfig', 'main'));
  if (!configSnap.exists()) return null;
  
  const workshopInfo = configSnap.data() as WorkshopInfo;
  
  const apiKey = workshopInfo.facturaComApiKey;
  if (!apiKey) return null; // Explicitly return null if API key is not set.

  const isLiveMode = workshopInfo.facturaComBillingMode === 'live';
  
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
  return createInvoiceFlow(input);
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

      const ticketItems = ('items' in ticket && Array.isArray(ticket.items) 
        ? ticket.items 
        : ('serviceItems' in ticket && Array.isArray(ticket.serviceItems) 
            ? ticket.serviceItems 
            : [])
      ).map(item => {
          const quantity = 'quantity' in item ? item.quantity : 1;
          const name = 'itemName' in item ? item.itemName : 'name' in item ? item.name : 'Artículo';
          const price = ('totalPrice' in item && item.quantity > 0) 
              ? (item.totalPrice / quantity) 
              : ('price' in item ? item.price || 0 : 0);
              
          return {
            quantity: quantity,
            product: {
              description: name,
              price: price,
              tax_included: true,
              product_key: '81111500', // Servicios de Mantenimiento y Reparación de Vehículos
              unit_key: 'E48', // Unidad de servicio
            }
          };
      });

      const invoiceData = {
        use: customer.cfdiUse,
        payment_form: customer.paymentForm || '01',
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
        series: 'RAN',
      };

      const url = `${FDC_API_BASE_URL}/invoices`;
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axios.post(url, invoiceData, { headers });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.data.message || 'Error desconocido de Factura.com');
      }

      return {
        success: true,
        invoiceId: response.data.id,
        invoiceUrl: response.data.pdf_url,
        status: response.data.status,
      };

    } catch (e: any) {
      console.error('❌ Error general en createInvoiceFlow:', e.response?.data || e.message);
      const errorMessage = e.response?.data?.message || e.message || 'Error inesperado al crear la factura';
      return { success: false, error: errorMessage };
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

    await axios.delete(`${FDC_API_BASE_URL}/invoices/${invoiceId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return { success: true };
  } catch (e: any) {
    console.error('Cancelación de factura fallida:', e.response?.data || e.message);
    return { success: false, error: e.response?.data?.message || e.message };
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

    const response = await axios.get(`${FDC_API_BASE_URL}/invoices/${invoiceId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return { success: true, url: response.data.pdf_url };
  } catch (e: any) {
     console.error('Get PDF URL error:', e.response?.data || e.message);
     return { success: false, error: e.response?.data?.message || e.message };
  }
}

/* -------------------------------------
 * 🧾 Obtener historial de facturas
 * ------------------------------------- */

export async function getInvoices(): Promise<any> {
    const facturaCom = await getFacturaComInstance();
    if (facturaCom === null) {
      // Intentionally return null to indicate missing credentials, which the frontend will handle.
      return null;
    }
    const { apiKey } = facturaCom;

    try {
      const response = await axios.get(`${FDC_API_BASE_URL}/invoices`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        params: {
          limit: 100,
        }
      });

      return {
        data: response.data.data,
        page: response.data.page,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
      }
    } catch (e: any) {
      console.error('Factura.com list invoices error:', e.response?.data || e.message);
      throw new Error(`Error al obtener facturas: ${e.response?.data?.message || e.message}`);
    }
}