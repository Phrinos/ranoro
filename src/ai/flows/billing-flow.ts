'use server';

import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import Facturapi from 'facturapi';

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

// --- Utility to get Facturapi credentials from Firestore ---
const getFacturapiInstance = async () => {
  const db = getAdminDb();
  const configSnap = await db.collection('settings').doc('billing').get();
  if (!configSnap.exists) return null;

  const billingConfig = configSnap.data() as any;
  const apiKey = (billingConfig.liveSecretKey || '').trim();
  
  if (!apiKey) return null;
  return new Facturapi(apiKey);
};

export async function createInvoice(
  input: z.infer<typeof CreateInvoiceInputSchema>
): Promise<z.infer<typeof CreateInvoiceOutputSchema>> {
  try {
    const facturapi = await getFacturapiInstance();
    if (!facturapi) {
      throw new Error('La configuración de facturación (Facturapi) no ha sido establecida por el administrador.');
    }
    
    const { customer, ticket } = input;

    // STEP 1: Create or find the client to get their UID
    const client = await facturapi.customers.create({
      legal_name: customer.name,
      tax_id: customer.rfc,
      tax_system: customer.taxSystem as any,
      email: customer.email,
      address: {
        zip: customer.address.zip
      }
    });

    // STEP 2: Prepare invoice line items
    const IVA_RATE = 0.16;
    let ticketItems;

    if ('items' in ticket && Array.isArray(ticket.items)) { // SaleReceipt
        ticketItems = ticket.items.map((item: any) => ({
            description: item.itemName,
            quantity: item.quantity,
            price: item.total || item.totalPrice, // with tax
            product_key: '01010101', 
            unit_key: 'H87', 
        }));
    } else { // ServiceRecord
        ticketItems = (ticket.serviceItems || []).map((item: any) => ({
            description: item.name || item.itemName,
            quantity: 1, 
            price: item.sellingPrice || item.price || 0, // with tax
            product_key: '81111500', 
            unit_key: 'E48', 
        }));
    }

    const conceptos = ticketItems.map(item => {
        const priceBeforeTax = item.price / (1 + IVA_RATE);
        return {
            product: {
                description: item.description,
                product_key: item.product_key,
                unit_key: item.unit_key,
                price: priceBeforeTax,
                taxes: [{
                  type: 'IVA',
                  rate: IVA_RATE,
                }]
            },
            quantity: item.quantity,
        };
    });

    // STEP 3: Create the invoice using the customer ID
    // Note: Assuming 'Pago en una sola exhibición' and 'Efectivo' (01) automatically for POS
    const invoice = await facturapi.invoices.create({
      customer: client.id,
      use: customer.cfdiUse as any,
      payment_form: '01' as any, // '01' is Efectivo in SAT catalogs
      payment_method: 'PUE' as any, // 'PUE' is PagoEnUnaSolaExhibicion
      items: conceptos as any,
    });
    
    return {
      success: true,
      invoiceId: invoice.id,
      invoiceUrl: invoice.verification_url, // Facturapi provides verification_url
      status: invoice.status,
    };
  } catch (e: any) {
    console.error('❌ Error en createInvoice:', e);
    const errorMessage = e?.message || e?.data?.message || 'Error inesperado al facturar.';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function cancelInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const facturapi = await getFacturapiInstance();
    if (!facturapi) throw new Error('Credenciales de Facturapi no configuradas.');

    await facturapi.invoices.cancel(invoiceId, { motive: '02' as any }); // '02' Comprobante emitido con errores sin relacion
    return { success: true };
  } catch (e: any) {
    console.error('Cancelación fallida:', e.message);
    return { success: false, error: e?.data?.message || e.message || 'Error desconocido' };
  }
}

export async function getInvoicePdfUrl(invoiceId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const facturapi = await getFacturapiInstance();
    if (!facturapi) throw new Error('Credenciales no configuradas.');

    // Facturapi provides download URLs in the API but also a `verification_url`
    const invoice = await facturapi.invoices.retrieve(invoiceId);
    if (!invoice) throw new Error('Factura no encontrada.');

    // Alternatively, Facturapi allows downloading PDF directly via facturapi.invoices.downloadPdf(invoiceId)
    // For rendering in a browser, returning the verification_url is cleaner
    return { success: true, url: invoice.verification_url };
  } catch (e: any) {
     console.error('Get PDF URL error:', e.message);
     return { success: false, error: e?.data?.message || e.message || 'Error desconocido al obtener PDF' };
  }
}

export async function getInvoices(): Promise<{ data: any[], error?: string, total_pages?: number }> {
  try {
    const facturapi = await getFacturapiInstance();
    if (!facturapi) return { data: [], error: "No se han configurado las credenciales de Facturapi." };
    
    const result = await facturapi.invoices.list();

    return {
      data: result.data || [], 
      total_pages: result.total_pages,
    };
  } catch (e: any) {
    console.error('Facturapi list invoices error:', e);
    return { data: [], error: e?.data?.message || e.message || 'Error al obtener facturas' };
  }
}
