

import type { SaleReceipt, ServiceRecord } from "@/types";
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '../firebaseClient';

type Ticket = SaleReceipt | ServiceRecord;

const TICKET_COLLECTIONS: ('sales' | 'serviceRecords')[] = ['sales', 'serviceRecords'];

/**
 * Finds a ticket (SaleReceipt or ServiceRecord) by its folio ID and total amount.
 * It iterates through specified collections to locate the document.
 * 
 * @param folio - The ID of the ticket to find.
 * @param total - The total amount for verification, allowing for minor floating point differences.
 * @returns The found ticket object, or null if not found or if the total does not match.
 */
const findTicket = async (folio: string, total: number): Promise<Ticket | null> => {
    if (!db || !folio || typeof total !== 'number') {
        console.warn(`findTicket called with invalid parameters: ${JSON.stringify({ folio, total })}`);
        return null;
    }

    for (const collectionName of TICKET_COLLECTIONS) {
        try {
            const docRef = doc(db, collectionName, folio);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as DocumentData;
                const recordTotal = data.totalAmount ?? data.totalCost ?? 0;

                // Verify the total amount with a small tolerance for floating point issues.
                if (Math.abs(recordTotal - total) < 0.01) {
                    return { id: docSnap.id, ...data } as Ticket;
                }
                
                // If a document with the folio is found but the total doesn't match,
                // it's the incorrect ticket. Stop searching.
                console.log(`Ticket found for folio ${folio} but total amount did not match. Expected: ${total}, Found: ${recordTotal}`);
                return null;
            }
        } catch (error) {
            console.error(`Error accessing collection ${collectionName} for folio ${folio}:`, error instanceof Error ? error.message : String(error));
            // Decide if you want to continue or stop on error. Continuing is more resilient.
        }
    }

    // Return null if no matching ticket is found in any collection.
    return null;
};

export const billingService = {
  findTicket,
};
