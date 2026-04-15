/**
 * SinergIA WhatsApp Agent — Webhook Endpoint v4
 * POST /api/whatsapp/webhook
 *
 * v4 changes:
 *  - Message ID deduplication: Baileys sends duplicate webhooks per message
 *    (one per JID format: LID + s.whatsapp.net). Dedup ensures we process once.
 *  - Per-conversation humanTakeover: #doctoron pauses the bot in THAT chat only.
 *  - needsAttention flag: marks conversations for admin panel visibility.
 *  - 5-second debounce for rapid-fire patient messages.
 *  - Staff commands detected BEFORE config.enabled check.
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, type Content, type Part } from '@google/generative-ai';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

import { buildSystemPrompt, type PromptContext } from './system-prompt';
import {
  checkAvailability,
  createAppointment,
  getUpcomingAppointments,
  cancelAppointment,
  confirmAppointment,
  escalateToHuman,
  findPatientsByPhone,
  searchPatientByName,
  toolDeclarations,
  invalidateCache,
  type PhonePatientResult,
} from './tools';
export interface WhatsAppAgentConfig {
  [key: string]: any;
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Message ID Deduplication ───────────────────────────────────────
// Baileys sends the SAME message twice with different JID formats
// (e.g., 127668104228868@lid AND 5216182576826@s.whatsapp.net).
// Without dedup, we process every message twice → double responses.
// With dedup, the first webhook wins and the duplicate is ignored.

const processedMessageIds = new Set<string>();
const MAX_PROCESSED_IDS = 2000;

function isAlreadyProcessed(messageId: string | undefined): boolean {
  if (!messageId) return false;
  if (processedMessageIds.has(messageId)) return true;
  processedMessageIds.add(messageId);
  // Evict oldest entries when set grows too large
  if (processedMessageIds.size > MAX_PROCESSED_IDS) {
    const first = processedMessageIds.values().next().value;
    if (first) processedMessageIds.delete(first);
  }
  return false;
}

// ── Message Debounce Buffer ────────────────────────────────────────
// Prevents duplicate responses when patients send rapid bursts like:
//   "Hola" → "Buenas tardes" → "me gustaria cotizar" → "un tratamiento"

const DEBOUNCE_MS = 5000;

interface PendingBuffer {
  messages: string[];
  pushName?: string;
  rawJid?: string;
  audioData?: any;
  lastMessageAt: number;
  processing: boolean;
}

const pendingBuffers = new Map<string, PendingBuffer>();

// ── Module-level cache for datos.md ────────────────────────────────
let _clinicKnowledgeCache: string | null = null;

function loadClinicKnowledge(): string {
  if (_clinicKnowledgeCache !== null) return _clinicKnowledgeCache;
  try {
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(process.cwd(), 'datos.md');
    _clinicKnowledgeCache = fs.readFileSync(dataPath, 'utf-8');
  } catch (e) {
    console.error('[SinergIA] Failed to load datos.md:', e);
    _clinicKnowledgeCache = '';
  }
  return _clinicKnowledgeCache || '';
}

// ── Staff Command Detection ────────────────────────────────────────

type StaffCommandType = 'bot_off' | 'bot_on';

function isStaffCommand(message: string): { isCommand: boolean; command: StaffCommandType | null } {
  const cleaned = message.trim().toLowerCase().replace(/^#/, '');
  // BOT OFF (doctor takes over this chat):
  if (['doctoron', 'doctor on', 'apagar', 'off', 'pausar', 'stop'].includes(cleaned)) {
    return { isCommand: true, command: 'bot_off' };
  }
  // BOT ON (bot resumes in this chat):
  if (['doctoroff', 'doctor off', 'encender', 'on', 'reanudar', 'start'].includes(cleaned)) {
    return { isCommand: true, command: 'bot_on' };
  }
  return { isCommand: false, command: null };
}

async function handleConversationToggle(
  command: StaffCommandType,
  conversationId: string,
  source: string
): Promise<void> {
  const adminDb = getAdminDb();
  const convRef = adminDb.collection('whatsapp-conversations').doc(conversationId);

  if (command === 'bot_off') {
    await convRef.set({
      humanTakeover: true,
      humanTakeoverAt: FieldValue.serverTimestamp(),
      needsAttention: true,
    }, { merge: true });
    console.log(`[SinergIA] 🔴 Bot PAUSED for conversation ${conversationId} (${source})`);
  } else {
    await convRef.set({
      humanTakeover: false,
      needsAttention: false,
    }, { merge: true });
    // Also ensure global config.enabled is true (defensive: previous code may have set it to false)
    await adminDb.collection('settings').doc('whatsapp-agent').update({ enabled: true }).catch(() => {});
    console.log(`[SinergIA] 🟢 Bot RESUMED for conversation ${conversationId} (${source})`);
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function formatNow(): { today: string; currentTime: string } {
  const now = new Date();
  const mxParts = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(now);
  const mxTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);
  return { today: mxParts, currentTime: mxTime };
}

async function loadConfig(): Promise<WhatsAppAgentConfig | null> {
  const adminDb = getAdminDb();
  try {
    const snap = await adminDb.collection('settings').doc('whatsapp-agent').get();
    if (!snap.exists) return null;
    return snap.data() as WhatsAppAgentConfig;
  } catch (e) {
    console.error('[SinergIA] Error loading config:', e);
    return null;
  }
}

async function loadConversationHistory(phone: string, sessionTTLHours: number = 4, limit = 20): Promise<Content[]> {
  const adminDb = getAdminDb();
  try {
    const parentDoc = await adminDb.collection('whatsapp-conversations').doc(phone).get();
    let lastResetAt = parentDoc.exists ? parentDoc.data()?.lastResetAt : null;

    const sessionTTLMs = sessionTTLHours * 60 * 60 * 1000;
    const sessionCutoff = new Date(Date.now() - sessionTTLMs);

    let effectiveCutoff = sessionCutoff;
    if (lastResetAt) {
      const resetDate = typeof lastResetAt === 'string' ? new Date(lastResetAt) : lastResetAt;
      if (resetDate > effectiveCutoff) {
        effectiveCutoff = resetDate;
      }
    }

    const query = adminDb
      .collection('whatsapp-conversations').doc(phone)
      .collection('messages')
      .where('timestamp', '>', effectiveCutoff)
      .orderBy('timestamp', 'desc')
      .limit(limit);

    const messagesSnap = await query.get();
    if (messagesSnap.empty) return [];

    const messages = messagesSnap.docs.reverse();

    let mappedMessages = messages.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        role: data.role === 'user' ? 'user' : 'model',
        parts: [{ text: data.content || '' }] as Part[],
      } as Content;
    });

    while (mappedMessages.length > 0 && mappedMessages[0].role !== 'user') {
      mappedMessages.shift();
    }

    return mappedMessages;
  } catch (e) {
    console.error('[SinergIA] Error loading history:', e);
    return [];
  }
}

async function saveMessage(
  phone: string,
  role: 'user' | 'assistant',
  content: string,
  pushName?: string,
  rawJid?: string,
  tutorPhone?: string
) {
  const adminDb = getAdminDb();
  try {
    const convRef = adminDb.collection('whatsapp-conversations').doc(phone);

    await convRef.collection('messages').add({
      role,
      content,
      timestamp: FieldValue.serverTimestamp(),
    });

    const metadata: Record<string, any> = {
      lastMessageAt: FieldValue.serverTimestamp(),
      totalMessages: FieldValue.increment(1),
    };
    if (pushName) metadata.pushName = pushName;
    if (rawJid) metadata.rawJid = rawJid;
    if (tutorPhone) metadata.tutorPhone = tutorPhone;

    await convRef.set(metadata, { merge: true });
  } catch (e) {
    console.error('[SinergIA] Error saving message:', e);
  }
}

// ── Tool Execution ─────────────────────────────────────────────────

const DEFAULT_DOCTOR_ID = '5l9NxVQRjTMN6fmXi8g16QNQ5YH2';

async function executeTool(
  toolName: string,
  args: any,
  config: WhatsAppAgentConfig,
  phone: string,
  patientInfo: PhonePatientResult | null
) {
  const doctorId = args.doctorId || config.doctorId || DEFAULT_DOCTOR_ID;

  switch (toolName) {
    case 'check_availability':
      return await checkAvailability(args.date, doctorId, config.defaultDuration);

    case 'create_appointment':
      return await createAppointment({
        patientName: args.patientName || patientInfo?.name || 'Paciente',
        patientPhone: phone,
        patientId: args.patientName && patientInfo?.name && args.patientName.toLowerCase() !== patientInfo.name.toLowerCase()
          ? null
          : (patientInfo?.id || null),
        date: args.date,
        time: args.time,
        duration: config.defaultDuration || 30,
        doctorId,
        doctorName: args.doctorName || config.doctorName || 'Dr. Arturo Valdelamar',
        officeId: 'General',
        reason: args.reason || '',
      });

    case 'get_upcoming_appointments':
      return await getUpcomingAppointments(phone, config.defaultCountryCode);

    case 'cancel_appointment':
      return await cancelAppointment(args.appointmentId);

    case 'confirm_appointment':
      return await confirmAppointment(args.appointmentId);

    case 'escalate_to_human':
      return await escalateToHuman(phone, args.reason || 'Patient requested');

    case 'search_patient_by_name':
      return await searchPatientByName(args.nameQuery || '');

    case 'link_patient_phone':
      try {
        const { getFirestore } = await import('firebase-admin/firestore');
        const db = getFirestore();
        const cleanPhone = (args.phoneNumber || '').replace(/\D/g, '');
        await db.collection('whatsapp-conversations').doc(phone).set({
          tutorPhone: cleanPhone
        }, { merge: true });
        invalidateCache();
        console.log(`[SinergIA] link_patient_phone: linked ${cleanPhone} to conversation ${phone}`);
        return { message: `Teléfono ${cleanPhone} vinculado exitosamente a esta conversación.` };
      } catch (err: any) {
        return { error: `Fallo al vincular: ${err.message}` };
      }

    default:
      return { message: `Unknown tool: ${toolName}` };
  }
}

// ── Main Handler ───────────────────────────────────────────────────

export async function POST(request: Request) {
  let config: WhatsAppAgentConfig | null = null;
  try {
    const adminDb = getAdminDb();

    // 1. Load config
    config = await loadConfig();
    if (!config) {
      return NextResponse.json({ reply: null }, { status: 200 });
    }

    // 2. Validate API key
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== config.webhookSecret) {
      console.warn(`[SinergIA] API key mismatch`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Parse payload
    const body = await request.json();
    const { from, pushName, message, isGroup, fromMe } = body;
    const messageId: string | undefined = body.messageId || body.id || body.key?.id;

    if (isGroup) return NextResponse.json({ reply: null });
    if (!from || !message) return NextResponse.json({ reply: null });

    // ────────────────────────────────────────────────────────────────
    // 3.1 MESSAGE ID DEDUP — Baileys sends the same message twice
    // with different JID formats (LID + s.whatsapp.net). The first
    // webhook wins; duplicates are silently dropped. This also fixes
    // the JID mismatch that broke per-conversation humanTakeover.
    // ────────────────────────────────────────────────────────────────
    if (isAlreadyProcessed(messageId)) {
      return NextResponse.json({ reply: null });
    }

    const phone = from.replace(/[^0-9]/g, '');
    const rawJid = body.rawJid || body.resolvedJid || from;
    const conversationId = phone;

    console.log(`[SinergIA] ${conversationId} (${pushName}) [fromMe=${fromMe}] [msgId=${messageId}]: ${message.substring(0, 80)}`);

    // ────────────────────────────────────────────────────────────────
    // 4. STAFF COMMAND DETECTION — PER-CONVERSATION TOGGLE
    //
    // Checked BEFORE config.enabled so the doctor can always toggle.
    // The doctor types the command in the patient's WhatsApp chat.
    // Only that specific conversation is paused/resumed.
    //
    // Commands (with or without #):
    //   Pause:  doctoron, apagar, off, pausar, stop
    //   Resume: doctoroff, encender, on, reanudar, start
    //
    // Detection layers:
    //   L1: fromMe=true + command → toggle + suppress
    //   L2: fromMe=true, no command → suppress (clinic's own msgs)
    //   L3: fromMe=false + command → toggle (Baileys LID bug)
    // ────────────────────────────────────────────────────────────────
    const staffCmd = isStaffCommand(message);

    // LAYER 1: fromMe + command → per-conversation toggle
    if (fromMe && staffCmd.isCommand) {
      await handleConversationToggle(staffCmd.command!, conversationId, `fromMe=true`);
      return NextResponse.json({ reply: null });
    }

    // LAYER 2: fromMe + not a command → suppress (clinic's own messages)
    if (fromMe) {
      return NextResponse.json({ reply: null });
    }

    // LAYER 3: NOT fromMe but IS a command → Baileys LID bug fallback
    if (staffCmd.isCommand) {
      console.warn(`[SinergIA] ⚠️ Staff command "${message}" but fromMe=${fromMe}. Treating as staff.`);
      await handleConversationToggle(staffCmd.command!, conversationId, `fromMe-fallback`);
      return NextResponse.json({ reply: null });
    }

    // ────────────────────────────────────────────────────────────────
    // 4.1 GLOBAL ENABLED CHECK
    // ────────────────────────────────────────────────────────────────
    if (!config.enabled) {
      console.log(`[SinergIA] ⛔ Bot globally disabled. Ignoring ${conversationId}.`);
      return NextResponse.json({ reply: null });
    }

    // ────────────────────────────────────────────────────────────────
    // 4.2 PER-CONVERSATION HUMAN TAKEOVER CHECK
    // ────────────────────────────────────────────────────────────────
    const convDoc = await adminDb.collection('whatsapp-conversations').doc(conversationId).get();
    if (convDoc.exists && convDoc.data()?.humanTakeover === true) {
      console.log(`[SinergIA] ⛔ Human takeover active for ${conversationId}. Saving message, no reply.`);
      // Save the message so the doctor sees it in conversation history
      await saveMessage(conversationId, 'user', message, pushName, rawJid);
      // Mark that the patient sent something while paused (needs attention)
      await adminDb.collection('whatsapp-conversations').doc(conversationId).set({
        needsAttention: true,
        lastMessageAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return NextResponse.json({ reply: null });
    }

    // ────────────────────────────────────────────────────────────────
    // 5. DEBOUNCE — Buffer rapid-fire messages
    // ────────────────────────────────────────────────────────────────
    const now = Date.now();
    let buffer = pendingBuffers.get(conversationId);

    if (!buffer) {
      buffer = {
        messages: [message],
        pushName,
        rawJid,
        audioData: body.audioData || null,
        lastMessageAt: now,
        processing: true,
      };
      pendingBuffers.set(conversationId, buffer);
    } else {
      buffer.messages.push(message);
      buffer.lastMessageAt = now;
      if (body.audioData) buffer.audioData = body.audioData;
      if (pushName) buffer.pushName = pushName;
      if (rawJid) buffer.rawJid = rawJid;

      if (buffer.processing) {
        console.log(`[SinergIA] ⏳ Debounce: buffered message #${buffer.messages.length} for ${conversationId}`);
        return NextResponse.json({ reply: null });
      } else {
        buffer.processing = true;
      }
    }

    // Wait for quiet window
    await new Promise<void>((resolve) => {
      const check = () => {
        const b = pendingBuffers.get(conversationId);
        if (!b) { resolve(); return; }
        const elapsed = Date.now() - b.lastMessageAt;
        if (elapsed >= DEBOUNCE_MS) {
          resolve();
        } else {
          setTimeout(check, DEBOUNCE_MS - elapsed + 100);
        }
      };
      setTimeout(check, DEBOUNCE_MS);
    });

    // Collect buffered messages
    const finalBuffer = pendingBuffers.get(conversationId);
    pendingBuffers.delete(conversationId);

    const combinedMessage = finalBuffer ? finalBuffer.messages.join('\n') : message;
    const finalPushName = finalBuffer?.pushName || pushName;
    const finalRawJid = finalBuffer?.rawJid || rawJid;
    const finalAudioData = finalBuffer?.audioData || body.audioData;
    const bufferedCount = finalBuffer?.messages.length || 1;

    if (bufferedCount > 1) {
      console.log(`[SinergIA] ✅ Debounce: merged ${bufferedCount} messages for ${conversationId}`);
    }

    // ────────────────────────────────────────────────────────────────
    // 6. Resolve patient identity
    // ────────────────────────────────────────────────────────────────
    let allPatients: PhonePatientResult[] = [];
    let patientInfo: PhonePatientResult | null = null;
    let resolvedTutorPhone: string | null = null;

    try {
      const convSnap = convDoc.exists ? convDoc : await adminDb.collection('whatsapp-conversations').doc(conversationId).get();
      const rawTutorPhone: string | null = convSnap.exists ? (convSnap.data()?.tutorPhone || null) : null;
      const savedTutorPhone: string | null = rawTutorPhone ? rawTutorPhone.replace(/\D/g, '') || null : null;

      if (savedTutorPhone) {
        resolvedTutorPhone = savedTutorPhone;
        allPatients = await findPatientsByPhone(savedTutorPhone, config.defaultCountryCode);
      }

      if (allPatients.length === 0 && !savedTutorPhone) {
        allPatients = await findPatientsByPhone(phone, config.defaultCountryCode);
        if (allPatients.length > 0) {
          resolvedTutorPhone = allPatients[0].tutorPhone?.replace(/[^0-9]/g, '') || phone;
        }
      }

      if (allPatients.length > 0) {
        patientInfo = allPatients[0];
      }
    } catch (e) {
      console.error('[SinergIA] Patient lookup error:', e);
    }

    // 7. Context reset
    if (combinedMessage.trim().toLowerCase() === 'reiniciar contexto') {
      const docRef = adminDb.collection('whatsapp-conversations').doc(conversationId);
      await docRef.set({ lastResetAt: new Date().toISOString() }, { merge: true });
      return NextResponse.json({
        reply: 'Contexto reiniciado ✅ ¿En qué te puedo ayudar?'
      });
    }

    // ────────────────────────────────────────────────────────────────
    // 8. Build system prompt
    // ────────────────────────────────────────────────────────────────
    const { today, currentTime } = formatNow();
    const promptCtx: PromptContext = {
      botName: config.botName || 'SinergIA',
      clinicName: config.clinicName || 'Avoria',
      defaultDuration: config.defaultDuration || 20,
      today,
      currentTime,
      customInstructions: config.customInstructions || '',
      doctorId: config.doctorId || DEFAULT_DOCTOR_ID,
      satelliteSchedule: (config as any).satelliteSchedule || [],
    };

    let systemInstruction = buildSystemPrompt(promptCtx);

    // Patient context injection
    if (allPatients.length === 1) {
      const p = allPatients[0];
      const ageStr = p.age ? `\n- Edad: ${p.age}` : '';
      const dobStr = p.dob ? `\n- Fecha nacimiento: ${p.dob}` : '';
      const tutorStr = p.tutorName ? `\n- Nombre del tutor/padre: ${p.tutorName}` : '';
      systemInstruction += `\n\nPACIENTE IDENTIFICADO POR TELÉFONO:\n- Nombre completo: ${p.name}\n- ID expediente: ${p.id}${ageStr}${dobStr}${tutorStr}\n- Es paciente registrado. Usa su nombre real (primer nombre) en la conversación.\n- Si el tutor pregunta por el paciente, ya sabes quién es. NO preguntes el nombre de nuevo.`;
    } else if (allPatients.length > 1) {
      const list = allPatients.map((p, i) => {
        const ageStr = p.age ? ` (${p.age})` : '';
        return `${i + 1}. ${p.name}${ageStr} — ID: ${p.id}`;
      }).join('\n');
      systemInstruction += `\n\nMÚLTIPLES PACIENTES EN ESTE TELÉFONO (hermanos/familia):\n${list}\nTutor: ${allPatients[0].tutorName || finalPushName}\n\nIMPORTANTE: Cuando el tutor quiera agendar una cita o preguntar algo específico de un paciente, SIEMPRE pregunta "¿Para cuál de tus hijos/pacientes?". Presenta las opciones por nombre.`;
    } else if (resolvedTutorPhone) {
      systemInstruction += `\n\nTELÉFONO CONOCIDO PERO SIN EXPEDIENTE:\nEl número de teléfono del contacto es ${resolvedTutorPhone}, pero no está registrado como paciente en el sistema.\nNombre público de WhatsApp: "${finalPushName}".\nPuedes ayudarle con información general de la clínica. Si quiere agendar, indícale que primero debe registrarse como paciente llamando a la clínica.`;
    } else {
      systemInstruction += `\n\nPRIMER CONTACTO — TELÉFONO DESCONOCIDO: Tu sistema de WhatsApp oculta el número real de este contacto. El nombre público de WhatsApp es "${finalPushName}".\nINSTRUCCIÓN OBLIGATORIA: En tu PRIMERA respuesta, preséntate brevemente y pídele su número de celular a 10 dígitos para poder ubicar su expediente.\nCUANDO el paciente escriba su número, ejecuta la herramienta \`link_patient_phone\` pasando ese número. Una vez vinculado, busca su expediente y continúa el flujo normal.`;
    }

    // Clinic knowledge base
    const clinicKnowledge = loadClinicKnowledge();
    if (clinicKnowledge) {
      systemInstruction += `\n\n=== CONOCIMIENTO DE LA CLÍNICA (TRATAMIENTOS, PRECIOS, SERVICIOS) ===\nUtiliza esta información para responder todas las dudas del paciente sobre tratamientos:\n${clinicKnowledge}`;
    }

    // 9. Load history & save incoming
    const sessionTTL = config.sessionTTLHours || 4;
    const history = await loadConversationHistory(conversationId, sessionTTL);
    await saveMessage(conversationId, 'user', combinedMessage, finalPushName, finalRawJid, patientInfo?.tutorPhone);

    // 10. Call Gemini
    let geminiKey = process.env.GEMINI_API_KEY || '';
    if (geminiKey.includes('GEMINI_API_KEY=')) {
      const match = geminiKey.match(/GEMINI_API_KEY=([^\s]+)/);
      if (match) geminiKey = match[1];
    } else if (geminiKey.includes(' ')) {
      geminiKey = geminiKey.split(' ')[0];
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: config.geminiModel || 'gemini-2.0-flash',
      systemInstruction,
      tools: [{ functionDeclarations: toolDeclarations as any }],
    });

    const chat = model.startChat({ history });

    let userMessageText = combinedMessage || '*(Audio)*';
    let parts: any[] = [{ text: userMessageText }];

    if (finalAudioData?.base64) {
      let b64 = finalAudioData.base64;
      if (b64.includes('base64,')) b64 = b64.split('base64,')[1];
      else if (b64.includes(',')) b64 = b64.split(',')[1];
      parts.push({
        inlineData: { data: b64, mimeType: finalAudioData.mimeType || 'audio/ogg' },
      });
    }

    // ── Gemini call with 503 retry ─────────────────────────────────
    const is503Error = (err: any): boolean => {
      const msg = err?.message || String(err);
      return msg.includes('503') && (msg.includes('Service Unavailable') || msg.includes('high demand'));
    };

    let sentWaitMessage = false;

    const callGeminiWithRetry = async (): Promise<{ result: any; response: any }> => {
      const MAX_RETRIES = config!.geminiMaxRetries || 3;
      const RETRY_DELAY_MS = config!.geminiRetryDelayMs || 10000;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const r = await chat.sendMessage(parts);
          return { result: r, response: r.response };
        } catch (err: any) {
          if (is503Error(err)) {
            console.warn(`[SinergIA] Gemini 503 attempt ${attempt + 1}/${MAX_RETRIES + 1}`);

            if (!sentWaitMessage) {
              sentWaitMessage = true;
              try {
                const originUrl = new URL(request.url).origin;
                fetch(`${originUrl}/api/whatsapp/send`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    phone,
                    message: 'Estoy procesando tu solicitud, en unos segundos te respondo 😊',
                  }),
                }).catch(e => console.error('[SinergIA] Wait notification error:', e));
              } catch (e) {
                console.error('[SinergIA] Wait notification URL error:', e);
              }
            }

            if (attempt < MAX_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
              continue;
            }
          }
          throw err;
        }
      }
      throw new Error('Gemini: exhausted all retries');
    };

    let result: any;
    let response: any;

    try {
      const geminiResult = await callGeminiWithRetry();
      result = geminiResult.result;
      response = geminiResult.response;
    } catch (err: any) {
      if (is503Error(err)) {
        console.error('[SinergIA] Gemini 503 after all retries');
        const retryMsg = 'Estoy procesando tu solicitud, en unos segundos te respondo 😊 Por favor envíame tu mensaje de nuevo.';
        await saveMessage(conversationId, 'assistant', retryMsg);
        return NextResponse.json({ reply: retryMsg });
      }
      throw err;
    }

    // 11. Function calling loop (max 5 iterations)
    let iterations = 0;
    const executedTools: string[] = [];
    while (response.candidates?.[0]?.content?.parts?.some((p: any) => 'functionCall' in p) && iterations < 5) {
      iterations++;
      const functionCallParts = response.candidates[0].content.parts.filter((p: any) => 'functionCall' in p);

      const functionResponses: Part[] = [];
      for (const part of functionCallParts) {
        const fc = (part as any).functionCall;
        console.log(`[SinergIA] Tool: ${fc.name}`, JSON.stringify(fc.args));
        executedTools.push(fc.name);

        const toolResult = await executeTool(fc.name, fc.args || {}, config, phone, patientInfo);

        let finalResponse: any = toolResult;
        if (typeof toolResult !== 'object' || toolResult === null || Array.isArray(toolResult)) {
          finalResponse = { result: toolResult };
        }

        functionResponses.push({
          functionResponse: { name: fc.name, response: finalResponse },
        } as any);
      }

      result = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    // 12. Extract reply
    let reply: string | null = null;
    try {
      reply = response.text() || null;
    } catch {
      const finishReason = response.candidates?.[0]?.finishReason;
      console.warn(`[SinergIA] No text. Reason: ${finishReason}`);
      if (finishReason === 'SAFETY') {
        reply = 'Disculpa, no puedo procesar ese mensaje. ¿Te puedo ayudar con algo más? 😊';
      }
    }

    // Phantom confirmation detector
    if (reply && !executedTools.includes('create_appointment')) {
      const confirmKeywords = /cita.*confirmada|cita.*agendada|queda.*agendada|queda.*confirmada|quedó.*agendada|quedó.*confirmada/i;
      if (confirmKeywords.test(reply)) {
        console.error(`[SinergIA] ⚠️ PHANTOM CONFIRMATION detected! Tools: [${executedTools.join(', ')}]. Check geminiModel in Firestore config.`);
      }
    }

    console.log(`[SinergIA] Tools: [${executedTools.join(', ')}]`);

    if (reply) {
      await saveMessage(conversationId, 'assistant', reply);
      console.log(`[SinergIA] Reply: ${reply.substring(0, 80)}`);
    }

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error('[SinergIA] Webhook error:', error?.message || error);

    const fallbackMsg = config?.fallbackErrorMessage?.trim()
      || 'Disculpa, tuve un problema técnico. Por favor intenta de nuevo en unos minutos 🙏';

    return NextResponse.json({ reply: fallbackMsg });
  }
}