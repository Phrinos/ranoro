// src/lib/money.ts
export const toNumber = (v: unknown, fallback = 0) => {
  if (v === null || v === undefined || v === '') return fallback;
  const n = typeof v === 'bigint' ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const IVA_RATE = 0.16; // fijo MXN 16%

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export const formatMXN = (v: unknown) => MXN.format(toNumber(v, 0));
