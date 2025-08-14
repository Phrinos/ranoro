
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebasePublic';
import type { ServiceRecord, Vehicle, QuoteRecord } from '@/types';
import { cleanObjectForFirestore } from './forms';

type DocumentType = 'service' | 'quote';

export const savePublicDocument = async (
  type: DocumentType,
  data: Partial<ServiceRecord | QuoteRecord>,
  vehicle?: Vehicle
) => {
  if (!db) {
    console.error("Public Firestore not initialized.");
    return { success: false, error: "Public database not available." };
  }

  const publicId = data.publicId || data.id;
  if (!publicId) {
    console.error("No publicId found in data.", data);
    return { success: false, error: "Missing document ID." };
  }

  try {
    const docRef = doc(db, 'publicServices', publicId);
    
    // Create a new object for the public document to avoid circular references
    // and ensure all necessary data is present.
    const publicData = {
      ...data,
      vehicle: vehicle || data.vehicle || null, // Ensure the full vehicle object is attached
    };
    
    // Clean the final object for Firestore
    const cleanedData = cleanObjectForFirestore(publicData);

    await setDoc(docRef, cleanedData, { merge: true });
    
    return { success: true };

  } catch (error) {
    console.error(`Error saving public document ${publicId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: errorMessage };
  }
};
