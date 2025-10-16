
// src/app/api/services/[id]/confirm/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb, serverTimestamp } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const db = getAdminDb();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;                  // 👈 Next 15: await params
    const publicId = (id ?? "").trim();
    if (!publicId) {
      return NextResponse.json(
        { success: false, error: "Falta el ID del servicio." },
        { status: 400 }
      );
    }

    // Admin SDK (no uses `doc` del cliente aquí)
    const serviceDocRef = db.collection("serviceRecords").doc(publicId);
    const serviceSnap = await serviceDocRef.get();

    if (!serviceSnap.exists) {                     // 👈 propiedad, no método
      return NextResponse.json(
        { success: false, error: "El servicio no fue encontrado." },
        { status: 404 }
      );
    }

    const serviceData = serviceSnap.data() as {
      status?: string;
      appointmentStatus?: string;
    };

    // Validación de estado
    if (
      serviceData?.status !== "Agendado" ||
      serviceData?.appointmentStatus !== "Sin Confirmar"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Esta cita no se puede confirmar o ya fue confirmada.",
        },
        { status: 409 }
      );
    }

    const updateData = { appointmentStatus: "Confirmada" as const, updatedAt: serverTimestamp() };

    // Batch Admin SDK
    const batch = db.batch();
    batch.update(serviceDocRef, updateData);

    const publicDocRef = db.collection("publicServices").doc(publicId);
    batch.set(publicDocRef, updateData, { merge: true });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "Cita confirmada correctamente.",
    });
  } catch (error) {
    console.error("Error al confirmar la cita:", error);
    const msg =
      error instanceof Error
        ? error.message
        : "Ocurrió un error desconocido en el servidor.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
