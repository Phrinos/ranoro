import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { handleStaffMessage } from './staff-handler';
import { handleClientMessage } from './client-handler';
import { executeTool } from './tools';
import type { WhatsAppAgentConfig } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Message ID Deduplication ───────────────────────────────────────
const processedMessageIds = new Set<string>();
const MAX_PROCESSED_IDS = 2000;

function isAlreadyProcessed(messageId: string | undefined): boolean {
  if (!messageId) return false;
  if (processedMessageIds.has(messageId)) return true;
  processedMessageIds.add(messageId);
  if (processedMessageIds.size > MAX_PROCESSED_IDS) {
    const first = processedMessageIds.values().next().value;
    if (first) processedMessageIds.delete(first);
  }
  return false;
}

// ── Staff Command Detection ────────────────────────────────────────
type StaffCommandType = 'bot_off' | 'bot_on';

function isStaffCommand(message: string): { isCommand: boolean; command: StaffCommandType | null } {
  const cleaned = message.trim().toLowerCase().replace(/^#/, '');
  if (['doctoron', 'bot on', 'apagar', 'off', 'pausar', 'stop', 'staffon'].includes(cleaned)) {
    return { isCommand: true, command: 'bot_off' }; // Bot is off for patient, staff takes over
  }
  if (['doctoroff', 'bot off', 'encender', 'on', 'reanudar', 'start', 'staffoff'].includes(cleaned)) {
    return { isCommand: true, command: 'bot_on' }; // Bot resumes
  }
  return { isCommand: false, command: null };
}

async function handleConversationToggle(command: StaffCommandType, conversationId: string, source: string): Promise<void> {
  const adminDb = getAdminDb();
  const convRef = adminDb.collection('whatsapp-conversations').doc(conversationId);
  if (command === 'bot_off') {
    await convRef.set({ humanTakeover: true, humanTakeoverAt: FieldValue.serverTimestamp(), needsAttention: true }, { merge: true });
    console.log(`[SofIA] 🔴 Bot PAUSADO para ${conversationId} (${source})`);
  } else {
    await convRef.set({
      humanTakeover: false,
      needsAttention: false,
      lastResetAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`[SofIA] 🟢 Bot REANUDADO para ${conversationId} (${source})`);
  }
}

// ── Staff Phone Detection ──────────────────────────────────────────
function isStaffPhone(phone: string, staffPhones: string[]): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return staffPhones.some(sp => {
    const clean = sp.replace(/\D/g, '');
    return cleanPhone === clean || cleanPhone === clean.slice(-10) || clean === cleanPhone.slice(-10);
  });
}

function getStaffUids(config: any): string[] {
  const members: Array<{ uid: string }> = Array.isArray(config.staffMembers) ? config.staffMembers : [];
  return members.map(m => m.uid).filter(Boolean);
}

let _staffLidMap: Map<string, string> | null = null;
let _staffLidMapLoadedAt = 0;
const STAFF_LID_CACHE_TTL_MS = 5 * 60 * 1000;

async function loadStaffLidMap(): Promise<Map<string, string>> {
  if (_staffLidMap && (Date.now() - _staffLidMapLoadedAt) < STAFF_LID_CACHE_TTL_MS) return _staffLidMap;
  const adminDb = getAdminDb();
  try {
    const snap = await adminDb.collection('settings').doc('whatsapp-staff-lids').get();
    _staffLidMap = snap.exists
      ? new Map(Object.entries(snap.data() || {}).filter(([_, v]) => typeof v === 'string') as [string, string][])
      : new Map();
  } catch { _staffLidMap = new Map(); }
  _staffLidMapLoadedAt = Date.now();
  return _staffLidMap;
}

async function registerStaffLid(lid: string, phone: string): Promise<void> {
  const adminDb = getAdminDb();
  try {
    await adminDb.collection('settings').doc('whatsapp-staff-lids').set({ [lid]: phone }, { merge: true });
    if (_staffLidMap) _staffLidMap.set(lid, phone);
    console.log(`[Staff] 🔗 Registered LID: ${lid} → ${phone}`);
  } catch (e) { console.error('[Staff] LID register failed:', e); }
}

async function resolveStaffFromLid(lid: string, staffPhones: string[]): Promise<string | null> {
  const map = await loadStaffLidMap();
  const mappedPhone = map.get(lid);
  if (mappedPhone && isStaffPhone(mappedPhone, staffPhones)) return mappedPhone;
  if (isStaffPhone(lid, staffPhones)) return lid;
  return null;
}

// ── Shared Helpers ───────────────────────────
export function formatNow(): { today: string; currentTime: string } {
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
  try {
    const snap = await getAdminDb().collection('settings').doc('whatsapp-agent').get();
    if (!snap.exists) return null;
    return snap.data() as WhatsAppAgentConfig;
  } catch (e) {
    console.error('[SofIA] Error loading config:', e);
    return null;
  }
}

// ── Main Handler ───────────────────────────────────────────────────
export async function POST(request: Request) {
  let config: WhatsAppAgentConfig | null = null;
  try {
    const adminDb = getAdminDb();

    config = await loadConfig();
    if (!config) return NextResponse.json({ reply: null }, { status: 200 });

    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== config.webhookSecret) {
      console.warn(`[SofIA] API key mismatch`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { from, pushName, message, isGroup, fromMe } = body;
    const messageId: string | undefined = body.messageId || body.id || body.key?.id;

    if (isGroup) return NextResponse.json({ reply: null });
    if (!from || !message) return NextResponse.json({ reply: null });

    if (isAlreadyProcessed(messageId)) return NextResponse.json({ reply: null });

    const phone = from.replace(/[^0-9]/g, '');
    const rawJid = body.rawJid || body.resolvedJid || from;
    const conversationId = phone;

    console.log(`[SofIA] ${conversationId} (${pushName}) [fromMe=${fromMe}] [msgId=${messageId}]: ${message.substring(0, 80)}`);

    // ── Per-conversation toggle commands ──────────────────────
    const staffCmd = isStaffCommand(message);
    if (fromMe && staffCmd.isCommand) {
      await handleConversationToggle(staffCmd.command!, conversationId, 'fromMe=true');
      return NextResponse.json({ reply: null });
    }
    if (fromMe) return NextResponse.json({ reply: null });
    if (staffCmd.isCommand) {
      console.warn(`[SofIA] ⚠️ Staff command "${message}" but fromMe=false. Treating as staff.`);
      await handleConversationToggle(staffCmd.command!, conversationId, 'fromMe-fallback');
      return NextResponse.json({ reply: null });
    }

    // ── Staff fast-path ───────────────────────────────────────
    const memberUids: string[] = getStaffUids(config);
    // As a fallback, if we have phones array in config we can add it, but Ranoro uses UIDs
    const staffPhonesList: string[] = [...memberUids, config.advisorPhoneNumber].filter(Boolean);
    const isFromLid = rawJid.includes('@lid');
    let staffPhone: string | null = null;

    if (isStaffPhone(phone, staffPhonesList)) {
      staffPhone = phone;
    } else if (isFromLid) {
      staffPhone = await resolveStaffFromLid(phone, staffPhonesList);
    }

    if (staffPhone) {
      console.log(`[SofIA] 🔧 STAFF mode for ${staffPhone}`);
      if (isFromLid && staffPhone !== phone) await registerStaffLid(phone, staffPhone);

      return await handleStaffMessage({
        phone,
        staffPhone,
        message,
        pushName,
        audioData: body.audioData,
        body,
        config,
        adminDb,
        executeTool,
        formatNow,
        requestUrl: request.url,
      });
    }

    // ── Client path ──────────────────────────────────────────
    return await handleClientMessage({
      phone,
      conversationId,
      message,
      pushName,
      rawJid,
      audioData: body.audioData,
      body,
      config,
      adminDb,
      executeTool,
      formatNow,
      requestUrl: request.url,
    });

  } catch (error: any) {
    console.error('[SofIA] Webhook error:', error?.message || error);
    const fallbackMsg = config?.fallbackErrorMessage?.trim()
      || 'Disculpa, tuve un problema técnico. Por favor intenta de nuevo en unos minutos 🙏';
    return NextResponse.json({ reply: fallbackMsg });
  }
}
