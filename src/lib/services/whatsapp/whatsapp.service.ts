// src/lib/services/whatsapp/whatsapp.service.ts
import { db } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";
import type { ServiceRecord } from "@/types";

// ——— Tipos auxiliares ———
interface WorkshopConfig {
  facturaComApiKey?: string;
  facturaComApiSecret?: string;
  name?: string;
}

export interface ApiResponse {
  status: "success" | "error";
  message: string;
  success?: boolean;
}

const onlyDigits = (s?: string | number) => String(s ?? "").replace(/\D/g, "");

// Carga config del taller (id fijo: "main")
const getWorkshopInfo = async (): Promise<WorkshopConfig | null> => {
  if (!db) return null;
  const ref = doc(db, "workshopConfig", "main");
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as WorkshopConfig) : null;
};

// Enviar confirmación (Factura.com)
export const sendConfirmationMessage = async (
  service: ServiceRecord
): Promise<ApiResponse> => {
  const workshop = await getWorkshopInfo();

  if (!workshop?.facturaComApiKey) {
    return { status: "error", message: "API Key de WhatsApp (Factura.com) no configurada." };
  }

  const headers = new Headers({
    "Content-Type": "application/json",
    "F-API-KEY": String(workshop.facturaComApiKey),
    "F-SECRET-KEY": String(workshop.facturaComApiSecret ?? ""),
  });

  const raw = JSON.stringify({
    to: onlyDigits((service as any)?.customer?.phone ?? (service as any)?.customerPhone),
    body: [
      { name: "customer_name", value: (service as any)?.customer?.name ?? service.customerName ?? "Cliente" },
      { name: "service_date", value: new Date(service.serviceDate ?? Date.now()).toLocaleDateString("es-MX") },
      { name: "workshop_name", value: workshop?.name ?? "" },
    ],
  });

  try {
    const res = await fetch(
      "https://apis.facturacom.co/v3/whatsapp/send-template/appointment_confirmation",
      { method: "POST", headers, body: raw }
    );
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = (result?.message as string) || "Ocurrió un error con Factura.com";
      return { status: "error", message: msg };
    }

    return { status: "success", message: "Mensaje de confirmación enviado." };
  } catch (e: any) {
    return { status: "error", message: e?.message ?? "Error desconocido." };
  }
};

// Enviar prueba (WhatsApp Cloud / Graph API)
export const sendTestMessage = async (
  apiKey: string,
  fromPhoneNumberId: string,
  to: string
): Promise<ApiResponse> => {
  const headers = new Headers({
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  });

  const raw = JSON.stringify({
    messaging_product: "whatsapp",
    to: onlyDigits(to),
    type: "template",
    template: { name: "hello_world", language: { code: "en_US" } },
  });

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`,
      { method: "POST", headers, body: raw }
    );
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage = result?.error?.message || "Error desconocido en la API de WhatsApp.";
      console.error("WhatsApp API Error:", result);
      return { status: "error", message: errorMessage, success: false };
    }

    return { status: "success", message: "Mensaje de prueba enviado.", success: true };
  } catch (error: any) {
    console.error("Fetch Error:", error);
    return { status: "error", message: error?.message ?? "Ocurrió un error.", success: false };
  }
};
