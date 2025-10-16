import { db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import type { ServiceRecord } from '@/types';

// Define the structure for the API response
interface ApiResponse {
  status: 'success' | 'error';
  message: string;
}

// Function to fetch workshop information from Firestore
const getWorkshopInfo = async (): Promise<any | null> => {
  if (!db) return null;
  const workshopConfigRef = doc(db, 'workshopConfig', 'main');
  const docSnap = await getDoc(workshopConfigRef);
  return docSnap.exists() ? (docSnap.data() as any) : null;
};

// Main function to send a confirmation message
export const sendConfirmationMessage = async (service: ServiceRecord): Promise<ApiResponse> => {
  const workshopInfo = await getWorkshopInfo();

  if (!workshopInfo?.facturaComApiKey) {
    return { status: 'error', message: 'API Key for WhatsApp is not configured.' };
  }

  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');
  myHeaders.append('F-API-KEY', workshopInfo.facturaComApiKey);
  myHeaders.append('F-SECRET-KEY', workshopInfo.facturaComApiSecret || '');

  const raw = JSON.stringify({
    to: (service as any).customer.phone,
    body: [
      { name: 'customer_name', value: (service as any).customer.name },
      { name: 'service_date', value: new Date(service.serviceDate).toLocaleDateString('es-MX') },
      { name: 'workshop_name', value: workshopInfo.name },
    ],
  });

  const requestOptions: RequestInit = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  };

  try {
    const response = await fetch('https://apis.facturacom.co/v3/whatsapp/send-template/appointment_confirmation', requestOptions);
    const result = await response.json();

    if (!response.ok) {
      return { status: 'error', message: result.message || 'An unknown error occurred.' };
    }

    return { status: 'success', message: 'Confirmation message sent successfully.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { status: 'error', message };
  }
};

export const sendTestMessage = async (apiKey: string, fromPhoneNumberId: string, to: string): Promise<ApiResponse> => {
    
    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Bearer ${apiKey}`);
    myHeaders.append('Content-Type', 'application/json');

    const raw = JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
            name: 'hello_world',
            language: {
                code: 'en_US'
            }
        }
    });

    const requestOptions: RequestInit = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`, requestOptions);
        const result = await response.json();

        if (!response.ok) {
            console.error('WhatsApp API Error:', result);
            const errorMessage = result.error?.message || 'Ocurrió un error desconocido con la API de WhatsApp.';
            return { status: 'error', message: errorMessage };
        }

        return { status: 'success', message: 'Mensaje de prueba enviado exitosamente.' };
    } catch (error) {
        console.error('Fetch Error:', error);
        const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
        return { status: 'error', message };
    }
};
