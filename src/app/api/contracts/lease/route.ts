
// src/app/api/contracts/lease/route.ts
import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { LeasePdf } from "@/lib/contracts/LeasePdf";
import type { LeaseContractInput } from "@/lib/contracts/types";
import type { DocumentProps } from "@react-pdf/renderer";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDate(x: unknown, fallback?: Date | null): Date | null {
  if (!x && fallback !== undefined) return fallback ?? null;
  const d = x instanceof Date ? x : new Date(String(x));
  return isNaN(d.getTime()) ? (fallback ?? null) : d;
}

function coerce(input: any): LeaseContractInput {
  const lessor = {
    companyName: input?.lessor?.companyName ?? "",
    name: input?.lessor?.name ?? "",
    rfc: input?.lessor?.rfc ?? "",
    address: input?.lessor?.address ?? "",
    phone: input?.lessor?.phone ?? "",
    representativeName: input?.lessor?.representativeName ?? "",
    representativeTitle: input?.lessor?.representativeTitle ?? "",
  };

  const lessee = {
    name: input?.lessee?.name ?? "",
    rfc: input?.lessee?.rfc ?? "",
    address: input?.lessee?.address ?? "",
    phone: input?.lessee?.phone ?? "",
  };

  const vehicle = {
    make: input?.vehicle?.make ?? "",
    model: input?.vehicle?.model ?? "",
    year: input?.vehicle?.year ?? "",
    color: input?.vehicle?.color ?? "",
    plates: input?.vehicle?.plates ?? "",
    vin: input?.vehicle?.vin ?? "",
    engine: input?.vehicle?.engine ?? "",
    mileageOut: input?.vehicle?.mileageOut ?? null,
    mileageIn: input?.vehicle?.mileageIn ?? null,
  };

  return {
    contractId: input?.contractId ?? undefined,
    signDate: toDate(input?.signDate, new Date())!,    // nunca null
    startDate: toDate(input?.startDate, new Date())!,  // nunca null
    endDate: toDate(input?.endDate, null),
    dailyRate: Number(input?.dailyRate ?? 0),
    deposit: Number(input?.deposit ?? 0),
    place: input?.place ?? "Aguascalientes, Aguascalientes",
    lessor,
    lessee,
    vehicle,
    clausesOverride: Array.isArray(input?.clausesOverride)
      ? input.clausesOverride.map(String)
      : undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}));
    const data = coerce(raw);

    const element = React.createElement(LeasePdf, { data });
    const buffer = await (pdf(element) as any).toBuffer(); // forzamos tipo Buffer
    return new Response(buffer as any, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="contrato-${data?.contractId ?? 'lease'}.pdf"`,
            'Cache-Control': 'no-store',
        },
    });
  } catch (err: any) {
    console.error("Lease PDF error:", err);
    return NextResponse.json(
      {
        error: "No se pudo generar el PDF del contrato.",
        detail: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}
