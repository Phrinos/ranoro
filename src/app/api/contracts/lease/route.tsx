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
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="contrato-arrendamiento.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response("Error al generar el PDF", { status: 500 });
  }
}
