
'use server';

import { getAdminDb } from '@/lib/firebaseAdmin';
import { doc, updateDoc } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import type { ServiceRecord } from '@/types';

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
    
    const updatedData: Partial<ServiceRecord> = {
      status: 'Agendado',
      subStatus: 'Sin Confirmar', 
      appointmentDateTime: new Date(appointmentDateTime).toISOString(),
      appointmentStatus: 'Sin Confirmar', 
    };

    const batch = db.batch();
    batch.update(mainDocRef, updatedData);
    batch.update(publicDocRef, updatedData);
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

    const updateData = { appointmentStatus: 'Cancelada' as const };

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
