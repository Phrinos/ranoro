
import { sendConfirmationMessage } from './whatsapp/whatsapp.service';

/**
 * ----------------------------------------------------------
 * Messaging Service
 * ----------------------------------------------------------
 * This service centralizes all messaging functionalities,
 * including WhatsApp, email, and other communication channels.
 * It acts as a single point of entry for sending messages
 * and abstracts the underlying implementation details.
 * ----------------------------------------------------------
 */
export const messagingService = {
  // WhatsApp messaging
  sendWhatsappConfirmation: sendConfirmationMessage,
};
