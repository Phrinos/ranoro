
// src/app/(public)/s/actions.ts
"use server";

import { getAdminDb, serverTimestamp } from "@/lib/firebaseAdmin";
import type { ServiceRecord } from "@/types";

type DataResult<T> = { data: T | null; error: string | null };
type ActionResult = { success: boolean; error?: string };

const db = getAdminDb();

export async function getPublicServiceData(publicId: string): Promise<DataResult<ServiceRecord>> {
  try {
    const ref = db.collection("publicServices").doc(publicId);
    const snap = await ref.get();
    if (!snap.exists) {
      return { data: null, error: "El servicio no fue encontrado o el enlace es incorrecto." };
    }
    const service = snap.data() as ServiceRecord;
    return { data: { ...service, id: snap.id }, error: null };
  } catch (e) {
    console.error("getPublicServiceData error:", e);
    return { data: null, error: "Ocurrió un error al cargar la información del servicio." };
  }
}

export async function scheduleAppointmentAction(publicId: string, scheduledDate: string): Promise<ActionResult> {
  try {
    const publicRef = db.collection("publicServices").doc(publicId);
    const publicSnap = await publicRef.get();
    if (!publicSnap.exists) throw new Error("El documento público del servicio no existe.");

    const serviceId = (publicSnap.data() as any)?.serviceId || publicId;
    const mainRef = db.collection("serviceRecords").doc(serviceId);

    const updateData = {
      status: "Agendado",
      appointmentDateTime: scheduledDate,
      appointmentStatus: "Sin Confirmar",
      updatedAt: serverTimestamp(),
    };

    await db.runTransaction(async (trx) => {
      trx.update(mainRef, updateData);
      trx.update(publicRef, updateData);
    });

    return { success: true };
  } catch (e: any) {
    console.error("[SERVER] scheduleAppointmentAction error:", e);
    return { success: false, error: e?.message ?? "Error desconocido al agendar" };
  }
}

export async function confirmAppointmentAction(publicId: string): Promise<ActionResult> {
  try {
    const publicRef = db.collection("publicServices").doc(publicId);
    const publicSnap = await publicRef.get();
    if (!publicSnap.exists) throw new Error("Documento no encontrado.");

    const serviceId = (publicSnap.data() as any)?.serviceId || publicId;
    const mainRef = db.collection("serviceRecords").doc(serviceId);

    const updateData = { appointmentStatus: "Confirmada", updatedAt: serverTimestamp() };

    await db.runTransaction(async (trx) => {
      trx.update(mainRef, updateData);
      trx.update(publicRef, updateData);
    });

    return { success: true };
  } catch (e: any) {
    console.error("confirmAppointmentAction error:", e);
    return { success: false, error: e?.message ?? "Error desconocido" };
  }
}

export async function cancelAppointmentAction(publicId: string): Promise<ActionResult> {
  try {
    const publicRef = db.collection("publicServices").doc(publicId);
    const publicSnap = await publicRef.get();
    if (!publicSnap.exists) throw new Error("Documento no encontrado.");

    const serviceId = (publicSnap.data() as any)?.serviceId || publicId;
    const mainRef = db.collection("serviceRecords").doc(serviceId);

    const updateData = { status: "Cancelado", appointmentStatus: "Cancelada", updatedAt: serverTimestamp() };

    await db.runTransaction(async (trx) => {
      trx.update(mainRef, updateData);
      trx.update(publicRef, updateData);
    });

    return { success: true };
  } catch (e: any) {
    console.error("cancelAppointmentAction error:", e);
    return { success: false, error: e?.message ?? "Error desconocido" };
  }
}

export async function saveSignatureAction(
  publicId: string,
  signature: string,
  type: "reception" | "delivery"
): Promise<ActionResult> {
  try {
    const publicRef = db.collection("publicServices").doc(publicId);
    const publicSnap = await publicRef.get();
    if (!publicSnap.exists) throw new Error("Documento no encontrado.");

    const serviceId = (publicSnap.data() as any)?.serviceId || publicId;
    const mainRef = db.collection("serviceRecords").doc(serviceId);

    const field =
      type === "reception"
        ? { customerSignatureReception: signature }
        : { customerSignatureDelivery: signature };

    const updateData = { ...field, updatedAt: serverTimestamp() };

    await db.runTransaction(async (trx) => {
      trx.update(mainRef, updateData);
      trx.update(publicRef, updateData);
    });

    return { success: true };
  } catch (e: any) {
    console.error("saveSignatureAction error:", e);
    return { success: false, error: e?.message ?? "Error desconocido" };
  }
}
