/**
 * SofIA WhatsApp Agent — Webhook Entry Point v5
 * POST /api/whatsapp/webhook
 * Ranoro — Taller Mecánico Automotriz
 */

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { WhatsAppAgentConfig } from '@/lib/types';

import {
  getVehicleStatus,
  getVehicleHistory,
  getServicePrices,
  checkWorkshopAvailability,
  createWorkshopAppointment,
  getUpcomingAppointments,
  cancelAppointment,
  escalateToHuman,
  searchCustomerByName,
  findCustomersByPhone,
  invalidateCache,
  getTodayAppointments,
  getWorkshopStats,
  type PhoneCustomerResult,
} from './tools';

import { handleClientMessage } from './client-handler';
import { handleStaffMessage } from './staff-handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Message deduplication ──────────────────────────────────────────

const processedMessageIds = new Set<string>();
const MAX_PROCESSED_IDS = 2000;

function isAlreadyProcessed(id: string | undefined): boolean {
  if (!id) return false;
  if (processedMessageIds.has(id)) return true;
  processedMessageIds.add(id);
  if (processedMessageIds.size > MAX_PROCESSED_IDS) {
    const first = processedMessageIds.values().next().value;
    if (first) processedMessageIds.delete(first);
  }
  return false;
}

// ── Staff toggle ───────────────────────────────────────────────────

type StaffCommand = 'bot_off' | 'bot_on';

function detectStaffCommand(msg: string): { isCommand: boolean; command: StaffCommand | null } {
  const c = msg.trim().toLowerCase().replace(/^#/, '');
  if (['doctoron', 'doctor on', 'apagar', 'off', 'pausar', 'stop'].includes(c)) return { isCommand: true, command: 'bot_off' };
  if (['doctoroff', 'doctor off', 'encender', 'on', 'reanudar', 'start'].includes(c)) return { isCommand: true, command: 'bot_on' };
  return { isCommand: false, command: null };
}

async function handleConversationToggle(command: StaffCommand, conversationId: string, source: string): Promise<void> {
  const ref = getAdminDb().collection('whatsapp-conversations').doc(conversationId);
  if (command === 'bot_off') {
    await ref.set({ humanTakeover: true, humanTakeoverAt: FieldValue.serverTimestamp(), needsAttention: true }, { merge: true });
    console.log(`[SofIA] 🔴 Bot PAUSED for ${conversationId} (${source})`);
  } else {
    await ref.set({ humanTakeover: false, needsAttention: false }, { merge: true });
    await getAdminDb().collection('settings').doc('whatsapp-agent').update({ enabled: true }).catch(() => {});
    console.log(`[SofIA] 🟢 Bot RESUMED for ${conversationId} (${source})`);
  }
}

// ── LID resolution ─────────────────────────────────────────────────

async function resolveStaffFromLid(lid: string, staffPhones: string[]): Promise<string | null> {
  try {
    const snap = await getAdminDb().collection('settings').doc('whatsapp-staff-lids').get();
    if (!snap.exists) return null;
    const mapping = snap.data() as Record<string, string>;
    const resolved = mapping[lid];
    if (resolved && staffPhones.includes(resolved)) return resolved;
  } catch { /* noop */ }
  return null;
}

async function registerStaffLid(lid: string, phone: string): Promise<void> {
  try {
    await getAdminDb().collection('settings').doc('whatsapp-staff-lids').set({ [lid]: phone }, { merge: true });
    console.log(`[SofIA] 🔗 LID registered: ${lid} → ${phone}`);
  } catch { /* noop */ }
}

// ── Helpers ────────────────────────────────────────────────────────

function getStaffUids(config: any): string[] {
  return ((config.staffMembers as Array<{ uid?: string; phone?: string }>) || [])
    .map(m => (m.uid || m.phone || '').replace(/\D/g, '')).filter(u => u.length >= 7);
}

function isStaffPhone(phone: string, list: string[]): boolean {
  const clean = phone.replace(/\D/g, '');
  return list.some(s => s.replace(/\D/g, '') === clean);
}

function formatNow(): { today: string; currentTime: string } {
  const now = new Date();
  return {
    today: new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now),
    currentTime: new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false }).format(now),
  };
}

async function loadConfig(): Promise<WhatsAppAgentConfig | null> {
  try {
    const snap = await getAdminDb().collection('settings').doc('whatsapp-agent').get();
    if (!snap.exists) return null;
    return snap.data() as WhatsAppAgentConfig;
  } catch (e) { console.error('[SofIA] loadConfig error:', e); return null; }
}

async function loadConversationHistory(phone: string, ttlHours: number, limit = 20) {
  try {
    const parentDoc = await getAdminDb().collection('whatsapp-conversations').doc(phone).get();
    const lastResetAt = parentDoc.exists ? parentDoc.data()?.lastResetAt : null;
    const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000);
    if (lastResetAt) {
      const reset = typeof lastResetAt === 'string' ? new Date(lastResetAt) : lastResetAt;
      if (reset > cutoff) Object.assign(cutoff, reset);
    }
    const snap = await getAdminDb().collection('whatsapp-conversations').doc(phone)
      .collection('messages').where('timestamp', '>', cutoff).orderBy('timestamp', 'desc').limit(limit).get();
    if (snap.empty) return [];
    const msgs = snap.docs.reverse().map(d => ({ role: d.data().role === 'user' ? 'user' : 'model', parts: [{ text: d.data().content || '' }] })) as any[];
    while (msgs.length > 0 && msgs[0].role !== 'user') msgs.shift();
    return msgs;
  } catch { return []; }
}

async function saveMessage(phone: string, role: 'user' | 'assistant', content: string, pushName?: string, rawJid?: string): Promise<void> {
  try {
    const ref = getAdminDb().collection('whatsapp-conversations').doc(phone);
    await ref.collection('messages').add({ role, content, timestamp: FieldValue.serverTimestamp() });
    const meta: Record<string, any> = { lastMessageAt: FieldValue.serverTimestamp(), totalMessages: FieldValue.increment(1) };
    if (pushName) meta.pushName = pushName;
    if (rawJid) meta.rawJid = rawJid;
    await ref.set(meta, { merge: true });
  } catch { /* noop */ }
}

async function saveStaffMessage(phone: string, role: 'user' | 'assistant', content: string): Promise<void> {
  try {
    await getAdminDb().collection('whatsapp-staff-sessions').doc(phone).collection('messages')
      .add({ role, content, timestamp: FieldValue.serverTimestamp() });
  } catch { /* noop */ }
}

async function loadStaffHistory(phone: string): Promise<any[]> {
  try {
    const snap = await getAdminDb().collection('whatsapp-staff-sessions').doc(phone)
      .collection('messages').orderBy('timestamp', 'desc').limit(30).get();
    if (snap.empty) return [];
    return snap.docs.reverse().map(d => ({ role: d.data().role === 'user' ? 'user' : 'model', parts: [{ text: d.data().content || '' }] }));
  } catch { return []; }
}

// ── Tool executor ──────────────────────────────────────────────────

async function executeTool(
  toolName: string, args: any, config: WhatsAppAgentConfig,
  phone: string, customerInfo: PhoneCustomerResult | null,
): Promise<any> {
  switch (toolName) {
    case 'get_vehicle_status':
      return await getVehicleStatus(args.phone || phone);

    case 'get_vehicle_history':
      return await getVehicleHistory(args.phone || phone, args.limit || 5);

    case 'get_service_prices':
      return await getServicePrices({
        make: args.make || '',
        model: args.model || '',
        year: args.year || new Date().getFullYear(),
        serviceType: args.serviceType,
        partUpgrades: args.partUpgrades,
      });

    case 'check_workshop_availability':
      return await checkWorkshopAvailability(args.date, args.serviceType);

    case 'create_appointment':
      return await createWorkshopAppointment({
        clientName: args.clientName || customerInfo?.name || 'Cliente WhatsApp',
        clientPhone: args.clientPhone || phone,
        vehicleInfo: args.vehicleInfo || 'No especificado',
        serviceType: args.serviceType || 'Revisión general',
        date: args.date || '',
        timeSlot: args.timeSlot || '',
        notes: args.notes,
      });

    case 'get_upcoming_appointments':
      return await getUpcomingAppointments(args.phone || phone);

    case 'cancel_appointment':
      return await cancelAppointment(args.appointmentId || '');

    case 'escalate_to_human':
      return await escalateToHuman(phone, args.reason || 'Cliente solicitó atención humana');

    case 'search_customer_by_name':
      return await searchCustomerByName(args.nameQuery || '');

    case 'get_today_appointments':
      return await getTodayAppointments();

    case 'get_workshop_stats':
      return await getWorkshopStats();

    case 'link_customer_phone': {
      const cleanPhone = (args.phoneNumber || '').replace(/\D/g, '');
      if (!cleanPhone) return { message: 'Número inválido.' };
      try {
        await getAdminDb().collection('whatsapp-conversations').doc(phone).set({ customerPhone: cleanPhone }, { merge: true });
        invalidateCache();
        return { message: `Teléfono ${cleanPhone} vinculado exitosamente.` };
      } catch (e: any) { return { error: `Error al vincular: ${e.message}` }; }
    }

    default:
      return { message: `Herramienta desconocida: ${toolName}` };
  }
}

// ── Main POST handler ──────────────────────────────────────────────

export async function POST(request: Request) {
  let config: WhatsAppAgentConfig | null = null;
  try {
    const adminDb = getAdminDb();
    config = await loadConfig();
    if (!config) return NextResponse.json({ reply: null }, { status: 200 });

    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== config.webhookSecret) {
      console.warn('[SofIA] ⚠️ API key mismatch');
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

    console.log(`[SofIA] ${conversationId} (${pushName}) [fromMe=${fromMe}] [msgId=${messageId}]: ${(message || '').substring(0, 80)}`);

    const staffCmd = detectStaffCommand(message);
    if (fromMe && staffCmd.isCommand) { await handleConversationToggle(staffCmd.command!, conversationId, 'fromMe=true'); return NextResponse.json({ reply: null }); }
    if (fromMe) return NextResponse.json({ reply: null });
    if (staffCmd.isCommand) {
      console.warn(`[SofIA] ⚠️ Staff command "${message}" but fromMe=false.`);
      await handleConversationToggle(staffCmd.command!, conversationId, 'fromMe-fallback');
      return NextResponse.json({ reply: null });
    }

    const legacyPhones: string[] = Array.isArray((config as any).adminPhones) ? (config as any).adminPhones : [];
    const memberUids: string[] = getStaffUids(config as any);
    const staffPhonesList: string[] = [...legacyPhones, ...memberUids];
    const isFromLid = rawJid.includes('@lid');
    let staffPhone: string | null = null;

    if (isStaffPhone(phone, staffPhonesList)) staffPhone = phone;
    else if (isFromLid) staffPhone = await resolveStaffFromLid(phone, staffPhonesList);

    console.log(`[SofIA] 📱 Staff check: phone=${phone}, isLid=${isFromLid}, resolved=${staffPhone}`);

    if (staffPhone) {
      if (isFromLid && !isStaffPhone(phone, staffPhonesList)) await registerStaffLid(phone, staffPhone);
      console.log(`[SofIA] 🔧 STAFF mode for ${staffPhone}`);
      return await handleStaffMessage({
        phone: conversationId, staffPhone, message, pushName,
        audioData: body.audioData, body, config, adminDb,
        executeTool: (name, args, cfg, ph, ci) => executeTool(name, args, cfg, ph, ci as PhoneCustomerResult | null),
        saveStaffMessage, loadStaffHistory, formatNow,
        requestUrl: request.url,
      });
    }

    return await handleClientMessage({
      phone, conversationId, message, pushName, rawJid,
      audioData: body.audioData, body, config, adminDb,
      executeTool, saveMessage, loadConversationHistory, formatNow,
      requestUrl: request.url,
    });

  } catch (error: any) {
    console.error('[SofIA] Webhook error:', error?.message || error);
    const fallback = config?.fallbackErrorMessage?.trim()
      || 'Disculpa, tuve un problema técnico. Por favor intenta de nuevo en unos minutos 🙏';
    return NextResponse.json({ reply: fallback });
  }
}
