// src/app/(app)/listadeprecios/lib/pricing-calc.ts
import type { PricingGroup, VehiclePart, ServiceTemplate, ServiceComponent, OilType } from "@/types";

export interface ServicePriceResult {
  serviceName: string;
  laborPrice: number;
  laborCost: number;
  lines: { description: string; quantity: number; unitPrice: number; total: number; unitCost: number; totalCost: number }[];
  totalPrice: number;
  totalCost: number;
  margin: number;
}

export function calcServicePrice(
  group: PricingGroup,
  service: ServiceTemplate,
  oils: OilType[]
): ServicePriceResult {
  const partsMap = new Map<string, VehiclePart>(group.parts.map(p => [p.id, p]));
  const oilsMap = new Map<string, OilType>(oils.map(o => [o.id, o]));
  const lines: ServicePriceResult["lines"] = [];

  for (const comp of service.components) {
    if (comp.type === "part" && comp.partId) {
      const part = partsMap.get(comp.partId);
      if (!part) continue;
      const qty = comp.quantity ?? 1;
      lines.push({
        description: `${qty}× ${part.typeName} ${part.brand}${part.partNumber ? ` (${part.partNumber})` : ""}`,
        quantity: qty,
        unitPrice: part.price,
        total: qty * part.price,
        unitCost: part.cost,
        totalCost: qty * part.cost,
      });
    } else if (comp.type === "oil" && comp.oilId) {
      const oil = oilsMap.get(comp.oilId);
      if (!oil) continue;
      const qty = comp.useOilCapacity ? group.oilCapacityLiters : (comp.oilQuantity ?? 1);
      lines.push({
        description: `${qty}L ${oil.name} ${oil.brand}`,
        quantity: qty,
        unitPrice: oil.pricePerLiter,
        total: qty * oil.pricePerLiter,
        unitCost: oil.costPerLiter,
        totalCost: qty * oil.costPerLiter,
      });
    }
  }

  const partsPrice = lines.reduce((s, l) => s + l.total, 0);
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

export function generateGroupName(vehicles: PricingGroup["vehicles"]): string {
  if (!vehicles?.length) return "Nuevo Grupo";
  const makes = [...new Set(vehicles.map(v => v.make))].join("/");
  const models = [...new Set(vehicles.map(v => v.model))].join("/");
  const engines = [...new Set(vehicles.map(v => v.engine).filter(Boolean))];
  const yearFrom = Math.min(...vehicles.map(v => v.yearFrom));
  const yearTo = Math.max(...vehicles.map(v => v.yearTo));
  let name = `${makes} ${models}`;
  if (engines.length) name += ` ${engines.join("/")}`;
  name += ` (${yearFrom}–${yearTo})`;
  return name;
}

export const DEFAULT_PART_TYPES = [
  { name: "Bujía Cobre", unit: "pieza" },
  { name: "Bujía Platino", unit: "pieza" },
  { name: "Bujía Iridio", unit: "pieza" },
  { name: "Filtro de Aceite", unit: "pieza" },
  { name: "Filtro de Aire", unit: "pieza" },
  { name: "Bomba de Gasolina", unit: "pieza" },
  { name: "Amortiguador Delantero", unit: "par" },
  { name: "Amortiguador Trasero", unit: "par" },
  { name: "Balatas Delanteras", unit: "juego" },
  { name: "Balatas Traseras", unit: "juego" },
];
