/**
 * WhatsApp Module — Shared Constants
 * Configuration defaults, model options, and helpers for the workshop WhatsApp agent.
 */

import type { WhatsAppAgentConfig, WhatsAppTemplate } from './types';

// ── Crypto helper for generating API keys ──────────────────────────

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'rnr_';
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ── Default Configs ────────────────────────────────────────────────

export const DEFAULT_CONFIG: WhatsAppAgentConfig = {
  enabled: false,
  botName: 'Asistente Ranoro',
  workshopName: 'Taller Ranoro',
  defaultCountryCode: '+52',
  baileysHost: '127.0.0.1',
  baileysPort: '3000',
  baileysSessionId: 'ranoro',
  webhookSecret: 'YOUR_SECRET_KEY_HERE',
  greetingMessage: '¡Hola! Soy el asistente virtual del taller. ¿En qué puedo ayudarte?',
  tone: 'profesional-calido',
  emojiLevel: 'moderado',
  customInstructions: '',
  outOfHoursMessage: 'En este momento el taller se encuentra cerrado. Nuestro horario es de Lunes a Viernes 8:30-18:00 y Sábados 8:30-14:00. Déjanos tu mensaje y te responderemos a primera hora.',
  fallbackErrorMessage: 'Disculpa, tuvimos un inconveniente técnico. Por favor envía tu mensaje de nuevo.',
  remindersEnabled: true,
  reminderHoursBefore: 24,
  confirmationHoursBefore: 2,
  pollsEnabled: false,
  messageExpirationHours: 24,
  systemPromptOverride: '',
  sessionTTLHours: 4,
  geminiModel: 'gemini-2.5-flash',
  geminiMaxRetries: 3,
  geminiRetryDelayMs: 6000,
  escalationEnabled: true,
  advisorTakeoverKeyword: '#asesoren',
  aiReturnKeyword: '#asesoroff',
  escalationTimeoutHours: 4,
  autoEscalateOnComplaint: true,
  autoEscalateOnRequest: true,
  escalationMessage: 'Te comunico directamente con nuestro asesor de servicio. Dame unos minutos.',
  returnMessage: 'El asesor ha finalizado la atención. Vuelvo a estar a tu disposición para cotizar servicios o agendar citas.',
  advisorPhoneNumber: '',
  knowledgeBase: '',
  whatsappPhone: '',
};

export const DEFAULT_TEMPLATES: WhatsAppTemplate = {
  welcome: '¡Hola! Soy el asistente virtual del taller. ¿En qué puedo ayudarte? Puedo cotizarte servicios, agendar una cita o darte seguimiento a tu vehículo.',
  reminder: 'Hola {{nombre}} 👋\n\nTe recordamos tu cita de mañana en el taller:\n📅 {{fecha}}\n🕐 {{hora}}\n🚗 {{vehiculo}}\n🔧 {{servicio}}\n\n¿Confirmas tu asistencia? Responde Sí o No.',
  confirmation: '✅ ¡Tu cita ha sido confirmada!\n\n📅 {{fecha}}\n🕐 {{hora}}\n🚗 {{vehiculo}}\n🔧 {{servicio}}\n\n¡Te esperamos en el taller!',
  cancellation: '❌ Tu cita del {{fecha}} a las {{hora}} ha sido cancelada.\n\nSi deseas reagendar, escríbenos o agenda desde aquí: {{link}}',
};

// ── Agenda: horarios del taller ────────────────────────────────────

export const WORKSHOP_SCHEDULE = {
  morningSlot: '08:30',
  afternoonSlot: '13:30',
  slotsPerBlock: 4,
  // Lunes a Viernes: mañana + tarde. Sábado: solo mañana. Domingo: cerrado.
  workDays: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const,
  saturdayAfternoon: false,
} as const;

// ── Gemini Model Options ───────────────────────────────────────────

export const MODEL_OPTIONS = [
  { value: 'gemini-3.1-pro-preview', label: '⭐ Gemini 3.1 Pro', desc: 'El más inteligente (lento, requiere Blaze)', group: 'preview' },
  { value: 'gemini-3-flash-preview', label: '🚀 Gemini 3.0 Flash', desc: 'Rápido + nueva generación', group: 'preview' },
  { value: 'gemini-3.1-flash-lite-preview', label: '⚡ Gemini 3.1 Flash Lite', desc: 'Ultra rápido, costo bajo', group: 'preview' },
  { value: 'gemini-2.5-flash', label: '✅ Gemini 2.5 Flash', desc: 'Estable y eficiente (recomendado)', group: 'stable' },
  { value: 'gemini-2.5-flash-lite', label: '💨 Gemini 2.5 Flash Lite', desc: 'Estable, ultra ligero', group: 'stable' },
  { value: 'gemini-2.5-pro', label: '🧠 Gemini 2.5 Pro', desc: 'Estable, más inteligente', group: 'stable' },
] as const;
