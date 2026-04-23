/**
 * SofIA — Client Handler v5
 * Ranoro — Taller Mecánico Automotriz
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, type Content, type Part } from '@google/generative-ai';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { buildSystemPrompt, type PromptContext } from './system-prompt';
import { findCustomersByPhone, toolDeclarations, type PhoneCustomerResult } from './tools';
import type { WhatsAppAgentConfig } from '@/lib/types';
import { notifyStaffOfEscalation } from './staff-handler';

const DEBOUNCE_MS = 5000;
interface PendingBuffer { messages: string[]; pushName?: string; rawJid?: string; audioData?: any; lastMessageAt: number; processing: boolean; }
const pendingBuffers = new Map<string, PendingBuffer>();

interface KnowledgeCache { content: string; fetchedAt: number; }
let _knowledgeCache: KnowledgeCache | null = null;
const KNOWLEDGE_TTL_MS = 5 * 60 * 1000;

export async function loadClinicKnowledge(): Promise<string> {
  const now = Date.now();
  if (_knowledgeCache && now - _knowledgeCache.fetchedAt < KNOWLEDGE_TTL_MS) return _knowledgeCache.content;
  try {
    const snap = await getAdminDb().collection('settings').doc('whatsapp-knowledge').get();
    if (snap.exists) {
      const content = snap.data()?.content || snap.data()?.text || '';
      if (content) { _knowledgeCache = { content, fetchedAt: now }; return content; }
    }
  } catch { /* fallthrough */ }
  _knowledgeCache = { content: '', fetchedAt: now };
  return '';
}

export function invalidateKnowledgeCache() { _knowledgeCache = null; }

export interface ClientHandlerParams {
  phone: string; conversationId: string; message: string; pushName?: string; rawJid?: string;
  audioData?: any; body: any; config: WhatsAppAgentConfig; adminDb: ReturnType<typeof getAdminDb>;
  executeTool: (name: string, args: any, config: WhatsAppAgentConfig, phone: string, ci: PhoneCustomerResult | null) => Promise<any>;
  saveMessage: (phone: string, role: 'user' | 'assistant', content: string, pushName?: string, rawJid?: string) => Promise<void>;
  loadConversationHistory: (phone: string, ttlHours: number, limit?: number) => Promise<Content[]>;
  formatNow: () => { today: string; currentTime: string };
  requestUrl: string;
}

function resolveGeminiKey(): string {
  let key = process.env.GEMINI_API_KEY || '';
  if (key.includes('=')) { const m = key.match(/GEMINI_API_KEY=([A-Za-z0-9_\-]+)/); if (m) key = m[1]; }
  return key.trim().replace(/^["']|["']$/g, '');
}

export async function handleClientMessage(params: ClientHandlerParams): Promise<NextResponse> {
  const { phone, conversationId, message, pushName, rawJid, body, config, adminDb,
    executeTool, saveMessage, loadConversationHistory, formatNow, requestUrl } = params;

  if (!config.enabled) return NextResponse.json({ reply: null });

  const convDoc = await adminDb.collection('whatsapp-conversations').doc(conversationId).get();
  if (convDoc.exists && convDoc.data()?.humanTakeover === true) {
    await saveMessage(conversationId, 'user', message, pushName, rawJid);
    await adminDb.collection('whatsapp-conversations').doc(conversationId).set({ needsAttention: true, lastMessageAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ reply: null });
  }

  const now = Date.now();
  let buffer = pendingBuffers.get(conversationId);
  if (!buffer) {
    buffer = { messages: [message], pushName, rawJid, audioData: body.audioData || null, lastMessageAt: now, processing: true };
    pendingBuffers.set(conversationId, buffer);
  } else {
    buffer.messages.push(message); buffer.lastMessageAt = now;
    if (body.audioData) buffer.audioData = body.audioData;
    if (pushName) buffer.pushName = pushName;
    if (rawJid) buffer.rawJid = rawJid;
    if (buffer.processing) { console.log(`[SofIA] ⏳ Buffered #${buffer.messages.length}`); return NextResponse.json({ reply: null }); }
    buffer.processing = true;
  }

  await new Promise<void>((resolve) => {
    const check = () => { const b = pendingBuffers.get(conversationId); if (!b) { resolve(); return; } const e = Date.now() - b.lastMessageAt; if (e >= DEBOUNCE_MS) resolve(); else setTimeout(check, DEBOUNCE_MS - e + 100); };
    setTimeout(check, DEBOUNCE_MS);
  });

  const finalBuffer = pendingBuffers.get(conversationId);
  pendingBuffers.delete(conversationId);
  const combinedMessage = finalBuffer?.messages.join('\n') || message;
  const finalPushName = finalBuffer?.pushName || pushName;
  const finalRawJid = finalBuffer?.rawJid || rawJid;
  const finalAudioData = finalBuffer?.audioData || body.audioData;

  // Customer identity
  let customerInfo: PhoneCustomerResult | null = null;
  try {
    const customers = await findCustomersByPhone(phone);
    if (customers.length > 0) customerInfo = customers[0];
  } catch { /* noop */ }

  if (combinedMessage.trim().toLowerCase() === 'reiniciar contexto') {
    await adminDb.collection('whatsapp-conversations').doc(conversationId).set({ lastResetAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ reply: 'Contexto reiniciado ✅ ¿En qué te puedo apoyar?' });
  }

  const { today, currentTime } = formatNow();
  const clinicKnowledge = await loadClinicKnowledge();

  const promptCtx: PromptContext = {
    botName: config.botName || 'SofIA',
    workshopName: config.workshopName || 'Ranoro',
    today, currentTime,
    customInstructions: config.customInstructions || '',
    clinicKnowledge,
  };

  let systemInstruction = buildSystemPrompt(promptCtx);

  if (customerInfo) {
    systemInstruction += `\n\nCLIENTE IDENTIFICADO:\n- Nombre: ${customerInfo.name}\n- ID: ${customerInfo.id}\n- Usa su nombre directamente. No pidas datos ya conocidos.`;
  } else {
    systemInstruction += `\n\nCLIENTE NO IDENTIFICADO:\nNombre público WhatsApp: "${finalPushName}".\nLee el mensaje primero y responde al contenido:\n- Si pregunta por su carro: ejecuta get_vehicle_status DE INMEDIATO (usa el teléfono de la conversación).\n- Si solo saluda: usa el saludo estándar.`;
  }

  const history = await loadConversationHistory(conversationId, config.sessionTTLHours || 4);
  await saveMessage(conversationId, 'user', combinedMessage, finalPushName, finalRawJid);

  const genAI = new GoogleGenerativeAI(resolveGeminiKey());
  const model = genAI.getGenerativeModel({
    model: config.geminiModel || 'gemini-2.0-flash-lite',
    systemInstruction,
    tools: [{ functionDeclarations: toolDeclarations as any }],
  });
  const chat = model.startChat({ history });
  let parts: any[] = [{ text: combinedMessage || '*(Audio)*' }];
  if (finalAudioData?.base64) {
    let b64 = finalAudioData.base64;
    if (b64.includes('base64,')) b64 = b64.split('base64,')[1];
    parts.push({ inlineData: { data: b64, mimeType: finalAudioData.mimeType || 'audio/ogg' } });
  }

  const is503 = (err: any) => { const m = err?.message || String(err); return m.includes('503') && (m.includes('Service Unavailable') || m.includes('high demand')); };
  let sentWaitMsg = false;
  const callWithRetry = async (): Promise<{ result: any; response: any }> => {
    const MAX = config.geminiMaxRetries || 3, DELAY = config.geminiRetryDelayMs || 10000;
    for (let attempt = 0; attempt <= MAX; attempt++) {
      try { const r = await chat.sendMessage(parts); return { result: r, response: r.response }; }
      catch (err: any) {
        if (is503(err)) {
          if (!sentWaitMsg) {
            sentWaitMsg = true;
            try { fetch(`${new URL(requestUrl).origin}/api/whatsapp/send`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': config.webhookSecret || '' }, body: JSON.stringify({ phone, message: 'Estoy consultando el sistema, en unos segundos te respondo 🔧' }) }).catch(() => {}); } catch { /* noop */ }
          }
          if (attempt < MAX) { await new Promise(r => setTimeout(r, DELAY)); continue; }
        }
        throw err;
      }
    }
    throw new Error('Gemini: exhausted all retries');
  };

  let result: any, response: any;
  try { ({ result, response } = await callWithRetry()); }
  catch (err: any) {
    if (is503(err)) {
      const msg = 'Estoy procesando tu solicitud, en unos segundos te respondo 🙏 Por favor envíame tu mensaje de nuevo.';
      await saveMessage(conversationId, 'assistant', msg);
      return NextResponse.json({ reply: msg });
    }
    throw err;
  }

  let iterations = 0;
  const executedTools: string[] = [];
  while (response.candidates?.[0]?.content?.parts?.some((p: any) => 'functionCall' in p) && iterations < 5) {
    iterations++;
    const fcParts = response.candidates[0].content.parts.filter((p: any) => 'functionCall' in p);
    const funcResponses: Part[] = [];
    for (const part of fcParts) {
      const fc = (part as any).functionCall;
      console.log(`[SofIA] Tool: ${fc.name}`, JSON.stringify(fc.args));
      executedTools.push(fc.name);
      const toolResult = await executeTool(fc.name, fc.args || {}, config, phone, customerInfo);
      if (fc.name === 'escalate_to_human') {
        notifyStaffOfEscalation({ patientPhone: phone, patientName: customerInfo?.name || finalPushName || phone, reason: fc.args?.reason || 'Sin especificar', config, requestUrl }).catch(() => {});
      }
      const finalResp = typeof toolResult !== 'object' || toolResult === null || Array.isArray(toolResult) ? { result: toolResult } : toolResult;
      funcResponses.push({ functionResponse: { name: fc.name, response: finalResp } } as any);
    }
    const TOOL_MAX = config.geminiMaxRetries || 3, TOOL_DELAY = config.geminiRetryDelayMs || 10000;
    let ta = 0, ok = false;
    while (ta <= TOOL_MAX) {
      try { result = await chat.sendMessage(funcResponses); response = result.response; ok = true; break; }
      catch (e: any) { if (is503(e) && ta < TOOL_MAX) { ta++; await new Promise(r => setTimeout(r, TOOL_DELAY)); } else throw e; }
    }
    if (!ok) throw new Error('Tool loop: exhausted retries');
  }

  let reply: string | null = null;
  try { reply = response.text() || null; }
  catch { reply = response.candidates?.[0]?.finishReason === 'SAFETY' ? 'Disculpa, no puedo procesar ese mensaje 😊' : 'Disculpa, no pude procesar tu mensaje. ¿Intentas de nuevo? 🙏'; }

  console.log(`[SofIA] Tools: [${executedTools.join(', ')}]`);
  if (reply) { await saveMessage(conversationId, 'assistant', reply); console.log(`[SofIA] Reply: ${reply.substring(0, 80)}`); }
  return NextResponse.json({ reply });
}
