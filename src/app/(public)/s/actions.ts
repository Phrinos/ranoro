
'use server';

import { db } from '@/lib/firebasePublic';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
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

    const docRef = doc(db, 'publicServices', publicId);
    
    const updatedData: Partial<ServiceRecord> = {
      status: 'Agendado',
      appointmentDateTime: new Date(appointmentDateTime).toISOString(),
      appointmentStatus: 'Sin Confirmar', 
    };

    await updateDoc(docRef, updatedData);

    // Also update the main service record
    const mainDocRef = doc(db, 'serviceRecords', publicId);
    await updateDoc(mainDocRef, updatedData);

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
    const docRef = doc(db, 'publicServices', publicId);
    const mainDocRef = doc(db, 'serviceRecords', publicId);

    const updateData = { appointmentStatus: 'Cancelada' as const };

    await updateDoc(docRef, updateData);
    await updateDoc(mainDocRef, updateData);

    revalidatePath(`/s/${publicId}`);

    return { success: true };
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, error: message };
  }
}

