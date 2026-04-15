/**
 * SinergIA WhatsApp Send API
 * POST /api/whatsapp/send
 *
 * Sends a message to a WhatsApp number via the Baileys server.
 * Used by: admin panel manual messages, 503 retry wait notifications, reminders.
 */

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

interface WhatsAppSendConfig {
  baileysHost: string;
  baileysPort: string;
  baileysSessionId: string;
  baileysAdminUser?: string;
  baileysAdminPassword?: string;
  defaultCountryCode: string;
  webhookSecret?: string;
}

async function loadSendConfig(): Promise<WhatsAppSendConfig | null> {
  const adminDb = getAdminDb();
  try {
    const snap = await adminDb.collection('settings').doc('whatsapp-agent').get();
    if (!snap.exists) return null;
    return snap.data() as WhatsAppSendConfig;
  } catch (e) {
    console.error('[SinergIA Send] Error loading config:', e);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const config = await loadSendConfig();
    if (!config) {
      return NextResponse.json({ error: 'WhatsApp agent not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json({ error: 'Missing phone or message' }, { status: 400 });
    }

    // Clean phone
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    // Resolve rawJid from conversation record (needed for Baileys LID routing)
    const adminDb = getAdminDb();
    let targetJid = `${cleanPhone}@s.whatsapp.net`;

    try {
      const convSnap = await adminDb.collection('whatsapp-conversations').doc(cleanPhone).get();
      if (convSnap.exists) {
        const data = convSnap.data();
        if (data?.rawJid) {
          targetJid = data.rawJid;
        }
      }
    } catch (e) {
      console.error('[SinergIA Send] Error resolving rawJid:', e);
    }

    // Build Baileys API URL
    const baseUrl = `http://${config.baileysHost}:${config.baileysPort}`;
    const sessionId = config.baileysSessionId;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add basic auth if configured
    if (config.baileysAdminUser && config.baileysAdminPassword) {
      const auth = Buffer.from(`${config.baileysAdminUser}:${config.baileysAdminPassword}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const baileysResponse = await fetch(`${baseUrl}/message/send?id=${sessionId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jid: targetJid,
        type: 'text',
        message,
      }),
    });

    if (!baileysResponse.ok) {
      const errorText = await baileysResponse.text();
      console.error('[SinergIA Send] Baileys error:', errorText);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Save sent message to conversation history
    try {
      const convRef = adminDb.collection('whatsapp-conversations').doc(cleanPhone);
      await convRef.collection('messages').add({
        role: 'assistant',
        content: message,
        timestamp: FieldValue.serverTimestamp(),
      });
      await convRef.set({
        lastMessageAt: FieldValue.serverTimestamp(),
        totalMessages: FieldValue.increment(1),
      }, { merge: true });
    } catch (e) {
      console.error('[SinergIA Send] Error saving sent message:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[SinergIA Send] Error:', error?.message || error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
