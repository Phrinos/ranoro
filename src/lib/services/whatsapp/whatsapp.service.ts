
import { db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import type { ServiceRecord, WorkshopInfo } from '@/types';

// Define the structure for the API response
interface ApiResponse {
  status: 'success' | 'error';
  message: string;
}

// Function to fetch workshop information from Firestore
const getWorkshopInfo = async (): Promise<WorkshopInfo | null> => {
  if (!db) return null;
  const workshopConfigRef = doc(db, 'workshopConfig', 'main');
  const docSnap = await getDoc(workshopConfigRef);
  return docSnap.exists() ? (docSnap.data() as WorkshopInfo) : null;
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
    to: service.customer.phone,
    body: [
      { name: 'customer_name', value: service.customer.name },
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

export const sendTestMessage = async (to: string): Promise<ApiResponse> => {
    const workshopInfo = await getWorkshopInfo();

    if (!workshopInfo?.facturaComApiKey) {
        return { status: 'error', message: 'API Key for WhatsApp is not configured.' };
    }

    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append('F-API-KEY', workshopInfo.facturaComApiKey);
    myHeaders.append('F-SECRET-KEY', workshopInfo.facturaComApiSecret || '');

    const raw = JSON.stringify({
        to: to,
        body: [
            { name: 'customer_name', value: 'Cliente de Prueba' },
            { name: 'service_date', value: new Date().toLocaleDateString('es-MX') },
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

        return { status: 'success', message: 'Test message sent successfully.' };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message };
    }
};
