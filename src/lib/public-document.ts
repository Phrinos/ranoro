


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
 * Saves or updates a document in a public collection in Firestore.
 * This function can be called from both server and client environments where firebasePublic is initialized.
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
    const docId = data.publicId || data.id; 
    if (!docId) {
      return { success: false, error: 'Document ID (id or publicId) is missing.' };
    }

    let collectionName = '';
    let publicData: any = {};

    switch (type) {
      case 'service':
      case 'quote':
        collectionName = 'publicServices';
        // When updating a signature from the client, data might only contain the signature field.
        // We merge with existing service data if it's an update.
        publicData = {
          ...data,
          // Only embed vehicle and workshop info if provided (typically on first save)
          ...(vehicle && { vehicle }),
          ...(workshopInfo && { workshopInfo }),
        };
        break;
      case 'ownerReport':
         collectionName = 'publicOwnerReports';
         publicData = data;
         break;
      default:
        return { success: false, error: 'Invalid document type specified.' };
    }

    // Clean the object just before saving to remove any undefined values etc.
    const cleanedPublicData = cleanObjectForFirestore(publicData);
    
    const publicDocRef = doc(db, collectionName, docId);
    await setDoc(publicDocRef, cleanedPublicData, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error(`Error saving public document (type: ${type}, id: ${data.id || data.publicId}):`, error);
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' };
  }
};
