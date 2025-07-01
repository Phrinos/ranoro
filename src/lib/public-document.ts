
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { sanitizeObjectForFirestore } from '@/lib/placeholder-data';
import type { QuoteRecord, ServiceRecord, Vehicle, WorkshopInfo } from "@/types";

export const savePublicDocument = async (
  type: 'quote' | 'service',
  data: QuoteRecord | ServiceRecord,
  vehicle: Vehicle | null,
  workshopInfo: WorkshopInfo | {}
) => {
  if (!db) {
    console.error("Public save failed: Firebase (db) is not configured in lib/firebaseClient.js");
    throw new Error("La base de datos (Firebase) no está configurada. No se pudo crear el documento público.");
  }

  if (!data.publicId || !vehicle) {
    console.warn(`Public save skipped: Missing publicId or vehicle data.`);
    return;
  }

  const collectionName = type === 'quote' ? 'publicQuotes' : 'publicServices';
  const publicDocRef = doc(db, collectionName, data.publicId);

  const fullPublicData = sanitizeObjectForFirestore({
    ...data,
    vehicle,
    workshopInfo,
  });

  try {
    await setDoc(publicDocRef, fullPublicData, { merge: true });
    console.log(`Public ${type} document ${data.publicId} saved successfully.`);
  } catch (e) {
    console.error(`Failed to save public ${type} document:`, e);
    throw new Error(`No se pudo guardar el documento público. El enlace compartido podría no funcionar. Error: ${e instanceof Error ? e.message : String(e)}`);
  }
};
