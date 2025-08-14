
'use server';

import { getAdminDb } from '@/lib/firebaseAdmin';
import { doc, updateDoc, getDoc, DocumentData } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import type { ServiceRecord } from '@/types';
import { cleanObjectForFirestore } from '@/lib/forms';

export async function scheduleAppointmentAction(
  publicId: string,
  appointmentDateTime: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!publicId || !appointmentDateTime) {
      throw new Error('Información de cita inválida.');
    }

    const db = getAdminDb();
    const publicDocRef = doc(db, 'publicServices', publicId);
    const mainDocRef = doc(db, 'serviceRecords', publicId);

    const mainDocSnap = await getDoc(mainDocRef);
    if (!mainDocSnap.exists()) {
      return { success: false, error: 'El servicio solicitado no existe.' };
    }
    const serviceData = mainDocSnap.data() as ServiceRecord;
    if (serviceData.status !== 'Cotizacion') {
      return { success: false, error: 'Este servicio ya no se puede agendar.' };
    }
    
    const updatedData: Partial<ServiceRecord> = {
      status: 'Agendado',
      subStatus: 'Sin Confirmar', 
      appointmentDateTime: new Date(appointmentDateTime).toISOString(),
      appointmentStatus: 'Sin Confirmar', 
    };

    const batch = db.batch();
    const cleanedData = cleanObjectForFirestore(updatedData);

    batch.update(mainDocRef, cleanedData);
    
    const publicDocSnap = await getDoc(publicDocRef);
    if(publicDocSnap.exists()) {
        batch.update(publicDocRef, cleanedData);
    }

    await batch.commit();

    revalidatePath(`/s/${publicId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error scheduling appointment:', error);
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, error: message };
  }
}

export async function cancelAppointmentAction(publicId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!publicId) {
      throw new Error('ID de servicio inválido.');
    }
    const db = getAdminDb();
    const publicDocRef = doc(db, 'publicServices', publicId);
    const mainDocRef = doc(db, 'serviceRecords', publicId);

    const updateData = { appointmentStatus: 'Cancelada' as const, status: 'Cancelado' as const, cancellationReason: 'Cancelado por el cliente' };

    const batch = db.batch();
    batch.update(mainDocRef, updateData);
    batch.update(publicDocRef, updateData);
    await batch.commit();

    revalidatePath(`/s/${publicId}`);

    return { success: true };
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, error: message };
  }
}


export async function confirmAppointmentAction(publicId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();

    if (!publicId) {
      throw new Error('Falta el ID del servicio.');
    }

    const serviceDocRef = doc(db, 'serviceRecords', publicId);
    const serviceDoc = await getDoc(serviceDocRef);

    if (!serviceDoc.exists()) {
      return { success: false, error: 'El servicio no fue encontrado.' };
    }

    const data = serviceDoc.data() || {};
    const status = String(data.status || '').toLowerCase();
    const appt = String(data.appointmentStatus || '').toLowerCase();

    if (!(status === 'agendado' && appt === 'sin confirmar')) {
      return { success: false, error: 'Esta cita no se puede confirmar o ya fue confirmada.' };
    }

    const updateData = { appointmentStatus: 'Confirmada' as const, subStatus: 'Confirmada' as const };
    const batch = db.batch();
    batch.update(serviceDocRef, updateData);

    const publicDocRef = doc(db, 'publicServices', publicId);
    const publicDocSnap = await publicDocRef.get();
    if (publicDocSnap.exists) {
      batch.update(publicDocRef, updateData);
    }

    await batch.commit();
    revalidatePath(`/s/${publicId}`);
    return { success: true, message: 'Cita confirmada correctamente.' };
  } catch (e) {
    const err = e as Error;
    console.error('Error confirming appointment:', err);
    return { success: false, error: err.message };
  }
}
