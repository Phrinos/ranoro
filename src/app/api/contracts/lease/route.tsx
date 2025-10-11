// src/app/api/contracts/lease/route.ts
import { NextRequest } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { LeasePdf } from "@/lib/contracts/LeasePdf";
import type { LeaseContractInput } from "@/lib/contracts/types";
import React from 'react';

export const runtime = "nodejs";        // fuerza Node.js (no edge)
export const dynamic = "force-dynamic"; // sin caché estática

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as LeaseContractInput;

    const element = React.createElement(LeasePdf, { data });
    const buffer = await pdf(element).toBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Contrato_Arrendamiento_${(data?.vehicle?.plates || "vehiculo").replace(/\s+/g, "_")}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("PDF generation error:", e);
    return new Response(
      JSON.stringify({ error: "No se pudo generar el PDF." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
