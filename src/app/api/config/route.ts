// src/app/api/config/route.ts
import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FIRESTORE_DOC_ID = 'main';

export async function GET() {
  try {
    const db = getAdminDb();
    const configRef = doc(db, 'workshopConfig', FIRESTORE_DOC_ID);
    const docSnap = await getDoc(configRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ message: 'Configuración no encontrada.' }, { status: 404 });
    }

    return NextResponse.json(docSnap.data(), { status: 200 });
  } catch (error) {
    console.error('Error fetching workshop config:', error);
    const msg = error instanceof Error ? error.message : 'Ocurrió un error desconocido en el servidor.';
    return NextResponse.json({ error: 'Failed to fetch config', details: msg }, { status: 500 });
  }
}
