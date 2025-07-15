// src/lib/services/messaging.service.ts

import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from '../firebaseClient';

const WHATSAPP_API_VERSION = 'v18.0';

interface SendMessageResponse {
  success: boolean;
  message: string;
  data?: any;
}

const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, ''); // Remove all non-digit characters
    
    // If it's a 10-digit number (common for Mexico), prepend 52.
    if (cleaned.length === 10) {
        return `52${cleaned}`;
    }
    // If it already includes the country code (e.g., starts with 52), use it as is.
    if (cleaned.length === 12 && cleaned.startsWith('52')) {
        return cleaned;
    }
    
    return cleaned; // Return cleaned number for other cases
};

const sendTestMessage = async (apiKey: string, fromPhoneNumberId: string, toPhoneNumber: string): Promise<SendMessageResponse> => {
  if (!apiKey || !fromPhoneNumberId) {
    return { success: false, message: 'La API Key y el ID del Número de Teléfono son obligatorios.' };
  }

  const formattedToNumber = formatPhoneNumber(toPhoneNumber);
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${fromPhoneNumberId}/messages`;
  
  const body = {
    messaging_product: 'whatsapp',
    to: formattedToNumber,
    type: 'template',
    template: {
      name: 'hello_world', // Template estándar de prueba de Meta
      language: {
        code: 'en_US'
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Error sending WhatsApp message:', responseData);
      const errorMessage = responseData?.error?.message || `Error del servidor: ${response.status}`;
      return { success: false, message: `Error al enviar el mensaje: ${errorMessage}`, data: responseData };
    }

    return { success: true, message: 'Mensaje de prueba enviado exitosamente.', data: responseData };
  } catch (error) {
    console.error('Network or other error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
    return { success: false, message: `Ocurrió un error: ${errorMessage}` };
  }
};

const sendWhatsappImage = async (
  apiKey: string, 
  fromPhoneNumberId: string, 
  toPhoneNumber: string, 
  imageCanvas: HTMLCanvasElement,
  caption?: string,
): Promise<SendMessageResponse> => {
  if (!storage) return { success: false, message: "El servicio de almacenamiento no está disponible." };
  
  // 1. Convert canvas to blob and upload to Firebase Storage
  const imageUrl = await new Promise<string>((resolve, reject) => {
    imageCanvas.toBlob(async (blob) => {
      if (!blob) {
        return reject(new Error("No se pudo crear el blob de la imagen."));
      }
      const storageRef = ref(storage, `whatsapp-tickets/${Date.now()}.png`);
      try {
        const dataUrl = URL.createObjectURL(blob);
        await uploadString(storageRef, dataUrl, 'data_url', {contentType: 'image/png'});
        const downloadURL = await getDownloadURL(storageRef);
        resolve(downloadURL);
      } catch (e) {
        reject(e);
      }
    }, 'image/png');
  });

  // 2. Send the image URL via WhatsApp API
  const formattedToNumber = formatPhoneNumber(toPhoneNumber);
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${fromPhoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to: formattedToNumber,
    type: 'image',
    image: {
      link: imageUrl,
      caption: caption || 'Gracias por su compra.',
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const responseData = await response.json();
    if (!response.ok) {
        throw new Error(responseData?.error?.message || `Error del servidor: ${response.status}`);
    }
    return { success: true, message: 'Imagen enviada por WhatsApp exitosamente.', data: responseData };
  } catch(error) {
    console.error("Error sending WhatsApp image:", error);
    return { success: false, message: `Error al enviar imagen: ${error instanceof Error ? error.message : 'Desconocido'}`};
  }
};


export const messagingService = {
  sendTestMessage,
  sendWhatsappImage
};
