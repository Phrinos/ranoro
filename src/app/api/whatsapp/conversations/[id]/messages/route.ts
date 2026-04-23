/**
 * API: Conversation Messages
 * GET /api/whatsapp/conversations/[id]/messages
 * Returns paginated messages for a conversation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);
    const before = req.nextUrl.searchParams.get('before'); // ISO timestamp for cursor

    const db = getAdminDb();
    let query = db
      .collection('whatsapp-conversations')
      .doc(id)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(Math.min(limit, 100));

    if (before) {
      query = query.startAfter(new Date(before));
    }

    const snap = await query.get();
    const messages = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })).reverse(); // Return in chronological order

    return NextResponse.json({
      messages,
      hasMore: snap.docs.length === limit,
      nextCursor: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].data().timestamp : null,
    });
  } catch (e: any) {
    console.error('[Sof-IA] GET messages error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
