// src/app/(app)/listadeprecios/lib/pricing-calc.ts

import type { PricingGroup, ServiceTemplate, ServiceComponent, PartVariant } from "@/types";

/**
 * Overrides: map of partCategoryName → variant label selected by the user/AI.
 * If a category is not in overrides, the defaultVariant from the component is used.
 */
export type VariantOverrides = Record<string, string>;

export interface ServiceLineItem {
  description: string;   // "4× Bujía Iridio NGK"
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitCost: number;
  totalCost: number;
}

export interface ServicePriceResult {
  serviceName: string;
  laborPrice: number;
  laborCost: number;
  lines: ServiceLineItem[];
  totalPrice: number;   // What the customer pays
  totalCost: number;    // Internal cost
  margin: number;       // totalPrice - totalCost
}

/** Returns the variant that matches a given label (case-insensitive) */
export function findVariant(group: PricingGroup, categoryName: string, variantLabel: string): PartVariant | null {
  const cat = group.partCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
  if (!cat) return null;
  return cat.variants.find(v => v.label.toLowerCase() === variantLabel.toLowerCase()) ?? null;
}

/** Returns the default variant for a component */
export function getDefaultVariant(group: PricingGroup, comp: ServiceComponent): PartVariant | null {
  return findVariant(group, comp.partCategoryName, comp.defaultVariant);
}

/** Calculates the price of a single service given optional variant overrides */
export function calcServicePrice(group: PricingGroup, service: ServiceTemplate, overrides: VariantOverrides = {}): ServicePriceResult {
  const lines: ServiceLineItem[] = [];

  for (const comp of service.components) {
    const variantLabel = overrides[comp.partCategoryName] ?? comp.defaultVariant;
    const variant = findVariant(group, comp.partCategoryName, variantLabel);
    if (!variant) continue;

    const cat = group.partCategories.find(c => c.name === comp.partCategoryName);
    const quantity = comp.useOilCapacity ? group.oilCapacityLiters : comp.quantity;
    const label = `${quantity}${comp.useOilCapacity ? "L" : "×"} ${comp.partCategoryName} ${variant.label} ${variant.brand}`.trim();

    lines.push({
      description: label,
      quantity,
      unitPrice: variant.price,
      totalPrice: quantity * variant.price,
      unitCost: variant.cost,
      totalCost: quantity * variant.cost,
    });
  }

  const partsPrice = lines.reduce((s, l) => s + l.totalPrice, 0);
  const partsCost = lines.reduce((s, l) => s + l.totalCost, 0);
  const totalPrice = service.laborPrice + partsPrice;
  const totalCost = service.laborCost + partsCost;

  return {
    serviceName: service.name,
    laborPrice: service.laborPrice,
    laborCost: service.laborCost,
    lines,
    totalPrice,
    totalCost,
    margin: totalPrice - totalCost,
  };
}

/** Calculates all services in a group with optional overrides */
export function calcAllServices(group: PricingGroup, overrides: VariantOverrides = {}): ServicePriceResult[] {
  return group.services.map(s => calcServicePrice(group, s, overrides));
}

/** Generates a human-readable group name from its vehicles */
export function generateGroupName(group: Pick<PricingGroup, "vehicles">): string {
  if (!group.vehicles.length) return "Nuevo Grupo";
  
  const makes = [...new Set(group.vehicles.map(v => v.make))].join(" / ");
  const models = [...new Set(group.vehicles.map(v => v.model))].join(" / ");
  const engines = [...new Set(group.vehicles.map(v => v.engine).filter(Boolean))];
  const yearFrom = Math.min(...group.vehicles.map(v => v.yearFrom));
  const yearTo = Math.max(...group.vehicles.map(v => v.yearTo));
  
  let name = `${makes} ${models}`;
  if (engines.length) name += ` ${engines.join("/")}`;
  name += ` (${yearFrom}–${yearTo})`;
  return name;
}

/** Default part categories when creating a new group */
export const DEFAULT_PART_CATEGORIES = [
  { name: "Aceite", unit: "litro", variants: [] },
  { name: "Filtro de Aceite", unit: "pieza", variants: [] },
  { name: "Filtro de Aire", unit: "pieza", variants: [] },
  { name: "Bujía", unit: "pieza", variants: [] },
  { name: "Bomba de Gasolina", unit: "pieza", variants: [] },
  { name: "Amortiguador Delantero", unit: "par", variants: [] },
  { name: "Amortiguador Trasero", unit: "par", variants: [] },
  { name: "Balatas Delanteras", unit: "juego", variants: [] },
  { name: "Balatas Traseras", unit: "juego", variants: [] },
];
