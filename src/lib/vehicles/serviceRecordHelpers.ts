// src/lib/vehicles/serviceRecordHelpers.ts

import type { ServiceRecord } from "@/types";
import { isValid } from "date-fns";
import { parseDate } from "@/lib/forms";

export const isDeliveredStatus = (status?: string | null) => {
  const s = (status ?? "").toLowerCase();
  return s.includes("entregado"); // Entregado / Entregado - Pagado / etc.
};

export const getServiceEffectiveDate = (sr: ServiceRecord): Date | null => {
  const a = sr as any;
  return parseDate(
    a.deliveryDateTime ??
      a.deliveredAt ??
      a.deliveryDate ??
      sr.serviceDate ??
      a.date ??
      a.createdAt
  );
};

export const getServiceMileage = (sr: ServiceRecord): number | null => {
  const a = sr as any;
  const candidates = [
    a.mileage,
    a.vehicleMileage,
    a.odometer,
    a.odometro,
    a.km,
    a.currentMileage,
    a.mileageAtService,
  ];

  for (const v of candidates) {
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (!isNaN(n) && n > 0) return n;
  }
  return null;
};

export const pickLatestDeliveredService = (history: ServiceRecord[]) => {
  const rows = history
    .filter((s) => isDeliveredStatus((s as any).status))
    .map((s) => ({
      s,
      date: getServiceEffectiveDate(s),
      mileage: getServiceMileage(s),
    }))
    .filter((x) => x.date && isValid(x.date));

  rows.sort((a, b) => (b.date!.getTime() - a.date!.getTime()));
  return rows[0] ?? null;
};
