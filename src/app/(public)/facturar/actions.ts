
'use server';

import { createInvoice } from '@/ai/flows/billing-flow';
import { type BillingFormValues } from './components/billing-schema';
import type { SaleReceipt, ServiceRecord } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Server Action to create an invoice.
 * This function is designed to be called from a client component.
 */
export async function createInvoiceAction(
  customerData: BillingFormValues,
  ticketData: SaleReceipt | ServiceRecord
) {
  try {
    const response = await createInvoice({
      customer: {
        ...customerData,
        paymentForm: '01', // Default to 'Efectivo' for now
      },
      ticket: ticketData,
    });
    
    // Step 2: Ensure proper handling of the flow's response
    if (!response?.success) {
        throw new Error(response?.error || 'Error inesperado desde el flujo de creación.');
    }

    // Optional: revalidate paths if invoice creation should update some cached data
    // revalidatePath('/facturacion-admin/historial'); 

    return response;
  } catch (error) {
    console.error("Error in createInvoiceAction:", error);
    // Return a serializable error object
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}
