/**
 * SinergIA WhatsApp Module — Type Re-exports
 * Centralizes all WhatsApp-related types for self-contained portability.
 * When cloning this module, update the import path to match the target project.
 */

export type {
  WhatsAppAgentConfig,
  WhatsAppTemplate,
  WhatsAppConversation,
  WhatsAppMessage,
} from '@/types';

// Re-export adjacent types used by the config panel
export type Doctor = any;
export type Office = any;
