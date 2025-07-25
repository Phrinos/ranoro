

import { getInvoices } from '@/ai/flows/billing-flow';
import type { SaleReceipt, ServiceRecord } from "@/types";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseClient';

type TicketType = SaleReceipt | ServiceRecord;

/**
 * Finds a ticket (either a SaleReceipt or a ServiceRecord) by its folio ID and total amount.
 * It first attempts to find the document in the 'sales' collection, and if not found,
 * it tries the 'serviceRecords' collection.
 * @param folio The ticket's ID.
 * @param total The total amount on the ticket for verification.
 * @returns The found ticket object or null if not found or if the total doesn't match.
 */
const findTicket = async (folio: string, total: number): Promise<TicketType | null> => {
    if (!db || !folio) return null;

    const collectionsToSearch: ('sales' | 'serviceRecords')[] = ['sales', 'serviceRecords'];

    for (const collectionName of collectionsToSearch) {
        try {
            const docRef = doc(db, collectionName, folio);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as any;
                // Use totalAmount for sales and totalCost for services, with fallback
                const recordTotal = data.totalAmount ?? data.totalCost ?? 0;

                // Verify the total amount, allowing for a small tolerance for floating point differences
                if (Math.abs(recordTotal - total) < 0.01) {
                    return { id: docSnap.id, ...data } as TicketType;
                }
                 // If folio matches but total doesn't, we can stop and assume it's the wrong total.
                 // This prevents searching the other collection unnecessarily if a valid folio was found.
                 return null;
            }
        } catch (error) {
            console.error(`Error searching in ${collectionName} for folio ${folio}:`, error);
            // Continue to the next collection if an error occurs
        }
    }

    // If the loop completes without finding anything
    return null;
};


export const billingService = {
  findTicket,
};