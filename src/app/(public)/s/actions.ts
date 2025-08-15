
// src/app/(public)/s/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type { ServiceRecord } from '@/types';
import { cleanObjectForFirestore } from '@/lib/forms';

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
    const mainRef = db.collection('serviceRecords').doc(publicId);
    const publicRef = db.collection('publicServices').doc(publicId);

    const fieldToUpdate = signatureType === 'reception' 
      ? 'customerSignatureReception' 
      : 'customerSignatureDelivery';

    const updatePayload = {
      [fieldToUpdate]: signatureDataUrl,
    };
    
    const batch = db.batch();
    
    // Update the main service record
    batch.update(mainRef, updatePayload);
    
    // Update the public-facing service record if it exists
    const publicSnap = await publicRef.get();
    if (publicSnap.exists) {
      batch.update(publicRef, updatePayload);
    }
    
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
    const mainRef  = db.collection('serviceRecords').doc(publicId);
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
      appointmentStatus: 'Sin Confirmar',
    };

    const batch = db.batch();
    const payload = cleanObjectForFirestore(updated);

    batch.update(mainRef, payload);

    const publicSnap = await publicRef.get();
    if (publicSnap.exists) batch.update(publicRef, payload);

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
    const mainRef  = db.collection('serviceRecords').doc(publicId);
    const publicRef = db.collection('publicServices').doc(publicId);

    const update = {
      appointmentStatus: 'Cancelada' as const,
      status: 'Cancelado' as const,
      cancellationReason: 'Cancelado por el cliente',
    };

    const batch = db.batch();
    batch.update(mainRef, update);
    batch.update(publicRef, update);
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
    const mainRef = db.collection('serviceRecords').doc(publicId);
    const mainSnap = await mainRef.get();
    if (!mainSnap.exists) return { success: false, error: 'El servicio no fue encontrado.' };

    const data = mainSnap.data() as any;
    const status = String(data.status || '').toLowerCase();
    const appt   = String(data.appointmentStatus || '').toLowerCase();

    if (!(status === 'agendado' && appt === 'sin confirmar')) {
      return { success: false, error: 'Esta cita no se puede confirmar o ya fue confirmada.' };
    }

    const update = { appointmentStatus: 'Confirmada' as const, subStatus: 'Confirmada' as const };

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
