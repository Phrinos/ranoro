
import { getInvoices } from '@/ai/flows/billing-flow';
import type { SaleReceipt, ServiceRecord } from "@/types";

type TicketType = SaleReceipt | ServiceRecord;

const findTicket = async (folio: string, total: number): Promise<TicketType | null> => {
    const response = await getInvoices();
    const allInvoices = response.data;

    const foundInvoice = allInvoices.find((invoice: any) => {
        const folioMatch = invoice.folio_number === folio;
        const totalMatch = Math.abs(invoice.total - total) < 0.01;
        return folioMatch && totalMatch;
    });

    if (foundInvoice) {
        // We need to reconstruct a partial ticket object from the invoice
        // This is not ideal, but it's the best we can do with the new API
        const ticket: Partial<TicketType> = {
            id: foundInvoice.folio_number,
            totalAmount: foundInvoice.total,
            saleDate: foundInvoice.created_at,
        };
        return ticket as TicketType;
    }

    return null;
};


export const billingService = {
  findTicket,
};
