
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord } from "@/types";

const onQuotesUpdate = (callback: (quotes: ServiceRecord[]) => void): (() => void) => {
    if (!db) return () => {};
    
    // 1. Query only by status to avoid complex index requirements.
    const q = query(
        collection(db, "serviceRecords"), 
        where("status", "==", "Cotizacion")
    );

    return onSnapshot(q, (snapshot) => {
        const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
        
        // 2. Sort the results on the client-side.
        quotes.sort((a, b) => {
            const dateA = a.receptionDateTime ? new Date(a.receptionDateTime) : 0;
            const dateB = b.receptionDateTime ? new Date(b.receptionDateTime) : 0;
            if (dateA && dateB) return dateB.getTime() - dateA.getTime(); // Descending
            return 0;
        });

        callback(quotes);
    }, (error) => {
        console.error("Error listening to quotes:", error.message);
        callback([]);
    });
};

export const quoteService = {
    onQuotesUpdate,
};
