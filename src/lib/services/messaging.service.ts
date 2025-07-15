// src/lib/services/messaging.service.ts

const WHATSAPP_API_VERSION = 'v18.0';

interface SendMessageResponse {
  success: boolean;
  message: string;
  data?: any;
}

const sendTestMessage = async (apiKey: string, fromPhoneNumberId: string, toPhoneNumber: string): Promise<SendMessageResponse> => {
  if (!apiKey || !fromPhoneNumberId) {
    return { success: false, message: 'La API Key y el ID del Número de Teléfono son obligatorios.' };
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${fromPhoneNumberId}/messages`;
  
  const body = {
    messaging_product: 'whatsapp',
    to: toPhoneNumber,
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


export const messagingService = {
  sendTestMessage
};
