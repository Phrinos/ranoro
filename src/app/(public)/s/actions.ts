
"use server";

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebasePublic";
import type { ServiceRecord } from "@/types";

type DataResult<T> = { data: T | null; error: string | null };
type ActionResult = { success: boolean; error?: string };

const ensureDB = (): string | null =>
  db ? null : "La base de datos no está inicializada.";

/** Cargar la info pública del servicio */
export async function getPublicServiceData(
  publicId: string
): Promise<DataResult<ServiceRecord>> {
  try {
    const dbError = ensureDB();
    if (dbError) return { data: null, error: dbError };

    const serviceDocRef = doc(db!, "publicServices", publicId);
    const snap = await getDoc(serviceDocRef);

    if (!snap.exists()) {
      return {
        data: null,
        error: "El servicio no fue encontrado o el enlace es incorrecto.",
      };
    }

    const service = snap.data() as ServiceRecord;
    return { data: { ...service, id: snap.id }, error: null };
  } catch (e) {
    console.error("getPublicServiceData error:", e);
    return {
      data: null,
      error: "Ocurrió un error al cargar la información del servicio.",
    };
  }
}

/** Agendar una cita */
export async function scheduleAppointmentAction(
  publicId: string,
  scheduledDate: string
): Promise<ActionResult> {
  try {
    const dbError = ensureDB();
    if (dbError) return { success: false, error: dbError };

    const ref = doc(db!, "publicServices", publicId);
    await updateDoc(ref, {
      status: "Agendado",
      appointmentDateTime: scheduledDate,
      appointmentStatus: "Sin Confirmar",
    });
    return { success: true };
  } catch (e: any) {
    console.error("scheduleAppointmentAction error:", e);
    return { success: false, error: e?.message ?? "Error desconocido" };
  }
}

/** Confirmar la cita por el cliente */
export async function confirmAppointmentAction(
  publicId: string
): Promise<ActionResult> {
  try {
    const dbError = ensureDB();
    if (dbError) return { success: false, error: dbError };

    const ref = doc(db!, "publicServices", publicId);
    await updateDoc(ref, { appointmentStatus: "Confirmada" });
    return { success: true };
  } catch (e: any) {
    console.error("confirmAppointmentAction error:", e);
    return { success: false, error: e?.message ?? "Error desconocido" };
  }
}

/** Cancelar la cita */
export async function cancelAppointmentAction(
  publicId: string
): Promise<ActionResult> {
  try {
    const dbError = ensureDB();
    if (dbError) return { success: false, error: dbError };

    const ref = doc(db!, "publicServices", publicId);
    await updateDoc(ref, { status: "Cancelado", appointmentStatus: "Cancelada" });
    return { success: true };
  } catch (e: any) {
    console.error("cancelAppointmentAction error:", e);
    return { success: false, error: e?.message ?? "Error desconocido" };
  }
}

/** Guardar firma (recepción o entrega) */
export async function saveSignatureAction(
  publicId: string,
  signature: string,
  type: "reception" | "delivery"
): Promise<ActionResult> {
  try {
    const dbError = ensureDB();
    if (dbError) return { success: false, error: dbError };

    const ref = doc(db!, "publicServices", publicId);
    const field =
      type === "reception"
        ? { customerSignatureReception: signature }
        : { customerSignatureDelivery: signature };

    await updateDoc(ref, field);
    return { success: true };
  } catch (e: any) {
    console.error("saveSignatureAction error:", e);
    return { success: false, error: e?.message ?? "Error desconocido" };
  }
}
