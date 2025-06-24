
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

    // Persist only the serviceRecords array to avoid overwriting other data
    await persistToFirestore(['serviceRecords']);

    // --- 2. Update the separate public document ---
    const publicDocRef = doc(db, 'publicServices', publicId);
    const publicDocSnap = await getDoc(publicDocRef);
    if (!publicDocSnap.exists()) {
        return { success: false, message: 'El documento público del servicio no existe.' };
    }
    
    const updateData: Partial<ServiceRecord> = {};
    if (signatureType === 'reception') {
      updateData.customerSignatureReception = signatureDataUrl;
    } else {
      updateData.customerSignatureDelivery = signatureDataUrl;
    }
    await setDoc(publicDocRef, updateData, { merge: true });


    // --- 3. Revalidate Path ---
    revalidatePath(`/s/${publicId}`);

    return { success: true, message: 'Firma guardada exitosamente.' };
  } catch (error) {
    console.error('Error saving signature:', error);
    return { success: false, message: 'Ocurrió un error en el servidor al guardar la firma.' };
  }
}
