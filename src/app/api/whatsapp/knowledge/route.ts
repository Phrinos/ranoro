/**
 * API: WhatsApp Knowledge Base
 * GET  /api/whatsapp/knowledge — Returns current knowledge base content
 * POST /api/whatsapp/knowledge — Saves new knowledge base content
 * POST /api/whatsapp/knowledge?action=invalidate-cache — Invalidates bot cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';


const DOC_PATH = { collection: 'settings', doc: 'whatsapp-knowledge' };

// ── GET ───────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection(DOC_PATH.collection).doc(DOC_PATH.doc).get();
    if (!snap.exists) {
      return NextResponse.json({ content: '', structured: null });
    }
    const data = snap.data() || {};
    return NextResponse.json({
      content: data.content || '',
      structured: data.structured || null,
      updatedAt: data.updatedAt || null,
    });
  } catch (e: any) {
    console.error('[Sof-IA] GET knowledge error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action');

    // Invalidate cache only (called after save to make bot pick up changes)
    if (action === 'invalidate-cache') {
      return NextResponse.json({ ok: true, message: 'Knowledge cache invalidated.' });
    }

    const body = await req.json();
    const { content, structured, followUp } = body;

    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'content must be a string' }, { status: 400 });
    }

    const db = getAdminDb();
    const saveData: Record<string, any> = {
      content,
      structured: structured || null,
      updatedAt: new Date().toISOString(),
    };

    // Save followUp config if provided (used by reminders/route.ts)
    if (followUp && typeof followUp === 'object') {
      saveData.followUp = followUp;
    }

    await db.collection(DOC_PATH.collection).doc(DOC_PATH.doc).set(saveData, { merge: true });



    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[Sof-IA] POST knowledge error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

