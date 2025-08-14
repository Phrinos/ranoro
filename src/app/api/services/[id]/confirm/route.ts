// src/app/api/services/[id]/confirm/route.ts
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * Handles the POST request to confirm a service appointment.
 * This is a secure endpoint that runs on the server with admin privileges.
 * It expects the service ID to be part of the URL path.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getAdminDb();
    const publicId = params.id;

    if (!publicId) {
      return NextResponse.json({ success: false, error: 'Falta el ID del servicio.' }, { status: 400 });
    }

    const serviceDocRef = db.collection('serviceRecords').doc(publicId);
    const serviceDoc = await serviceDocRef.get();

    if (!serviceDoc.exists) {
        return NextResponse.json({ success: false, error: 'El servicio no fue encontrado.' }, { status: 404 });
    }

    const serviceData = serviceDoc.data()!;

    if (serviceData.status !== 'Agendado' || serviceData.appointmentStatus !== 'Sin Confirmar') {
        return NextResponse.json({ success: false, error: 'Esta cita no se puede confirmar o ya fue confirmada.' }, { status: 409 });
    }

    const updateData = {
        appointmentStatus: 'Confirmada',
    };

    const batch = db.batch();

    batch.update(serviceDocRef, updateData);

    const publicDocRef = db.collection('publicServices').doc(publicId);
    // Check if public doc exists before trying to update it
    const publicDocSnap = await publicDocRef.get();
    if(publicDocSnap.exists()) {
        batch.update(publicDocRef, updateData);
    }
    
    await batch.commit();

    return NextResponse.json({ success: true, message: 'Cita confirmada correctamente.' });

  } catch (error) {
    console.error('Error al confirmar la cita:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido en el servidor.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
