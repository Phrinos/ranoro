import { db } from '@/lib/firebaseClient.js';
import { doc, setDoc } from 'firebase/firestore';
import { sanitizeObjectForFirestore } from '@/lib/placeholder-data';
import type { QuoteRecord, ServiceRecord, Vehicle, WorkshopInfo } from "@/types";

export const savePublicDocument = async (
  type: 'quote' | 'service',
  data: QuoteRecord | ServiceRecord,
  vehicle: Vehicle | null,
  workshopInfo: WorkshopInfo | {}
): Promise<{ success: boolean; error?: string }> => {
  if (!data.publicId) {
    const errorMsg = 'Documento no tiene ID público para guardar.';
    console.warn(`Public save skipped: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
   if (!vehicle) {
    const errorMsg = 'No se ha seleccionado un vehículo para el documento público.';
    console.warn(`Public save skipped: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
  if (!db) {
      const errorMsg = "La conexión con la base de datos no está configurada.";
      console.error(`Public save failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
  }

  const collectionName = type === 'quote' ? 'publicQuotes' : 'publicServices';

  const fullPublicData = sanitizeObjectForFirestore({
    ...data,
    vehicle,
    workshopInfo,
  });

  try {
    const publicDocRef = doc(db, collectionName, data.publicId);
    await setDoc(publicDocRef, fullPublicData, { merge: true });
    
    console.log(`Public ${type} document ${data.publicId} saved successfully via client SDK.`);
    return { success: true };
  } catch (e) {
    const errorMessage = `Fallo al guardar documento público. Error: ${e instanceof Error ? e.message : String(e)}`;
    console.error(`Failed to save public ${type} document:`, e);
    // This error will be a Firestore permission error if rules are wrong.
    return { success: false, error: errorMessage };
  }
};
