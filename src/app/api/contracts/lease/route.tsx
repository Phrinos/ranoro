// src/app/api/contracts/lease/route.tsx
import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { LeasePdf } from "@/lib/contracts/LeasePdf";
import type { LeaseContractInput } from "@/lib/contracts/types";

// Forzar runtime Node para @react-pdf/renderer (Edge NO funciona)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as LeaseContractInput;

    const element = React.createElement(LeasePdf, { data });
    const buffer = await pdf(element).toBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="contrato-${data?.contractId ?? "lease"}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "No se pudo generar el PDF del contrato." },
      { status: 500 }
    );
  }
}
