

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
 * Saves a document to a public collection.
 * In local mode, this function does nothing as there is no public Firestore instance.
 * It returns a successful promise to avoid breaking the application flow.
 */
export const savePublicDocument = async (
  type: 'service' | 'quote' | 'ownerReport',
  data: DocumentData,
  vehicle: any,
  workshopInfo: any
): Promise<Result> => {
  console.log(`[LOCAL MODE] Simulating save of public document: type=${type}, id=${data.publicId}`);
  // In a real scenario with a public-facing database, this is where you would
  // write to a separate, non-authenticated Firestore instance.
  // For local-only mode, we just return success.
  return { success: true };
};
