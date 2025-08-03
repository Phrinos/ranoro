

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { QuoteRecord } from '@/types';

const getQuoteById = async (id: string): Promise<QuoteRecord | null> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'serviceRecords', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'Cotizacion') {
            return { id: docSnap.id, ...data } as QuoteRecord;
        }
    }
    return null;
};

export const quoteService = {
    getQuoteById,
};
