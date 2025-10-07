
// src/app/api/services/[id]/confirm/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';         // Admin SDK => Node runtime
export const dynamic = 'force-dynamic';  // opcional: evita cacheos

// --- Firebase Admin SDK Initialization ---
if (!getApps().length) {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!sa) {
    // Falla temprano si falta la credencial
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY no está configurada');
  }
  const serviceAccount = JSON.parse(sa);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

type RouteCtx = { params: { id: string } };

export async function POST(req: Request, { params }: RouteCtx) {
  try {
    const publicId = params?.id?.trim();
    if (!publicId) {
      return NextResponse.json(
        { success: false, error: 'Falta el ID del servicio.' },
        { status: 400 }
      );
    }

    // 1) Carga del servicio
    const serviceDocRef = db.collection('serviceRecords').doc(publicId);
    const serviceSnap = await serviceDocRef.get();

    if (!serviceSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'El servicio no fue encontrado.' },
        { status: 404 }
      );
    }

    const serviceData = serviceSnap.data()!;

    // 2) Validación de estado
    if (
      serviceData.status !== 'Agendado' ||
      serviceData.appointmentStatus !== 'Sin Confirmar'
    ) {
      return NextResponse.json(
        { success: false, error: 'Esta cita no se puede confirmar o ya fue confirmada.' },
        { status: 409 }
      );
    }

    const updateData = { appointmentStatus: 'Confirmada' as const };

    // 3) Escritura atómica
    const batch = db.batch();
    batch.update(serviceDocRef, updateData);

    // Si el doc público no existe, update fallaría -> usamos set con merge
    const publicDocRef = db.collection('publicServices').doc(publicId);
    batch.set(publicDocRef, updateData, { merge: true });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: 'Cita confirmada correctamente.',
    });
  } catch (error) {
    console.error('Error al confirmar la cita:', error);
    const msg =
      error instanceof Error
        ? error.message
        : 'Ocurrió un error desconocido en el servidor.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
