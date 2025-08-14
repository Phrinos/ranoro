
// src/app/api/services/[id]/confirm/route.ts
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const db = getAdminDb();

    const publicId = params.id?.trim();
    if (!publicId) {
      return NextResponse.json({ success: false, error: 'Falta el ID del servicio.' }, { status: 400 });
    }

    const serviceDocRef = db.collection('serviceRecords').doc(publicId);
    const serviceDoc = await serviceDocRef.get();

    if (!serviceDoc.exists) {
      return NextResponse.json({ success: false, error: 'El servicio no fue encontrado.' }, { status: 404 });
    }

    const data = serviceDoc.data() || {};
    const status = String(data.status || '').toLowerCase();
    const appt   = String(data.appointmentStatus || '').toLowerCase();

    if (!(status === 'agendado' && appt === 'sin confirmar')) {
      return NextResponse.json(
        { success: false, error: 'Esta cita no se puede confirmar o ya fue confirmada.' },
        { status: 409 }
      );
    }

    const updateData = { appointmentStatus: 'Confirmada' };
    const batch = db.batch();
    batch.update(serviceDocRef, updateData);

    const publicDocRef = db.collection('publicServices').doc(publicId);
    const publicDocSnap = await publicDocRef.get();
    if (publicDocSnap.exists) {
      batch.update(publicDocRef, updateData);
    }

    await batch.commit();
    return NextResponse.json({ success: true, message: 'Cita confirmada correctamente.' });
  } catch (e) {
    const err = e as Error;
    // En dev te devuelve pista suficiente sin filtrar secretos
    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json(
      { success: false, error: err.message, ...(isDev && { hasKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY }) },
      { status: 500 }
    );
  }
}
