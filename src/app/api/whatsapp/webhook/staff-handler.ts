/**
 * SofIA — Staff Handler v5
 * Ranoro — Taller Mecánico Automotriz
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { buildStaffPrompt } from './system-prompt';
import { staffToolDeclarations } from './tools';
import type { WhatsAppAgentConfig } from '@/lib/types';

export interface StaffHandlerParams {
  phone: string; staffPhone: string; message: string; pushName?: string;
  audioData?: any; body: any; config: WhatsAppAgentConfig; adminDb: ReturnType<typeof getAdminDb>;
  executeTool: (name: string, args: any, config: WhatsAppAgentConfig, phone: string, ci: null) => Promise<any>;
  saveStaffMessage: (phone: string, role: 'user' | 'assistant', content: string) => Promise<void>;
  loadStaffHistory: (phone: string) => Promise<any[]>;
  formatNow: () => { today: string; currentTime: string };
  requestUrl: string;
}

function resolveGeminiKey(): string {
  let key = process.env.GEMINI_API_KEY || '';
  if (key.includes('=')) { const m = key.match(/GEMINI_API_KEY=([A-Za-z0-9_\-]+)/); if (m) key = m[1]; }
  return key.trim().replace(/^["']|["']$/g, '');
}

export async function notifyStaffOfEscalation(params: {
  patientPhone: string; patientName: string; reason: string;
  config: WhatsAppAgentConfig; requestUrl: string;
}): Promise<void> {
  const members: Array<{ uid: string; name: string; notifyEscalation?: boolean }> =
    (params.config as any).staffMembers || [];
  const targets = members.filter(m => m.notifyEscalation !== false && m.uid);
  if (targets.length === 0) { console.warn('[SofIA] No staff for escalation.'); return; }

  const msg = `🚨 *Escalamiento — Ranoro*\n\n👤 Cliente: *${params.patientName}*\n📱 Teléfono: ${params.patientPhone}\n📝 Motivo: ${params.reason}\n\nRevisa la app para atenderle.`;

  const c = params.config as any;
  const host = `${c.baileysHost}:${c.baileysPort}`;
  const sessionId = c.baileysSessionId;
  const adminPassword = c.baileysAdminPassword || '';
  if (!adminPassword || !host || !sessionId) { console.warn('[SofIA] Baileys not configured.'); return; }

  let token = '';
  try {
    const r = await fetch(`http://${host}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: c.baileysAdminUser || 'sinergia', password: adminPassword }), signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`Auth HTTP ${r.status}`);
    token = (await r.json()).token;
  } catch (e) { console.error('[SofIA] Baileys auth failed:', e); return; }

  for (const m of targets) {
    const cleanUid = m.uid.replace(/[^0-9]/g, '');
    const jid = cleanUid.length > 10 ? `${cleanUid}@lid` : `${cleanUid}@s.whatsapp.net`;
    try {
      const res = await fetch(`http://${host}/api/sessions/${sessionId}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ to: jid, message: msg }), signal: AbortSignal.timeout(10000) });
      console.log(`[SofIA] Escalation ${res.ok ? '✅' : '❌'} → ${m.name}`);
    } catch (e) { console.error(`[SofIA] Escalation for ${m.name}:`, e); }
  }
}

export async function handleStaffMessage(params: StaffHandlerParams): Promise<NextResponse> {
  const { phone, message, pushName, audioData, config, adminDb,
    executeTool, saveStaffMessage, loadStaffHistory, formatNow } = params;

  const { today, currentTime } = formatNow();
  const staffName = pushName || 'Mecánico';

  // Cancel escalation
  const cancelMatch = message.trim().match(/^cancelar\s+escalamiento\s+(.+)$/i);
  if (cancelMatch) {
    const clean = cancelMatch[1].trim().replace(/\D/g, '');
    if (clean.length >= 7) {
      try {
        await adminDb.collection('whatsapp-conversations').doc(clean).set({ humanTakeover: false, needsAttention: false }, { merge: true });
        const msg = `✅ Escalamiento cancelado para ${cancelMatch[1].trim()}. El bot retomará la conversación.`;
        await saveStaffMessage(phone, 'assistant', msg);
        return NextResponse.json({ reply: msg });
      } catch { /* noop */ }
    }
  }

  if (message.trim().toLowerCase() === 'reiniciar contexto') {
    try {
      const old = await adminDb.collection('whatsapp-staff-sessions').doc(phone).collection('messages').limit(100).get();
      const batch = adminDb.batch();
      old.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch { /* noop */ }
    return NextResponse.json({ reply: 'Contexto de staff reiniciado ✅' });
  }

  const history = await loadStaffHistory(phone);
  await saveStaffMessage(phone, 'user', message);

  const geminiKey = resolveGeminiKey();
  if (!geminiKey) return NextResponse.json({ reply: 'Error: API key no disponible.' });

  const systemInstruction = buildStaffPrompt({ staffName, today, currentTime });
  const genAI = new GoogleGenerativeAI(geminiKey);
  const staffModel = genAI.getGenerativeModel({
    model: config.geminiModel || 'gemini-2.0-flash-lite',
    systemInstruction,
    tools: [{ functionDeclarations: staffToolDeclarations as any }],
  });

  const staffChat = staffModel.startChat({ history });
  let parts: any[] = [{ text: message || '*(Audio)*' }];
  if (audioData?.base64) {
    let b64 = audioData.base64;
    if (b64.includes('base64,')) b64 = b64.split('base64,')[1];
    parts.push({ inlineData: { data: b64, mimeType: audioData.mimeType || 'audio/ogg' } });
  }

  let staffResult: any;
  try { staffResult = await staffChat.sendMessage(parts); }
  catch (e: any) { console.error('[Staff] Gemini error:', e?.message); return NextResponse.json({ reply: 'Error técnico. Intenta de nuevo.' }); }

  let staffResponse = staffResult.response;
  let staffIter = 0;
  while (staffResponse.candidates?.[0]?.content?.parts?.some((p: any) => 'functionCall' in p) && staffIter < 5) {
    staffIter++;
    const fcParts = staffResponse.candidates[0].content.parts.filter((p: any) => 'functionCall' in p);
    const funcResponses: any[] = [];
    for (const part of fcParts) {
      const fc = (part as any).functionCall;
      console.log(`[Staff] Tool: ${fc.name}`, JSON.stringify(fc.args));
      const toolResult = await executeTool(fc.name, fc.args || {}, config, phone, null);
      const finalResp = typeof toolResult !== 'object' || toolResult === null || Array.isArray(toolResult) ? { result: toolResult } : toolResult;
      funcResponses.push({ functionResponse: { name: fc.name, response: finalResp } } as any);
    }
    try { staffResult = await staffChat.sendMessage(funcResponses); staffResponse = staffResult.response; }
    catch (e) { console.error('[Staff] Tool response error:', e); return NextResponse.json({ reply: 'Error al procesar datos. Intenta de nuevo.' }); }
  }

  let staffReply: string | null = null;
  try { staffReply = staffResponse.text() || null; } catch { /* noop */ }
  if (!staffReply) staffReply = '¿Puedes reformular la pregunta?';

  await saveStaffMessage(phone, 'assistant', staffReply);
  return NextResponse.json({ reply: staffReply });
}
