
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@root/lib/firebaseClient.js';
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
    const dbPath = 'database/main';
    const mainDbRef = doc(db, dbPath);
    const mainDbSnap = await getDoc(mainDbRef);

    if (!mainDbSnap.exists()) {
        return { success: false, message: 'La base de datos principal no fue encontrada.' };
    }
    
    const mainDbData = mainDbSnap.data();
    const allServices: ServiceRecord[] = mainDbData.serviceRecords || [];

    // --- 1. Update the main database document ---
    const serviceIndex = allServices.findIndex(s => s.publicId === publicId);
    
    if (serviceIndex === -1) {
      return { success: false, message: 'Servicio no encontrado en la base de datos principal.' };
    }

    const serviceToUpdate = allServices[serviceIndex];

    if (signatureType === 'reception') {
      serviceToUpdate.customerSignatureReception = signatureDataUrl;
      serviceToUpdate.receptionSignatureViewed = false; // Mark as unread
    } else {
      serviceToUpdate.customerSignatureDelivery = signatureDataUrl;
      serviceToUpdate.deliverySignatureViewed = false; // Mark as unread
    }

    // Update the service record in the array
    allServices[serviceIndex] = serviceToUpdate;

    // Persist only the serviceRecords array back to the main document
    await setDoc(mainDbRef, { serviceRecords: allServices }, { merge: true });


    // --- 2. Update the separate public document ---
    const publicDocRef = doc(db, 'publicServices', publicId);
    const publicDocSnap = await getDoc(publicDocRef);
    if (!publicDocSnap.exists()) {
        // This is a less critical error, the main DB is updated. We can log it.
        console.warn(`Public document ${publicId} not found, but main DB was updated.`);
    } else {
        const updateData: Partial<ServiceRecord> = {};
        if (signatureType === 'reception') {
          updateData.customerSignatureReception = signatureDataUrl;
        } else {
          updateData.customerSignatureDelivery = signatureDataUrl;
        }
        await setDoc(publicDocRef, updateData, { merge: true });
    }

    // --- 3. Revalidate Path ---
    revalidatePath(`/s/${publicId}`);

    return { success: true, message: 'Firma guardada exitosamente.' };
  } catch (error) {
    console.error('Error saving signature:', error);
    return { success: false, message: 'Ocurrió un error en el servidor al guardar la firma.' };
  }
}
