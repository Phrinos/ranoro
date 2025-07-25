
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { billingFormSchema } from '@/app/(public)/facturar/components/billing-schema';
import type { SaleReceipt, ServiceRecord, WorkshopInfo } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient.js';
import { format } from 'date-fns';
import { regimesFisica, regimesMoral, detectarTipoPersona } from '@/lib/sat-catalogs';

// --- Utility to get Factura.com API credentials ---
const getFacturaComInstance = async () => {
  if (!db) return null;
  const configSnap = await getDoc(doc(db, 'workshopConfig', 'main'));
  if (!configSnap.exists()) return null;
  
  const workshopInfo = configSnap.data() as WorkshopInfo;
  
  const apiKey = (workshopInfo.facturaComApiKey || '').trim();
  const apiSecret = (workshopInfo.facturaComApiSecret || '').trim();
  if (!apiKey) return null;

  const isLiveMode = workshopInfo.facturaComBillingMode === 'live';
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔑 Factura.com credentials in use. Mode:', isLiveMode ? 'Live' : 'Test');
    console.log('🔑 Token (cortado):', apiKey.slice(0, 8) + '…');
  }
  
  return { apiKey, apiSecret, isLiveMode };
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
    const facturaCom = await getFacturaComInstance();
    if (!facturaCom) {
      throw new Error('La configuración de facturación no ha sido establecida. Contacte al administrador del taller.');
    }
    const { apiKey, apiSecret, isLiveMode } = facturaCom;
    
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

    if ('items' in ticket && Array.isArray(ticket.items)) { // This is a SaleReceipt
        ticketItems = ticket.items.map((item: any) => ({
            Producto: item.itemName,
            ClaveProducto: '01010101', 
            ClaveUnidad: 'H87', 
            Cantidad: item.quantity,
            Precio: item.totalPrice / item.quantity / (1 + IVA_RATE),
        }));
    } else { // This is a ServiceRecord
        ticketItems = (ticket.serviceItems || []).map((item: any) => ({
            Producto: item.name,
            ClaveProducto: '81111500', 
            ClaveUnidad: 'E48', 
            Cantidad: 1, 
            Precio: (item.price || 0) / (1 + IVA_RATE),
        }));
    }

    const invoiceData = {
        Receptor: {
            Rfc: customer.rfc,
            Nombre: customer.name,
            UsoCFDI: customer.cfdiUse,
            RegimenFiscalReceptor: customer.taxSystem, // Campo correcto para v4
            DomicilioFiscalReceptor: {
                CodigoPostal: customer.address.zip
            },
            Email: customer.email,
        },
        Conceptos: ticketItems,
        TipoDocumento: 'factura',
        FormaPago: customer.paymentForm || '01',
        MetodoPago: 'PUE',
    };
    
    const host = isLiveMode ? 'https://api.factura.com' : 'https://sandbox.factura.com/api';
    const url = `${host}/v4/cfdi40/create`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'F-Api-Key': apiKey,
    };
    if (apiSecret) {
      headers['F-Secret-Key'] = apiSecret;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(invoiceData)
    });
    
    const responseData = await response.json();

    if (!response.ok) {
        console.error(`❌ Factura.com API Error (${response.status}):`, responseData);
        const errorMessage = responseData.message || (Array.isArray(responseData.errors) ? responseData.errors.map((e: any) => e.message).join(', ') : 'Error desconocido de Factura.com');
        throw new Error(`Error de comunicación con el servicio de facturación (código: ${response.status}). Detalles: ${errorMessage}`);
    }
    
    if (responseData.Status !== 'valid') {
        const errorDetail = responseData.message || (Array.isArray(responseData.errors) ? responseData.errors.map((e: any) => e.message).join(', ') : 'Sin detalles del proveedor.');
        throw new Error(`La factura fue recibida pero no pudo ser validada (Estado: ${responseData.Status || 'inválido'}). Revise los datos e intente de nuevo. Detalles: ${errorDetail}`);
    }

    return {
      success: true,
      invoiceId: responseData.UID,
      invoiceUrl: responseData.PDF,
      status: responseData.Status,
    };
  }
);


/* -------------------------------------
 * ❌ Cancelar factura CFDI con Factura.com
 * ------------------------------------- */

export async function cancelInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const facturaCom = await getFacturaComInstance();
    if (!facturaCom) throw new Error('Credenciales de facturación no configuradas.');
    const { apiKey, apiSecret, isLiveMode } = facturaCom;
    
    const host = isLiveMode ? 'https://api.factura.com' : 'https://sandbox.factura.com/api';
    const url = `${host}/v4/cfdi40/${invoiceId}/cancel`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'F-Api-Key': apiKey,
    };
    if (apiSecret) {
      headers['F-Secret-Key'] = apiSecret;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ Motivo: '02' }) // 02 = Comprobante emitido con errores sin relación.
    });

    if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || (Array.isArray(errorData.errors) ? errorData.errors.map((e: any) => e.message).join(', ') : 'Error al cancelar la factura.');
        throw new Error(errorMessage);
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
    const { apiKey, apiSecret } = facturaCom;

    const host = facturaCom.isLiveMode ? 'https://api.factura.com' : 'https://sandbox.factura.com/api';
    const url = `${host}/v4/cfdi40/${invoiceId}/pdf`;
    
    const headers: HeadersInit = { 'F-Api-Key': apiKey };
    if (apiSecret) {
      headers['F-Secret-Key'] = apiSecret;
    }

    const response = await fetch(url, { headers });
    
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al obtener la factura.');
    }
    return { success: true, url: responseData.PDF };
  } catch (e: any) {
     console.error('Get PDF URL error:', e.message);
     return { success: false, error: e.message };
  }
}

/* -------------------------------------
 * 🧾 Obtener historial de facturas
 * ------------------------------------- */

export async function getInvoices(): Promise<{ data: any[], error?: string, page?: number, total_pages?: number, total_results?: number }> {
  const facturaCom = await getFacturaComInstance();
  if (facturaCom === null) {
    return { data: [], error: "No se han configurado las credenciales de Factura.com." };
  }
  const { apiKey, apiSecret, isLiveMode } = facturaCom;
  
  const host = isLiveMode ? 'https://api.factura.com' : 'https://sandbox.factura.com/api';
  const url = `${host}/v4/cfdi40/list?limit=100`;

  try {
     const headers: HeadersInit = { 'F-Api-Key': apiKey };
    if (apiSecret) {
      headers['F-Secret-Key'] = apiSecret;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error del servidor: ${response.status}`);
    }

    const responseData = await response.json();

    return {
      data: responseData.data || [], 
      page: responseData.page,
      total_pages: responseData.total_pages,
      total_results: responseData.total_results,
    };
  } catch (e: any) {
    console.error('Factura.com list invoices error:', e.message);
    return { data: [], error: `Error al obtener facturas: ${e.message}` };
  }
}
