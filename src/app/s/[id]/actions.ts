
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebasePublic.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    // This server action, callable from a public URL, should ONLY interact with the public document.
    // It must not attempt to read or write to the main private database document.
    const publicDocRef = doc(db, 'publicServices', publicId);

    // First, check if the document exists. This read is public.
    const publicDocSnap = await getDoc(publicDocRef);
    if (!publicDocSnap.exists()) {
      return { success: false, message: 'El documento público del servicio no fue encontrado.' };
    }

    const updateData: Partial<ServiceRecord> = {};
    if (signatureType === 'reception') {
      updateData.customerSignatureReception = signatureDataUrl;
      updateData.receptionSignatureViewed = false; // Mark as unread for admin notifications
    } else {
      updateData.customerSignatureDelivery = signatureDataUrl;
      updateData.deliverySignatureViewed = false; // Mark as unread for admin notifications
    }

    // Now, perform the update. Firestore rules must allow this specific, limited write.
    await setDoc(publicDocRef, updateData, { merge: true });

    // Revalidate the public path so the client sees the new signature.
    revalidatePath(`/s/${publicId}`);

    return { success: true, message: 'Firma guardada exitosamente.' };
  } catch (error) {
    console.error('Error saving signature:', error);
    // Provide a more generic error to the user for security.
    return { success: false, message: 'Ocurrió un error en el servidor al guardar la firma.' };
  }
}
