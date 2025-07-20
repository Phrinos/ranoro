
'use server';
/**
 * @fileOverview An AI flow to create an invoice (CFDI) using FacturAPI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { billingFormSchema } from '@/app/facturar/components/billing-form';
import type { SaleReceipt, ServiceRecord, WorkshopInfo } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import Facturapi from 'facturapi';

const CreateInvoiceInputSchema = z.object({
  customer: billingFormSchema,
  ticket: z.any(), // Can be SaleReceipt or ServiceRecord
});

export async function createInvoice(
  input: z.infer<typeof CreateInvoiceInputSchema>
): Promise<{ success: boolean; error?: string }> {
  return createInvoiceFlow(input);
}

const createInvoiceFlow = ai.defineFlow(
  {
    name: 'createInvoiceFlow',
    inputSchema: CreateInvoiceInputSchema,
    outputSchema: z.any(),
  },
  async (input) => {
    if (!db) throw new Error("Database not initialized.");

    const configRef = doc(db, 'workshopConfig', 'main');
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) {
      throw new Error('La configuración del taller no ha sido establecida.');
    }
    const workshopInfo = configSnap.data() as WorkshopInfo;
    const apiKey = workshopInfo.facturapiBillingMode === 'live' 
        ? workshopInfo.facturapiLiveApiKey 
        : workshopInfo.facturapiTestApiKey;

    if (!apiKey) {
      throw new Error('La API Key de FacturAPI no está configurada.');
    }

    const facturapi = new Facturapi(apiKey);
    const ticket = input.ticket as SaleReceipt | ServiceRecord;
    
    // 1. Find or create customer
    let customer;
    try {
        const existingCustomers = await facturapi.customers.list({ q: input.customer.rfc });
        if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
        } else {
            customer = await facturapi.customers.create({
                legal_name: input.customer.name,
                tax_id: input.customer.rfc,
                email: input.customer.email,
                address: {
                    zip: input.customer.address.zip,
                },
                tax_system: input.customer.taxSystem,
            });
        }
    } catch(e: any) {
        console.error("FacturAPI customer error:", e.message);
        throw new Error(`Error con cliente en FacturAPI: ${e.message}`);
    }

    // 2. Prepare invoice items
    const items = ('items' in ticket ? ticket.items : (ticket.serviceItems || [])).map(item => {
        const price = 'unitPrice' in item ? item.unitPrice : item.price;
        const description = 'itemName' in item ? item.itemName : item.name;
        
        return {
            quantity: 'quantity' in item ? item.quantity : 1,
            product: {
                description: description,
                product_key: '81111500', // Clave de producto SAT para "Servicios de Mantenimiento y Reparación de Vehículos"
                price: price / 1.16, // FacturAPI requires price before tax
            },
        };
    });

    // 3. Create invoice
    try {
      const invoice = await facturapi.invoices.create({
        customer: customer.id,
        use: input.customer.cfdiUse,
        payment_form: '01', // Efectivo (default, adjust as needed)
        items: items as any, // Cast needed due to FacturAPI type definitions
      });

      // Optional: Send invoice by email
      await facturapi.invoices.sendByEmail(invoice.id);
      
      return { success: true, invoiceId: invoice.id };

    } catch(e: any) {
      console.error("FacturAPI invoice creation error:", e.data?.message || e.message);
      throw new Error(`Error al crear factura: ${e.data?.message || e.message}`);
    }
  }
);
