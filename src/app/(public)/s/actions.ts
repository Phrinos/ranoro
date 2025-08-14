
'use server';

import { db } from '@/lib/firebasePublic';
import { doc, updateDoc } from 'firebase/firestore';
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

    // Revalidate the public page to show the updated status
    revalidatePath(`/s/${publicId}`);
    
    // In a real app, you might revalidate an admin path as well
    // revalidatePath('/servicios'); 

    return { success: true };
  } catch (error) {
    console.error('Error scheduling appointment:', error);
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, error: message };
  }
}
