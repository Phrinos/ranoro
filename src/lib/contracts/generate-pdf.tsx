"use client";
import { pdf } from "@react-pdf/renderer";
import { LeasePdf } from "./LeasePdf";
import type { LeaseContractInput } from "./types";
import React from 'react';

export async function generateLeaseContractPdf(input: LeaseContractInput): Promise<Blob> {
  const instance = pdf(React.createElement(LeasePdf, { data: input }));
  const blob = await instance.toBlob();
  return blob;
}
