// src/app/(app)/punto-de-venta/components/pos-kpis.tsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Wrench, AlertTriangle, XCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PosKpisProps {
  kpis: {
    totalProducts: number;
    totalServices: number;
    lowStock: number;
    outOfStock: number;
    inventoryValue: number;
  };
}

const kpiConfig = [
  {
    key: "totalProducts",
    label: "Productos",
    icon: Package,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-500",
    format: (v: number) => v.toString(),
  },
  {
    key: "totalServices",
    label: "Servicios",
    icon: Wrench,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
    iconBg: "bg-purple-500",
    format: (v: number) => v.toString(),
  },
  {
    key: "lowStock",
    label: "Stock Bajo",
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    iconBg: "bg-amber-500",
    format: (v: number) => v.toString(),
  },
  {
    key: "outOfStock",
    label: "Sin Stock",
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    iconBg: "bg-red-500",
    format: (v: number) => v.toString(),
  },
  {
    key: "inventoryValue",
    label: "Valor Inventario",
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    iconBg: "bg-emerald-500",
    format: (v: number) => formatCurrency(v),
  },
] as const;

export function PosKpis({ kpis }: PosKpisProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpiConfig.map(({ key, label, icon: Icon, color, bg, iconBg, format }) => (
        <Card key={key} className={`border ${bg} shadow-xs overflow-hidden transition-transform hover:scale-[1.02]`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className={`${iconBg} p-1.5 rounded-lg`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className={`text-xl font-black ${color}`}>{format(kpis[key as keyof typeof kpis])}</p>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
