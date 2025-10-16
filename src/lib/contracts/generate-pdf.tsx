"use client";
import { pdf } from "@react-pdf/renderer";
import { LeasePdf } from "./LeasePdf";
import type { LeaseContractInput } from "./types";
import React from 'react';
import type { DocumentProps } from "@react-pdf/renderer";

export async function generateLeaseContractPdf(input: LeaseContractInput): Promise<Blob> {
  const element = React.createElement(LeasePdf, { data: input }) as unknown as React.ReactElement<DocumentProps>;
  const instance = pdf(element);
  const blob = await instance.toBlob();
  return blob;
}
