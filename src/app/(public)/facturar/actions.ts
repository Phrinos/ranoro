'use server';

import { createInvoice } from '@/ai/flows/billing-flow';
import type { BillingFormValues } from '@/schemas/billing-form';
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
    const result = await createInvoice({
      customer: {
        ...customerData,
        paymentForm: '01', // Default to 'Efectivo' for now
      },
      ticket: ticketData,
    });
    
    // Optional: revalidate paths if invoice creation should update some cached data
    // revalidatePath('/facturacion-admin/historial'); 

    return result;
  } catch (error) {
    console.error("Error in createInvoiceAction:", error);
    // Return a serializable error object
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}
