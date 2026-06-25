/**
 * SinergIA WhatsApp Agent — Purge Conversations Endpoint
 * DELETE /api/whatsapp/purge
 *
 * Deletes all whatsapp-conversations and their messages subcollection.
 * Used to clean up stale/broken conversation data and start fresh.
 *
 * SECURITY: Requires the same x-api-key header used by the webhook.
 * SAFETY: Also requires ?confirm=yes query parameter.
 */

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { authGuard } from '@/lib/server-auth';
import { FieldValue } from 'firebase-admin/firestore';
import type { WhatsAppAgentConfig } from '@/types';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  const adminDb = getAdminDb();
  try {
    const configSnap = await adminDb.collection('settings').doc('whatsapp-agent').get();
    if (!configSnap.exists) {
      return NextResponse.json(
        { error: 'WhatsApp agent not configured' },
        { status: 503 }
      );
    }
    const config = configSnap.data() as WhatsAppAgentConfig;

    // ── 1. Operación destructiva: exige Superadministrador (Bearer) o x-api-key de servicio (timing-safe) ──
    const guard = await authGuard(request, { minRole: 'superadmin', apiKey: config.webhookSecret });
    if ('response' in guard) return guard.response;

    // ── 2. Require explicit confirmation ──
    const url = new URL(request.url);
    const confirmParam = url.searchParams.get('confirm');
    if (confirmParam !== 'yes') {
      return NextResponse.json(
        { error: 'Add ?confirm=yes to confirm purge' },
        { status: 400 }
      );
    }

    // ── Audit log previo a la operación destructiva ──
    await adminDb.collection('auditLogs').add({
      action: 'whatsapp.purge',
      actorUid: guard.actor.uid,
      actorRole: guard.actor.role,
      timestamp: FieldValue.serverTimestamp(),
    }).catch((e) => console.error('[SinergIA Purge] audit log failed:', e));

    // ── 3. Execute purge ──
    const conversationsRef = adminDb.collection('whatsapp-conversations');
    const snapshot = await conversationsRef.get();

    if (snapshot.empty) {
      return NextResponse.json({ message: 'No conversations to delete', deleted: 0 });
    }

    let totalDeleted = 0;
    let messagesDeleted = 0;

    for (const doc of snapshot.docs) {
      // Delete all messages in subcollection first
      const messagesSnap = await doc.ref.collection('messages').get();
      const batch = adminDb.batch();

      for (const msgDoc of messagesSnap.docs) {
        batch.delete(msgDoc.ref);
        messagesDeleted++;
      }

      // Delete the conversation doc itself
      batch.delete(doc.ref);
      totalDeleted++;

      await batch.commit();
    }

    console.log(`[SinergIA Purge] ✅ Purged ${totalDeleted} conversations, ${messagesDeleted} messages at ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      messagesDeleted,
      message: `Purged ${totalDeleted} conversations and ${messagesDeleted} messages`,
    });

  } catch (error: any) {
    console.error('[SinergIA Purge] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
