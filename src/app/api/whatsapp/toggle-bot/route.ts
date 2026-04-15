/**
 * POST /api/whatsapp/toggle-bot
 *
 * Toggles humanTakeover for a specific WhatsApp conversation.
 * Used by the admin panel's NotificationBell component.
 * Uses Firebase Admin SDK (bypasses Firestore security rules).
 *
 * Body: { conversationId: string, action: 'pause' | 'resume' }
 */

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, action } = body;

    if (!conversationId || !['pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { error: 'Missing conversationId or invalid action (pause|resume)' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const convRef = adminDb.collection('whatsapp-conversations').doc(conversationId);

    if (action === 'pause') {
      await convRef.set({
        humanTakeover: true,
        humanTakeoverAt: FieldValue.serverTimestamp(),
        needsAttention: true,
        escalationReason: 'Pausado manualmente desde el panel',
      }, { merge: true });
      console.log(`[SinergIA] 🔴 Bot PAUSED for ${conversationId} (admin panel)`);
    } else {
      await convRef.set({
        humanTakeover: false,
        needsAttention: false,
      }, { merge: true });
      // Also ensure global config.enabled is true
      await adminDb.collection('settings').doc('whatsapp-agent').update({ enabled: true }).catch(() => {});
      console.log(`[SinergIA] 🟢 Bot RESUMED for ${conversationId} (admin panel)`);
    }

    return NextResponse.json({ success: true, action, conversationId });
  } catch (error: any) {
    console.error('[SinergIA] toggle-bot error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
