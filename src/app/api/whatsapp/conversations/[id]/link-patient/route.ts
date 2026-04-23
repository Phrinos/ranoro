/**
 * API: Link / Unlink Patient from Conversation
 * POST  /api/whatsapp/conversations/[id]/link-patient — Link a patient
 * DELETE /api/whatsapp/conversations/[id]/link-patient — Unlink a patient
 *
 * Supports up to 6 linked patients per conversation (for families with many children).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const MAX_LINKED_PATIENTS = 6;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { patientId, patientName, tutorPhone } = body;

    if (!patientId || !patientName) {
      return NextResponse.json({ error: 'patientId and patientName are required' }, { status: 400 });
    }

    const db = getAdminDb();
    const convRef = db.collection('whatsapp-conversations').doc(id);
    const convSnap = await convRef.get();

    if (!convSnap.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const data = convSnap.data() || {};
    const current: Array<{ id: string; name: string }> = data.linkedPatients || [];

    // Check if already linked
    if (current.some(p => p.id === patientId)) {
      return NextResponse.json({ ok: true, message: 'Patient already linked', linkedPatients: current });
    }

    // Enforce max limit
    if (current.length >= MAX_LINKED_PATIENTS) {
      return NextResponse.json({
        error: `Maximum of ${MAX_LINKED_PATIENTS} patients per conversation reached`,
      }, { status: 400 });
    }

    const newEntry = { id: patientId, name: patientName };
    const updates: Record<string, any> = {
      linkedPatients: FieldValue.arrayUnion(newEntry),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Also save tutorPhone if provided and not already set
    if (tutorPhone && !data.tutorPhone) {
      updates.tutorPhone = tutorPhone;
    }

    await convRef.set(updates, { merge: true });

    return NextResponse.json({ ok: true, linkedPatients: [...current, newEntry] });
  } catch (e: any) {
    console.error('[Sof-IA] POST link-patient error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { patientId, patientName } = body;

    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const convRef = db.collection('whatsapp-conversations').doc(id);

    // FieldValue.arrayRemove requires the exact object — we fetch to find it
    const snap = await convRef.get();
    const current: Array<{ id: string; name: string }> = snap.data()?.linkedPatients || [];
    const toRemove = current.find(p => p.id === patientId);

    if (!toRemove) {
      return NextResponse.json({ ok: true, message: 'Patient not linked' });
    }

    await convRef.set({
      linkedPatients: FieldValue.arrayRemove(toRemove),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ ok: true, linkedPatients: current.filter(p => p.id !== patientId) });
  } catch (e: any) {
    console.error('[Sof-IA] DELETE link-patient error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
