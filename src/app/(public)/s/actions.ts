
// src/app/(public)/s/actions.ts
"use server";

import { getAdminDb, serverTimestamp } from "@/lib/firebaseAdmin";
import type { ServiceRecord } from "@/types";

type DataResult<T> = { data: T | null; error: string | null };
type ActionResult = { success: boolean; error?: string };

const db = getAdminDb();

export async function getPublicServiceData(publicId: string): Promise<DataResult<ServiceRecord>> {
  // helpers
  const normText = (v: any): string | null => {
    if (v == null) return null;
    if (typeof v === "number") return String(v);
    if (typeof v !== "string") return null;
    const t = v.trim();
    if (!t) return null;
    const low = t.toLowerCase();
    if (low === "na" || low === "n/a" || low.includes("no disponible")) return null;
    return t;
  };

  const pick = (...vals: any[]): string | null => {
    for (const v of vals) {
      const s = normText(v);
      if (s) return s;
    }
    return null;
  };

  try {
    const ref = db.collection("publicServices").doc(publicId);
    const snap = await ref.get();

    if (!snap.exists) {
      return { data: null, error: "El servicio no fue encontrado o el enlace es incorrecto." };
    }

    const pub = snap.data() as any;

    // Si ya tiene teléfono, regresamos tal cual
    const existingPhone = pick(pub?.customerPhone);
    if (existingPhone) {
      return { data: { ...pub, id: snap.id } as ServiceRecord, error: null };
    }

    // Intentar “reparar” trayendo la info desde el doc principal
    const serviceId = pick(pub?.serviceId) ?? publicId;

    let main: any = null;
    try {
      const mainSnap = await db.collection("serviceRecords").doc(serviceId).get();
      if (mainSnap.exists) main = mainSnap.data();
    } catch {
      // ignore
    }

    // Intentar desde vehículo (si existe)
    const vehicleId = pick(pub?.vehicleId, main?.vehicleId);
    let vehicle: any = null;
    if (vehicleId) {
      try {
        const vSnap = await db.collection("vehicles").doc(vehicleId).get();
        if (vSnap.exists) vehicle = vSnap.data();
      } catch {
        // ignore
      }
    }

    const repairedPhone = pick(
      pub?.customerPhone,
      main?.customerPhone,
      main?.customer?.phone,
      main?.customer?.phoneNumber,
      vehicle?.ownerPhone,
      vehicle?.phone,
      vehicle?.telefono,
      vehicle?.owner?.phone
    );

    // También podemos reparar nombre si viene vacío (opcional, pero ayuda)
    const repairedName = pick(pub?.customerName, main?.customerName, vehicle?.ownerName, vehicle?.owner?.name);

    const patch: Record<string, any> = {};
    if (repairedPhone) patch.customerPhone = repairedPhone;
    if (repairedName && !pick(pub?.customerName)) patch.customerName = repairedName;

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = serverTimestamp();
      await ref.set(patch, { merge: true });

      // devolver ya “parchado”
      return { data: { ...pub, ...patch, id: snap.id } as ServiceRecord, error: null };
    }

    // no se pudo reparar (no hay teléfono en ningún lado)
    return { data: { ...pub, id: snap.id } as ServiceRecord, error: null };
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
