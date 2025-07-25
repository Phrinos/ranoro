
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { billingFormSchema } from '@/app/(public)/facturar/components/billing-schema';
import type { SaleReceipt, ServiceRecord, WorkshopInfo } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebasePublic';
import axios from 'axios';
import { format } from 'date-fns';

const FDC_API_BASE_URL = 'https://factura.com/api';

// --- Utility to get Factura.com API credentials ---
const getFacturaComInstance = async () => {
  if (!db) throw new Error('Database not initialized.');
  const configSnap = await getDoc(doc(db, 'workshopConfig', 'main'));
  if (!configSnap.exists()) {
    throw new Error('La configuración del taller no ha sido establecida.');
  }
  const workshopInfo = configSnap.data() as WorkshopInfo;
  
  const apiKey = workshopInfo.facturaComApiKey;
  const apiSecret = workshopInfo.facturaComApiSecret;

  if (!apiKey || !apiSecret) {
    throw new Error('Las credenciales de Factura.com no están configuradas.');
  }
  
  return { apiKey, apiSecret };
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
    outputSchema: z.any(),
  },
  async (input) => {
    try {
      const { apiKey, apiSecret } = await getFacturaComInstance();
      const { customer, ticket } = input;
      
      const ticketItems = ('items' in ticket && Array.isArray(ticket.items) 
        ? ticket.items 
        : ('serviceItems' in ticket && Array.isArray(ticket.serviceItems) 
            ? ticket.serviceItems 
            : [])
      ).map(item => {
          const unitPriceWithTax = ('totalPrice' in item && item.quantity > 0) 
            ? (item.totalPrice / item.quantity) 
            : ('price' in item ? item.price || 0 : 0);
          
          const unitPrice = unitPriceWithTax / 1.16;
          const totalLinePrice = ('totalPrice' in item ? item.totalPrice : (item.price * item.quantity));
          const basePrice = totalLinePrice / 1.16;
          const taxAmount = totalLinePrice - basePrice;

          return {
            Desc: 'itemName' in item ? item.itemName : 'name' in item ? item.name : 'Artículo',
            ClaveProdServ: '81111500', // Servicios de Mantenimiento y Reparación de Vehículos
            ClaveUnidad: 'E48', // Unidad de servicio
            Unidad: 'Unidad',
            Cantidad: 'quantity' in item ? item.quantity : 1,
            ValorUnitario: unitPrice,
            Importe: basePrice,
            Impuestos: {
              Traslados: [{
                Base: basePrice.toFixed(2),
                Impuesto: '002', // IVA
                TipoFactor: 'Tasa',
                TasaOCuota: '0.160000',
                Importe: taxAmount.toFixed(2)
              }]
            }
          };
      });

      const total = ticket.totalAmount || ticket.totalCost;
      const subTotal = total / 1.16;
      const iva = total - subTotal;

      const invoiceData = {
        Receptor: {
          UID: customer.rfc, 
          Nombre: customer.name,
          RFC: customer.rfc,
          UsoCFDI: customer.cfdiUse,
          RegimenFiscalReceptor: customer.taxSystem,
        },
        TipoCfdi: 'I',
        FormaPago: customer.paymentForm || '01',
        MetodoPago: 'PUE',
        Moneda: 'MXN',
        Fecha: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
        Serie: 'RAN',
        Folio: ticket.id?.slice(-6) || Date.now(),
        SubTotal: subTotal.toFixed(2),
        Total: total.toFixed(2),
        Descuento: "0.00",
        Impuestos: {
          TotalImpuestosTrasladados: iva.toFixed(2),
          Traslados: [{
            Base: subTotal.toFixed(2),
            Impuesto: '002',
            TipoFactor: 'Tasa',
            TasaOCuota: '0.160000',
            Importe: iva.toFixed(2)
          }]
        },
        Conceptos: ticketItems,
        send_email: true,
        email: customer.email,
      };

      const response = await axios.post(`${FDC_API_BASE_URL}/v4/cfdi`, invoiceData, {
        headers: {
          'F-API-KEY': apiKey,
          'F-SECRET-KEY': apiSecret,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status === 'error') {
        throw new Error(response.data.message || 'Error desconocido de Factura.com');
      }

      return {
        success: true,
        invoiceId: response.data.UID,
        invoiceUrl: response.data.PDF,
        status: response.data.Status,
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
    const { apiKey, apiSecret } = await getFacturaComInstance();
    await axios.delete(`${FDC_API_BASE_URL}/v4/cfdi/${invoiceId}`, {
      headers: {
        'F-API-KEY': apiKey,
        'F-SECRET-KEY': apiSecret,
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
 * (Factura.com lo envía por correo, pero podemos construir la URL si es necesario)
 * ------------------------------------- */

export async function getInvoicePdfUrl(invoiceId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  // Factura.com does not provide a direct PDF URL in the same way.
  // The PDF is sent by email. We can construct a link to their portal if needed.
  // For now, this function will return a placeholder.
  return Promise.resolve({ success: true, url: `https://factura.com/cfdi/${invoiceId}/pdf` });
}

/* -------------------------------------
 * 🧾 Obtener historial de facturas
 * ------------------------------------- */

export async function getInvoices(): Promise<any> {
    try {
      const { apiKey, apiSecret } = await getFacturaComInstance();
      const response = await axios.get(`${FDC_API_BASE_URL}/v4/cfdi`, {
        headers: {
          'F-API-KEY': apiKey,
          'F-SECRET-KEY': apiSecret,
        },
        params: {
          limit: 100,
          // Add other params like date ranges if needed
        }
      });

      return {
        data: response.data.data,
        page: response.data.current_page,
        total_pages: response.data.last_page,
        total_results: response.data.total,
      }
    } catch (e: any) {
      console.error('Factura.com list invoices error:', e.response?.data || e.message);
      throw new Error(`Error al obtener facturas: ${e.response?.data?.message || e.message}`);
    }
}
