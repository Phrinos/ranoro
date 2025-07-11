

import { doc, setDoc } from 'firebase/firestore';
// IMPORTANT: Use the authenticated client for write operations
import { db } from '@/lib/firebaseClient'; 
import { sanitizeObjectForFirestore } from './utils';

type DocumentData = {
  id: string;
  publicId: string;
  [key: string]: any;
};

type Result = {
  success: boolean;
  error?: string;
};

/**
 * Saves a document to a public collection using the client-side SDK.
 * This function MUST be called from a client component where the user is authenticated,
 * as the firestore rules require auth for write operations on public collections.
 * It uses the main 'firebaseClient' which includes authentication.
 */
export const savePublicDocument = async (
  type: 'service' | 'quote' | 'ownerReport',
  data: DocumentData,
  vehicle: any,
  workshopInfo: any
): Promise<Result> => {
  if (!data.publicId) {
    const errorMessage = `Cannot save public ${type} document without a publicId.`;
    console.error(errorMessage);
    return { success: false, error: errorMessage };
  }
  
  // Map the type to the correct collection name
  const collectionMap = {
    service: 'publicServices',
    quote: 'publicQuotes',
    ownerReport: 'publicOwnerReports',
  };
  const collectionName = collectionMap[type];

  // Prepare the full data payload
  const fullPublicData = sanitizeObjectForFirestore({
    ...data,
    vehicle,
    workshopInfo,
  });

  try {
    // Get a reference to the public document using the authenticated db instance
    const publicDocRef = doc(db, collectionName, data.publicId);
    
    // Set the document data. Use merge: true to avoid overwriting fields if it already exists.
    await setDoc(publicDocRef, fullPublicData, { merge: true });
    
    console.log(`Public ${type} document ${data.publicId} saved successfully via client SDK.`);
    return { success: true };
  } catch (e) {
    const errorMessage = `Failed to save public document. Error: ${e instanceof Error ? e.message : String(e)}`;
    console.error(`Failed to save public ${type} document to ${collectionName}:`, e);
    // This error will be a Firestore permission error if rules are wrong or user is not authenticated.
    return { success: false, error: errorMessage };
  }
};
