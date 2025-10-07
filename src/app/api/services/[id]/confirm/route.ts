
// src/app/api/services/[id]/confirm/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- Firebase Admin SDK Initialization ---
try {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

const db = getFirestore();

/**
 * Handles the POST request to confirm a service appointment.
 * This is a secure endpoint that runs on the server with admin privileges.
 * It expects the service ID to be part of the URL path.
 */
export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const publicId = context.params.id;

    // 1. Validate the incoming data
    if (!publicId) {
      return NextResponse.json({ success: false, error: 'Falta el ID del servicio.' }, { status: 400 });
    }

    const serviceDocRef = db.collection('serviceRecords').doc(publicId);
    const serviceDoc = await serviceDocRef.get();

    if (!serviceDoc.exists) {
        return NextResponse.json({ success: false, error: 'El servicio no fue encontrado.' }, { status: 404 });
    }

    const serviceData = serviceDoc.data()!;

    // 2. Verify that the service is in a confirmable state
    if (serviceData.status !== 'Agendado' || serviceData.appointmentStatus !== 'Sin Confirmar') {
        return NextResponse.json({ success: false, error: 'Esta cita no se puede confirmar o ya fue confirmada.' }, { status: 409 }); // 409 Conflict
    }

    const updateData = {
        appointmentStatus: 'Confirmada',
    };

    // 3. Use a batch write to update both documents atomically
    const batch = db.batch();

    // Update the main, internal service record
    batch.update(serviceDocRef, updateData);

    // Update the public-facing document
    const publicDocRef = db.collection('publicServices').doc(publicId);
    batch.update(publicDocRef, updateData);

    // 4. Commit the atomic write
    await batch.commit();

    return NextResponse.json({ success: true, message: 'Cita confirmada correctamente.' });

  } catch (error) {
    console.error('Error al confirmar la cita:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido en el servidor.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

