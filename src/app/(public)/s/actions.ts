
// src/app/(public)/s/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type { ServiceRecord } from '@/types';
import { cleanObjectForFirestore } from '@/lib/forms';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Finds the main service record document ID based on its public ID.
 * This is the definitive method for resolving a public ID to its source document.
 * @param db - The Firestore admin instance.
 * @param publicId - The public ID of the service from the URL.
 * @returns The ID of the main document from the 'serviceRecords' collection, or null if not found.
 */
const getMainDocIdFromPublicId = async (db: FirebaseFirestore.Firestore, publicId: string): Promise<string | null> => {
    if (!publicId) {
      console.error("getMainDocIdFromPublicId called with no publicId.");
      return null;
    }
    
    // First, get the public document to find the main document ID.
    const publicDocRef = db.collection('publicServices').doc(publicId);
    const publicDocSnap = await publicDocRef.get();

    if (!publicDocSnap.exists()) {
        console.warn(`Public document with ID ${publicId} not found.`);
        // Fallback: Query the main collection directly. This is less efficient but robust.
        const query = db.collection('serviceRecords').where('publicId', '==', publicId).limit(1);
        const querySnap = await query.get();
        if (!querySnap.empty) {
            console.log(`Fallback successful for publicId ${publicId}. Found main doc ${querySnap.docs[0].id}`);
            return querySnap.docs[0].id;
        }
        return null;
    }
    
    const publicData = publicDocSnap.data();
    return publicData?.mainId || null;
};


export async function saveSignatureAction(
  publicId: string,
  signatureDataUrl: string,
  signatureType: 'reception' | 'delivery'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!publicId || !signatureDataUrl || !signatureType) {
      throw new Error('Faltan datos para guardar la firma.');
    }
    
    const db = getAdminDb();
    const mainDocId = await getMainDocIdFromPublicId(db, publicId);
    if (!mainDocId) throw new Error("Documento de servicio principal no encontrado.");

    const mainRef = db.collection('serviceRecords').doc(mainDocId);
    const publicRef = db.collection('publicServices').doc(publicId);

    const fieldToUpdate = signatureType === 'reception' 
      ? 'customerSignatureReception' 
      : 'customerSignatureDelivery';

    const updatePayload = {
      [fieldToUpdate]: signatureDataUrl,
    };
    
    const batch = db.batch();
    
    batch.update(mainRef, updatePayload);
    
    // The public document doesn't store signatures, so no update needed there.
    
    await batch.commit();

    revalidatePath(`/s/${publicId}`);
    return { success: true };

  } catch (error: any) {
    console.error(`Error saving signature for ${publicId}:`, error);
    return { success: false, error: error?.message ?? 'Error desconocido al guardar la firma.' };
  }
}

export async function scheduleAppointmentAction(
  publicId: string,
  appointmentDateTime: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!publicId || !appointmentDateTime) throw new Error('Información de cita inválida.');

    const db = getAdminDb();
    const mainDocId = await getMainDocIdFromPublicId(db, publicId);
    if (!mainDocId) throw new Error("Documento de servicio principal no encontrado.");

    const mainRef  = db.collection('serviceRecords').doc(mainDocId);
    const publicRef = db.collection('publicServices').doc(publicId);

    const mainSnap = await mainRef.get();
    if (!mainSnap.exists) return { success: false, error: 'El servicio solicitado no existe.' };

    const serviceData = mainSnap.data() as ServiceRecord;
    if (serviceData.status !== 'Cotizacion') {
      return { success: false, error: 'Este servicio ya no se puede agendar.' };
    }

    const updated: Partial<ServiceRecord> = {
      status: 'Agendado',
      subStatus: 'Sin Confirmar',
      appointmentDateTime: new Date(appointmentDateTime).toISOString(),
    };

    const batch = db.batch();
    const payload = cleanObjectForFirestore(updated);

    batch.update(mainRef, payload);

    const publicSnap = await publicRef.get();
    if (publicSnap.exists) batch.update(publicRef, { status: updated.status, appointmentDateTime: updated.appointmentDateTime });

    await batch.commit();
    revalidatePath(`/s/${publicId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error scheduling appointment:', error);
    return { success: false, error: error?.message ?? 'Ocurrió un error desconocido.' };
  }
}

export async function cancelAppointmentAction(
  publicId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!publicId) throw new Error('ID de servicio inválido.');

    const db = getAdminDb();
    const mainDocId = await getMainDocIdFromPublicId(db, publicId);
    if (!mainDocId) throw new Error("Documento de servicio principal no encontrado.");

    const mainRef  = db.collection('serviceRecords').doc(mainDocId);
    const publicRef = db.collection('publicServices').doc(publicId);

    const update = {
      status: 'Cancelado' as const,
      cancellationReason: 'Cancelado por el cliente desde el enlace público',
    };

    const batch = db.batch();
    batch.update(mainRef, update);

    const publicSnap = await publicRef.get();
    if (publicSnap.exists) batch.update(publicRef, { status: update.status });
    
    await batch.commit();

    revalidatePath(`/s/${publicId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error cancelling appointment:', error);
    return { success: false, error: error?.message ?? 'Ocurrió un error desconocido.' };
  }
}

export async function confirmAppointmentAction(
  publicId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!publicId) throw new Error('Falta el ID del servicio.');

    const db = getAdminDb();
    const mainDocId = await getMainDocIdFromPublicId(db, publicId);
    if (!mainDocId) throw new Error("Documento de servicio principal no encontrado.");
    
    const mainRef = db.collection('serviceRecords').doc(mainDocId);
    const mainSnap = await mainRef.get();
    if (!mainSnap.exists) {
      return { success: false, error: 'El servicio no fue encontrado.' };
    }

    const data = mainSnap.data() as any;
    
    if (data.status !== 'Agendado' || data.subStatus !== 'Sin Confirmar') {
        return { success: false, error: 'Esta cita no se puede confirmar o ya fue confirmada.' };
    }

    const update = { subStatus: 'Confirmada' as const };

    const publicRef = db.collection('publicServices').doc(publicId);
    const publicSnap = await publicRef.get();

    const batch = db.batch();
    batch.update(mainRef, update);
    if (publicSnap.exists) batch.update(publicRef, update);

    await batch.commit();
    revalidatePath(`/s/${publicId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error confirming appointment:', error);
    return { success: false, error: error?.message ?? 'Ocurrió un error desconocido.' };
  }
}

// --- Nueva acción para obtener los datos del servicio de forma segura ---
export async function getPublicServiceData(
  publicId: string
): Promise<{ service: ServiceRecord | null; error?: string }> {
  try {
    if (!publicId) throw new Error("ID público no proporcionado.");
    
    const db = getAdminDb();
    const mainDocId = await getMainDocIdFromPublicId(db, publicId);

    if (!mainDocId) {
      return { service: null, error: `El documento con ID "${publicId}" no fue encontrado.` };
    }
    
    const mainDocSnap = await getDoc(doc(db, "serviceRecords", mainDocId));

    if (!mainDocSnap.exists()) {
       return { service: null, error: `El documento con ID "${publicId}" no fue encontrado.` };
    }
    
    return { service: mainDocSnap.data() as ServiceRecord };

  } catch (error: any) {
    console.error("Error in getPublicServiceData:", error);
    return { service: null, error: error?.message || "Ocurrió un error al cargar el documento." };
  }
}
