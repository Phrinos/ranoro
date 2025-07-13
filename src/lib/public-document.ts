

import { db } from './firebasePublic';
import { doc, setDoc } from 'firebase/firestore';
import type { ServiceRecord, QuoteRecord, Vehicle, WorkshopInfo, PublicOwnerReport } from '@/types';
import { cleanObjectForFirestore } from './forms';


type DocumentData = Partial<ServiceRecord> & {
    id: string;
    publicId: string;
    vehicle?: Vehicle;
    workshopInfo?: WorkshopInfo;
};

type Result = {
  success: boolean;
  error?: string;
};

/**
 * Saves a document to a public collection in Firestore.
 * This function is designed to be called from a server environment.
 * It sanitizes the data before saving.
 */
export const savePublicDocument = async (
  type: 'service' | 'quote' | 'ownerReport',
  data: any,
  vehicle?: Vehicle,
  workshopInfo?: WorkshopInfo,
): Promise<Result> => {
  if (!db) {
    return { success: false, error: 'Public Firestore is not initialized.' };
  }

  try {
    const docId = data.publicId || data.id; // Use publicId if available, fallback to main id
    let collectionName = '';
    let publicData: any = {};

    switch (type) {
      case 'service':
      case 'quote':
        collectionName = 'publicServices';
        publicData = {
          ...data,
          vehicle, // Embed vehicle data for public access
          workshopInfo, // Embed workshop info
        };
        break;
      case 'ownerReport':
         collectionName = 'publicOwnerReports';
         publicData = data;
         break;
      default:
        return { success: false, error: 'Invalid document type specified.' };
    }

    const cleanedPublicData = cleanObjectForFirestore(publicData);
    
    const publicDocRef = doc(db, collectionName, docId);
    await setDoc(publicDocRef, cleanedPublicData, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error(`Error saving public document (type: ${type}, id: ${data.id}):`, error);
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' };
  }
};
