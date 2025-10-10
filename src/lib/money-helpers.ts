// src/lib/money-helpers.ts
import type { ServiceRecord, Payment } from "@/types";

export const CARD_RATE = 0.041;  // 4.1%
export const MSI_RATE  = 0.12;   // 12%

export function calcTotalFromItems(items: ServiceRecord["serviceItems"]): number {
  return (items ?? []).reduce((s, i) => s + (Number(i.sellingPrice) || 0), 0);
}

export function calcSuppliesCostFromItems(items: ServiceRecord["serviceItems"]): number {
  return (items ?? [])
    .flatMap((i) => i.suppliesUsed ?? [])
    .reduce((s, su) => s + (Number(su.unitPrice) || 0) * Number(su.quantity || 0), 0);
}

export function calcCardCommission(total: number, payments?: Payment[], fallbackPayment?: string): number {
  const hasCard = payments?.some(p => p.method === 'Tarjeta') || fallbackPayment === 'Tarjeta';
  const hasMSI  = payments?.some(p => p.method === 'Tarjeta MSI') || fallbackPayment === 'Tarjeta MSI';
  let c = 0;
  if (hasCard) c += total * CARD_RATE;
  if (hasMSI)  c += total * MSI_RATE;
  return Math.round(c * 100) / 100; // redondeo para evitar flapping
}

/** Ganancia efectiva: (total de la venta) - (costo de insumos) - (comisión de tarjeta) */
export function calcEffectiveProfit(s: ServiceRecord): number {
  const total    = calcTotalFromItems(s.serviceItems);
  const supplies = calcSuppliesCostFromItems(s.serviceItems);

  const hasCardSignals =
    (s.payments?.some(p => p.method === 'Tarjeta' || p.method === 'Tarjeta MSI') ?? false) ||
    s.paymentMethod === 'Tarjeta' || s.paymentMethod === 'Tarjeta MSI';

  const computedCommission = calcCardCommission(total, s.payments, s.paymentMethod as any);
  const persistedCommission = Number(s.cardCommission ?? 0);

  const commission = hasCardSignals
    ? computedCommission
    : (persistedCommission > 0 ? persistedCommission : computedCommission);

  // La ganancia es el total de la venta menos el costo de los insumos y la comisión
  const profit = total - supplies - commission;
  
  return isFinite(profit) ? profit : 0;
}
