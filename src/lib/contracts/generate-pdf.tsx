"use client";
import { pdf } from "@react-pdf/renderer";
import { LeasePdf } from "./LeasePdf";
import type { LeaseContractInput } from "./types";

export async function generateLeaseContractPdf(input: LeaseContractInput): Promise<Blob> {
  const instance = pdf(<LeasePdf data={input} />);
  const blob = await instance.toBlob();
  return blob;
}
