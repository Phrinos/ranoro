
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@root/lib/firebaseClient.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { placeholderServiceRecords, persistToFirestore } from '@/lib/placeholder-data';
import type { ServiceRecord } from '@/types';

type SignatureType = 'reception' | 'delivery';

export async function saveSignature(
  publicId: string,
  signatureDataUrl: string,
  signatureType: SignatureType
): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: 'La base de datos no está configurada.' };
  }

  try {
    // --- 1. Update the main database document ---
    // Note: In a real high-concurrency app, this read-modify-write is not ideal.
    // A transactional update or a more granular database structure would be better.
    const serviceIndex = placeholderServiceRecords.findIndex(s => s.publicId === publicId);
    
    if (serviceIndex === -1) {
      return { success: false, message: 'Servicio no encontrado en la base de datos principal.' };
    }

    const serviceToUpdate = placeholderServiceRecords[serviceIndex];

    if (signatureType === 'reception') {
      serviceToUpdate.customerSignatureReception = signatureDataUrl;
      serviceToUpdate.receptionSignatureViewed = false; // Mark as unread
    } else {
      serviceToUpdate.customerSignatureDelivery = signatureDataUrl;
      serviceToUpdate.deliverySignatureViewed = false; // Mark as unread
    }

    // Persist the entire updated array back to the single document
    await persistToFirestore();

    // --- 2. Update the separate public document ---
    const publicDocRef = doc(db, 'publicServices', publicId);
    const publicDocSnap = await getDoc(publicDocRef);
    if (!publicDocSnap.exists()) {
        // This is a fallback. The public doc should ideally always exist if the page is viewable.
        return { success: false, message: 'El documento público del servicio no existe.' };
    }
    const publicData = publicDocSnap.data() as ServiceRecord;
    if (signatureType === 'reception') {
      publicData.customerSignatureReception = signatureDataUrl;
    } else {
      publicData.customerSignatureDelivery = signatureDataUrl;
    }
    await setDoc(publicDocRef, publicData, { merge: true });


    // --- 3. Revalidate Path ---
    // This tells Next.js to regenerate the page on the next visit.
    revalidatePath(`/s/${publicId}`);

    return { success: true, message: 'Firma guardada exitosamente.' };
  } catch (error) {
    console.error('Error saving signature:', error);
    return { success: false, message: 'Ocurrió un error en el servidor al guardar la firma.' };
  }
}
