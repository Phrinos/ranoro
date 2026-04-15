
// src/lib/money-helpers.ts
import type { ServiceRecord, Payment, InventoryItem, SaleReceipt } from "@/types";
import { inventoryService } from './services/inventory.service';

export const CARD_RATE = 0.0406;        // 4.06% neto (3.5% + IVA)
export const CARD_MSI_3_RATE = 0.09512; // 9.512% neto (8.2% + IVA)
export const CARD_MSI_6_RATE = 0.12992; // 12.992% neto (11.2% + IVA)
export const CARD_MSI_9_RATE = 0.17052; // 17.052% neto (14.7% + IVA)
export const CARD_MSI_12_RATE = 0.1972;  // 19.72% neto (17.0% + IVA)
export const CARD_MSI_18_RATE = 0.2668;  // 26.68% neto (23.0% + IVA)
export const CARD_MSI_24_RATE = 0.3364;  // 33.64% neto (29.0% + IVA)

export function getCardCommissionRate(method: string | undefined): number {
  if (method === 'Tarjeta 24 MSI') return CARD_MSI_24_RATE;
  if (method === 'Tarjeta 18 MSI') return CARD_MSI_18_RATE;
  if (method === 'Tarjeta 12 MSI') return CARD_MSI_12_RATE;
  if (method === 'Tarjeta 9 MSI') return CARD_MSI_9_RATE;
  if (method === 'Tarjeta 6 MSI') return CARD_MSI_6_RATE;
  if (method === 'Tarjeta 3 MSI' || method === 'Tarjeta MSI') return CARD_MSI_3_RATE;
  if (method === 'Tarjeta') return CARD_RATE;
  return 0;
}

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
  let commission = 0;
  
  if (payments && payments.length > 0) {
    for (const p of payments) {
      commission += (p.amount || 0) * getCardCommissionRate(p.method);
    }
  } else if (fallbackPayment) {
    commission += total * getCardCommissionRate(fallbackPayment);
  }

  return Math.round(commission * 100) / 100;
}

/** Ganancia efectiva: (total de la venta) - (costo de insumos) - (comisión de tarjeta) */
export function calcEffectiveProfit(s: ServiceRecord, allInventory: InventoryItem[] = []): number {
  const total = calcTotalFromItems(s.serviceItems);
  
  const supplies = calcSuppliesCostFromItems(s.serviceItems, allInventory);

  const hasCardSignals =
    (s.payments?.some(p => getCardCommissionRate(p.method) > 0) ?? false) ||
    getCardCommissionRate(s.paymentMethod) > 0;

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
