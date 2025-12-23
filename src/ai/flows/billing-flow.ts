
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminDb } from '@/lib/firebaseAdmin';

// --- Zod Schemas ---
const billingFormSchema = z.object({
  rfc: z.string().trim().min(12, { message: 'El RFC debe tener entre 12 y 13 caracteres.' }).max(13, { message: 'El RFC debe tener entre 12 y 13 caracteres.' }),
  name: z.string().min(1, { message: 'El nombre o razón social es requerido.' }),
  email: z.string().email({ message: 'Correo inválido.' }),
  address: z.object({
    zip: z.string().length(5, { message: 'El código postal debe tener 5 dígitos.' }),
  }),
  taxSystem: z.string().trim().min(1, { message: 'Debe seleccionar un régimen fiscal.'}),
  cfdiUse: z.string().min(1, { message: 'El Uso de CFDI es requerido en el backend.' }),
});


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


// --- Utility to get Factura.com API credentials ---
const getFacturaComInstance = async () => {
  const db = getAdminDb();
  const configSnap = await db.collection('workshopConfig').doc('main').get();
  if (!configSnap.exists) return null;

  const workshopConfig = configSnap.data() as any;
  
  const apiKey = (workshopConfig.facturaComApiKey || '').trim();
  if (!apiKey) return null;

  const isLiveMode = workshopConfig.facturaComBillingMode === 'live';
  
  return { apiKey, isLiveMode };
};


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
    const errorMessage = e?.message || (e?.data?.message ? `${e.data.message} (${e.data.code})` : 'Error inesperado en el wrapper de facturación.');
    return {
      success: false,
      error: errorMessage,
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
    
    return {
        success: false,
        error: "La funcionalidad de facturación está deshabilitada temporalmente.",
    };
    /*
    const facturaComCredentials = await getFacturaComInstance();
    if (!facturaComCredentials) {
      throw new Error('La configuración de facturación no ha sido establecida. Contacte al administrador del taller.');
    }
    const { apiKey, isLiveMode } = facturaComCredentials;

    const facturapi = new Facturapi(apiKey, { live: isLiveMode });
    
    const { customer, ticket } = input;

    // STEP 1: Create or find the client to get their UID
    const client = await facturapi.client.create({
      rfc: customer.rfc,
      legal_name: customer.name,
      email: customer.email,
      tax_system: customer.taxSystem,
      address: {
        zip: customer.address.zip
      }
    });

    // STEP 2: Prepare invoice concepts
    const IVA_RATE = 0.16;
    let ticketItems;

    if ('items' in ticket && Array.isArray(ticket.items)) { // This is a SaleReceipt
        ticketItems = ticket.items.map((item: any) => ({
            description: item.itemName,
            quantity: item.quantity,
            price: item.totalPrice, // total price per line item (with tax)
            claveProdServ: '01010101', // Generic product key
            claveUnidad: 'H87', // Piece
        }));
    } else { // This is a ServiceRecord
        ticketItems = (ticket.serviceItems || []).map((item: any) => ({
            description: item.name,
            quantity: 1, 
            price: item.price || 0, // total price per line item (with tax)
            claveProdServ: '81111500', // Generic service key
            claveUnidad: 'E48', // Service Unit
        }));
    }

    const conceptos = ticketItems.map(item => {
        const valorUnitario = parseFloat((item.price / (1 + IVA_RATE)).toFixed(2));
        const importe = valorUnitario * item.quantity;
        const ivaTrasladado = parseFloat((importe * IVA_RATE).toFixed(2));

        return {
            product: {
                description: item.description,
                product_key: item.claveProdServ,
                unit_key: item.claveUnidad,
                price: valorUnitario,
            },
            quantity: item.quantity,
            tax_included: false,
            taxes: [{
                type: 'IVA',
                rate: IVA_RATE,
            }]
        };
    });

    // STEP 3: Create the invoice using the client UID
    const invoice = await facturapi.invoice.create({
      customer: client.id,
      use: customer.cfdiUse.trim(),
      payment_form: Facturapi.PaymentForm.Efectivo, // Asuming cash as per user's last request.
      payment_method: Facturapi.PaymentMethod.PagoEnUnaSolaExhibicion,
      series: 'RAN',
      items: conceptos,
    });
    
    return {
      success: true,
      invoiceId: invoice.id,
      invoiceUrl: invoice.pdf_url,
      status: invoice.status,
    };
    */
  }
);


/* -------------------------------------
 * ❌ Cancelar factura CFDI con Factura.com
 * ------------------------------------- */

export async function cancelInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Función no disponible.' };
  /*
  try {
    const facturaComCredentials = await getFacturaComInstance();
    if (!facturaComCredentials) throw new Error('Credenciales de facturación no configuradas.');
    const { apiKey, isLiveMode } = facturaComCredentials;

    const facturapi = new Facturapi(apiKey, { live: isLiveMode });
    
    await facturapi.invoice.cancel(invoiceId, {
      motive: (Facturapi.Motive as any).ComprobanteEmitidoConErroresSinRelacion,
    });

    return { success: true };
  } catch (e: any) {
    console.error('Cancelación de factura fallida:', e.message);
    return { success: false, error: e?.data?.message || e.message || 'Error desconocido' };
  }
  */
}


/* -------------------------------------
 * 📥 Obtener PDF de factura CFDI
 * ------------------------------------- */

export async function getInvoicePdfUrl(invoiceId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  return { success: false, error: 'Función no disponible.' };
  /*
  try {
    const facturaComCredentials = await getFacturaComInstance();
    if (!facturaComCredentials) throw new Error('Credenciales de facturación no configuradas.');
    const { apiKey, isLiveMode } = facturaComCredentials;

    const facturapi = new Facturapi(apiKey, { live: isLiveMode });
    const invoice = await facturapi.invoice.retrieve(invoiceId);

    if (!invoice) {
        throw new Error('Factura no encontrada.');
    }

    return { success: true, url: invoice.pdf_url };
  } catch (e: any) {
     console.error('Get PDF URL error:', e.message);
     return { success: false, error: e?.data?.message || e.message || 'Error desconocido' };
  }
  */
}

/* -------------------------------------
 * 🧾 Obtener historial de facturas
 * ------------------------------------- */

export async function getInvoices(): Promise<{ data: any[], error?: string, page?: number, total_pages?: number, total_results?: number }> {
  try {
    const facturaComCredentials = await getFacturaComInstance();
    if (facturaComCredentials === null) {
      return { data: [], error: "No se han configurado las credenciales de Factura.com." };
    }
    const { apiKey, isLiveMode } = facturaComCredentials;
    
    // const facturapi = new Facturapi(apiKey, { live: isLiveMode });
    // const result = await facturapi.invoice.list();

    return {
      data: [] as any[], //result.data || [], 
      page: 1, //result.page,
      total_pages: 1, //result.total_pages,
      total_results: 0, //result.total_results,
    };
  } catch (e: any) {
    console.error('Factura.com list invoices error:', e);
    return { data: [], error: e?.data?.message || e.message || 'Error al obtener facturas' };
  }
}
