/**
 * API: Link / Unlink Client from Conversation
 * POST  /api/whatsapp/conversations/[id]/link-client — Link a client
 * DELETE /api/whatsapp/conversations/[id]/link-client — Unlink a client
 *
 * Supports up to 6 linked clients per conversation (for families with many children).
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
    const { clientId, clientName, tutorPhone } = body;

    if (!clientId || !clientName) {
      return NextResponse.json({ error: 'clientId and clientName are required' }, { status: 400 });
    }

    const db = getAdminDb();
    const convRef = db.collection('whatsapp-conversations').doc(id);
    const convSnap = await convRef.get();

    if (!convSnap.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const data = convSnap.data() || {};
    const current: Array<{ id: string; name: string }> = data.linkedClients || [];

    // Check if already linked
    if (current.some(p => p.id === clientId)) {
      return NextResponse.json({ ok: true, message: 'Client already linked', linkedClients: current });
    }

    // Enforce max limit
    if (current.length >= MAX_LINKED_PATIENTS) {
      return NextResponse.json({
        error: `Maximum of ${MAX_LINKED_PATIENTS} clients per conversation reached`,
      }, { status: 400 });
    }

    const newEntry = { id: clientId, name: clientName };
    const updates: Record<string, any> = {
      linkedClients: FieldValue.arrayUnion(newEntry),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Also save tutorPhone if provided and not already set
    if (tutorPhone && !data.tutorPhone) {
      updates.tutorPhone = tutorPhone;
    }

    await convRef.set(updates, { merge: true });

    return NextResponse.json({ ok: true, linkedClients: [...current, newEntry] });
  } catch (e: any) {
    console.error('[Sof-IA] POST link-client error:', e);
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
    const { clientId, clientName } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const convRef = db.collection('whatsapp-conversations').doc(id);

    // FieldValue.arrayRemove requires the exact object — we fetch to find it
    const snap = await convRef.get();
    const current: Array<{ id: string; name: string }> = snap.data()?.linkedClients || [];
    const toRemove = current.find(p => p.id === clientId);

    if (!toRemove) {
      return NextResponse.json({ ok: true, message: 'Client not linked' });
    }

    await convRef.set({
      linkedClients: FieldValue.arrayRemove(toRemove),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ ok: true, linkedClients: current.filter(p => p.id !== clientId) });
  } catch (e: any) {
    console.error('[Sof-IA] DELETE link-client error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
