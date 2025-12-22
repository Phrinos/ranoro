
// src/app/(public)/s/actions.ts
"use server";

import { getAdminDb, serverTimestamp } from "@/lib/firebaseAdmin";
import type { ServiceRecord } from "@/types";

type DataResult<T> = { data: T | null; error: string | null };
type ActionResult = { success: boolean; error?: string };

const db = getAdminDb();

export async function getPublicServiceData(publicId: string): Promise<DataResult<ServiceRecord>> {
  const asText = (v: any) => (v == null ? null : String(v).trim() || null);

  try {
    const publicRef = db.collection("publicServices").doc(publicId);
    const publicSnap = await publicRef.get();
    if (!publicSnap.exists) {
      return { data: null, error: "El servicio no fue encontrado o el enlace es incorrecto." };
    }

    const pub = publicSnap.data() as any;

    const hasPhone = !!asText(pub.customerPhone);
    const hasAdvisorSig = !!asText(pub.serviceAdvisorSignatureDataUrl);

    // fast path: ya está completo
    if (hasPhone && hasAdvisorSig) {
      return { data: { ...pub, id: publicSnap.id } as ServiceRecord, error: null };
    }

    const serviceId = asText(pub.serviceId) ?? publicId;
    const mainSnap = await db.collection("serviceRecords").doc(serviceId).get();
    const main = mainSnap.exists ? (mainSnap.data() as any) : null;

    let phone =
      asText(pub.customerPhone) ??
      asText(main?.customerPhone) ??
      asText(main?.customer?.phone) ??
      asText(main?.customer?.phoneNumber);

    let advisorName =
      asText(pub.serviceAdvisorName) ??
      asText(main?.serviceAdvisorName);

    let advisorSig =
      asText(pub.serviceAdvisorSignatureDataUrl) ??
      asText(main?.serviceAdvisorSignatureDataUrl);

    if (!advisorSig) {
      const advisorId = asText(main?.serviceAdvisorId);
      if (advisorId) {
        const uSnap = await db.collection("users").doc(advisorId).get();
        const u = uSnap.exists ? (uSnap.data() as any) : null;
        advisorSig = asText(u?.signatureDataUrl);
        advisorName = advisorName ?? asText(u?.name);
      }
    }

    const patch: Record<string, any> = {};
    if (phone) patch.customerPhone = phone;
    if (advisorName) patch.serviceAdvisorName = advisorName;
    if (advisorSig) patch.serviceAdvisorSignatureDataUrl = advisorSig;

    if (Object.keys(patch).length) {
      patch.updatedAt = serverTimestamp();
      await publicRef.set(patch, { merge: true });
      return { data: { ...pub, ...patch, id: publicSnap.id } as ServiceRecord, error: null };
    }

    return { data: { ...pub, id: publicSnap.id } as ServiceRecord, error: null };
  } catch (e: any) {
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
