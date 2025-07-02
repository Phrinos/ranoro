
"use server";

import { adminDb } from "@/lib/firebaseAdmin";

export async function savePublicDocument(
  collection: "publicQuotes" | "publicServices",
  id: string,
  data: any
) {
  try {
    await adminDb.collection(collection).doc(id).set(data, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Failed to save public document:", error);
    return { success: false, error: "Failed to save document." };
  }
}

export async function saveSignature(
  publicId: string,
  signatureDataUrl: string,
  type: 'reception' | 'delivery'
) {
  if (!publicId || !signatureDataUrl || !type) {
    return { success: false, message: 'Faltan datos para guardar la firma.' };
  }
  
  if (!adminDb) {
    console.error("Admin DB is not initialized. Cannot save signature.");
    return { success: false, message: 'La conexión con el servidor no está configurada.' };
  }

  try {
    const docRef = adminDb.collection('publicServices').doc(publicId);
    const fieldToUpdate = type === 'reception' ? 'customerSignatureReception' : 'customerSignatureDelivery';
    
    // Also mark as not viewed by staff yet
    const viewedField = type === 'reception' ? 'receptionSignatureViewed' : 'deliverySignatureViewed';

    await docRef.update({
      [fieldToUpdate]: signatureDataUrl,
      [viewedField]: false, 
    });
    
    return { success: true, message: 'Firma guardada con éxito.' };
  } catch (error) {
    console.error('Error saving signature to Firestore:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
    return { success: false, message: `No se pudo guardar la firma en el servidor. Error: ${errorMessage}` };
  }
}
