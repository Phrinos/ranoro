"use client";
import type { LeaseContractInput } from "@/lib/contracts/types";

export async function generateLeaseContractPdf(input: LeaseContractInput): Promise<Blob> {
  const res = await fetch("/api/contracts/lease", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Fallo al generar contrato: ${res.status} ${txt}`);
  }

  return await res.blob();
}
