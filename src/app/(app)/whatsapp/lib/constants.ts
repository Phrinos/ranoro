/**
 * SinergIA WhatsApp Module — Shared Constants
 * Re-usable configuration defaults, tone presets, emoji options, and model lists.
 * Extracted from page.tsx for self-contained module portability.
 */

import type { WhatsAppAgentConfig, WhatsAppTemplate } from './types';

// ── Crypto helper for generating API keys ──────────────────────────

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'sng_';
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ── Default Configs ────────────────────────────────────────────────

export const DEFAULT_CONFIG: WhatsAppAgentConfig = {
  enabled: false,
  botName: 'SofIA',
  workshopName: 'Ranoro',
  defaultCountryCode: '+52',
  baileysHost: '62.171.187.165',
  baileysPort: '3000',
  baileysSessionId: 'ranoro',
  baileysAdminUser: '',
  baileysAdminPassword: '',
  webhookSecret: generateApiKey(),
  greetingMessage: '',
  tone: 'profesional-calido',
  emojiLevel: 'moderado',
  customInstructions: '',
  outOfHoursMessage: 'En este momento estamos fuera de horario, pero con gusto te ayudo. No te preocupes, estamos para ayudarte.',
  fallbackErrorMessage: 'Disculpa, tuve un problema técnico. Por favor intenta de nuevo en unos minutos. 🙏',
  remindersEnabled: true,
  reminderHoursBefore: 24,
  confirmationHoursBefore: 2,
  pollsEnabled: true,
  messageExpirationHours: 24,
  systemPromptOverride: '',
  sessionTTLHours: 4,
  geminiModel: 'gemini-2.5-flash',
  geminiMaxRetries: 3,
  geminiRetryDelayMs: 10000,
  escalationEnabled: false,
  advisorTakeoverKeyword: '#staffon',
  aiReturnKeyword: '#staffoff',
  escalationTimeoutHours: 2,
  autoEscalateOnComplaint: true,
  autoEscalateOnRequest: true,
  escalationMessage: 'Te comunico con el jefe de taller. En un momento te responderán.',
  returnMessage: 'SofIA vuelve a estar a tu servicio. ¿En qué te puedo apoyar?',
  advisorPhoneNumber: '',
  staffMembers: [],
  knowledgeBase: '',
  whatsappPhone: '',
};

export const DEFAULT_TEMPLATES: WhatsAppTemplate = {
  welcome: 'Hola Soy SinergIA el asistente de Avoria. ¿En qué puedo ayudarte?',
  reminder: 'Hola {{nombre}} 👋\n\nTe recordamos tu cita mañana:\n📅 {{fecha}}\n🕐 {{hora}}\n📍 Área de {{area}}\n\n¿Confirmas tu asistencia? Responde Sí o No.',
  confirmation: '✅ ¡Tu cita ha sido confirmada!\n\n📅 {{fecha}}\n🕐 {{hora}}\n📍 Área de {{area}}\n\nTe esperamos. ¡Gracias!',
  cancellation: '❌ Tu cita del {{fecha}} a las {{hora}} ha sido cancelada.\n\nSi deseas reagendar, escríbenos.',
};



// ── Gemini Model Options ───────────────────────────────────────────

export const MODEL_OPTIONS = [
  { value: 'gemini-3.1-pro-preview', label: '⭐ Gemini 3.1 Pro', desc: 'El más inteligente (lento, requiere Blaze)', group: 'preview' },
  { value: 'gemini-3-flash-preview', label: '🚀 Gemini 3.0 Flash', desc: 'Rápido + nueva generación', group: 'preview' },
  { value: 'gemini-3.1-flash-lite-preview', label: '⚡ Gemini 3.1 Flash Lite', desc: 'Ultra rápido, costo bajo', group: 'preview' },
  { value: 'gemini-2.5-flash', label: '✅ Gemini 2.5 Flash', desc: 'Estable y eficiente (recomendado)', group: 'stable' },
  { value: 'gemini-2.5-flash-lite', label: '💨 Gemini 2.5 Flash Lite', desc: 'Estable, ultra ligero', group: 'stable' },
  { value: 'gemini-2.5-pro', label: '🧠 Gemini 2.5 Pro', desc: 'Estable, más inteligente', group: 'stable' },
] as const;
