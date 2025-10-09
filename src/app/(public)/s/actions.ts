
"use server";

import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAdminDb } from '@/lib/firebaseAdmin'; // Usar la DB de Admin para escribir
import type { ServiceRecord } from "@/types";

type DataResult<T> = { data: T | null; error: string | null };
type ActionResult = { success: boolean; error?: string };

const db = getAdminDb(); // Usar la instancia de Admin DB

/** Cargar la info pública del servicio */
export async function getPublicServiceData(
  publicId: string
): Promise<DataResult<ServiceRecord>> {
  try {
    const serviceDocRef = doc(db, "publicServices", publicId);
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
  console.log("[SERVER] scheduleAppointmentAction called with:", { publicId, scheduledDate });
  try {
    const publicServiceRef = doc(db, "publicServices", publicId);
    const serviceSnap = await getDoc(publicServiceRef);
    if (!serviceSnap.exists()) {
        throw new Error("El documento público del servicio no existe.");
    }
    const serviceId = serviceSnap.data()?.serviceId || publicId;

    const mainServiceRef = doc(db, "serviceRecords", serviceId);

    // Update both documents in a transaction for consistency
    await db.runTransaction(async (transaction) => {
        const updateData = {
            status: "Agendado",
            appointmentDateTime: scheduledDate,
            appointmentStatus: "Sin Confirmar",
            updatedAt: serverTimestamp(),
        };
        transaction.update(mainServiceRef, updateData);
        transaction.update(publicServiceRef, updateData);
    });

    console.log("[SERVER] Firestore update successful for", publicId);
    return { success: true };
  } catch (e: any) {
    console.error("[SERVER] scheduleAppointmentAction error:", e);
    return { success: false, error: e?.message ?? "Error desconocido al agendar" };
  }
}


/** Confirmar la cita por el cliente */
export async function confirmAppointmentAction(
  publicId: string
): Promise<ActionResult> {
  try {
    const publicServiceRef = doc(db, "publicServices", publicId);
    const serviceSnap = await getDoc(publicServiceRef);
    if (!serviceSnap.exists()) throw new Error("Documento no encontrado.");
    const serviceId = serviceSnap.data()?.serviceId || publicId;
    const mainServiceRef = doc(db, "serviceRecords", serviceId);

    const updateData = { appointmentStatus: "Confirmada", updatedAt: serverTimestamp() };

    await db.runTransaction(async (transaction) => {
        transaction.update(mainServiceRef, updateData);
        transaction.update(publicServiceRef, updateData);
    });

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
    const publicServiceRef = doc(db, "publicServices", publicId);
    const serviceSnap = await getDoc(publicServiceRef);
    if (!serviceSnap.exists()) throw new Error("Documento no encontrado.");
    const serviceId = serviceSnap.data()?.serviceId || publicId;
    const mainServiceRef = doc(db, "serviceRecords", serviceId);
    
    const updateData = { status: "Cancelado", appointmentStatus: "Cancelada", updatedAt: serverTimestamp() };
    
    await db.runTransaction(async (transaction) => {
        transaction.update(mainServiceRef, updateData);
        transaction.update(publicServiceRef, updateData);
    });

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
    const publicServiceRef = doc(db, "publicServices", publicId);
    const serviceSnap = await getDoc(publicServiceRef);
    if (!serviceSnap.exists()) throw new Error("Documento no encontrado.");
    const serviceId = serviceSnap.data()?.serviceId || publicId;
    const mainServiceRef = doc(db, "serviceRecords", serviceId);

    const field =
      type === "reception"
        ? { customerSignatureReception: signature }
        : { customerSignatureDelivery: signature };
    
    const updateData = { ...field, updatedAt: serverTimestamp() };
    
    await db.runTransaction(async (transaction) => {
        transaction.update(mainServiceRef, updateData);
        transaction.update(publicServiceRef, updateData);
    });

    return { success: true };
  } catch (e: any) {
    console.error("saveSignatureAction error:", e);
    return { success: false, error: e?.message ?? "Error desconocido" };
  }
}
