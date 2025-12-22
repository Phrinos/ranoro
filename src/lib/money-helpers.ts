
// src/lib/money-helpers.ts
import type { ServiceRecord, Payment, InventoryItem, SaleReceipt } from "@/types";
import { inventoryService } from './services/inventory.service';

export const CARD_RATE = 0.041;  // 4.1%
export const MSI_RATE  = 0.12;   // 12%

export function calcTotalFromItems(items: ServiceRecord["serviceItems"]): number {
  return (items ?? []).reduce((s, i) => s + (Number(i.sellingPrice) || 0), 0);
}

export function calcSuppliesCostFromItems(items: ServiceRecord["serviceItems"], allInventory: InventoryItem[] = []): number {
  if (!Array.isArray(items) || !Array.isArray(allInventory)) return 0;
  const inventoryMap = new Map(allInventory.map(i => [i.id, i.unitPrice]));
  
  return items
    .flatMap((i) => i.suppliesUsed ?? [])
    .reduce((s, su) => {
      const unitCost = inventoryMap.get(su.supplyId) ?? su.unitPrice ?? 0;
      return s + (Number(unitCost) || 0) * Number(su.quantity || 0);
    }, 0);
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
export function calcEffectiveProfit(s: ServiceRecord, allInventory: InventoryItem[] = []): number {
  const total = calcTotalFromItems(s.serviceItems);
  
  const supplies = calcSuppliesCostFromItems(s.serviceItems, allInventory);

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

type LegacySale = {
  items: { inventoryItemId: string; unitPrice: number; quantity: number; isService?: boolean }[];
  totalAmount: number;
  cardCommission?: number;
};

type SimplifiedSale = {
  items: { itemId: string; itemName: string; quantity: number; total: number }[];
  totalAmount: number;
  payments?: { method: any; amount: number }[];
};

export function calculateSaleProfit(
  sale: LegacySale | SimplifiedSale,
  allInventory: InventoryItem[]
): number {
  // Si es el formato nuevo, aproximamos costo usando inventario por itemId (si coincide)
  const isSimplified = !('unitPrice' in (sale.items[0] ?? {}));
  if (isSimplified) {
    const items = (sale as SimplifiedSale).items;
    const cost = items.reduce((sum, it: any) => {
      const inv = allInventory.find(x => x.id === it.itemId);
      const unitCost = inv?.unitPrice ?? 0;
      return sum + unitCost * (it.quantity ?? 1);
    }, 0);
    return (sale as SimplifiedSale).totalAmount - cost;
  }
  // Formato legacy original
  const legacy = sale as LegacySale;
  const cost = legacy.items.reduce((sum, it) => {
    const inv = allInventory.find(x => x.id === it.inventoryItemId);
    const unitCost = inv?.unitPrice ?? 0;
    return sum + unitCost * it.quantity;
  }, 0);
  const cardCommission = 'cardCommission' in legacy ? legacy.cardCommission ?? 0 : 0;
  return legacy.totalAmount - cost - (cardCommission ?? 0);
}
