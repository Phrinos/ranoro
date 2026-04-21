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
    inventorySaleValue: number;
  };
}

export function PosKpis({ kpis }: PosKpisProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">

      <Card className="border bg-blue-50 border-blue-200 shadow-xs overflow-hidden transition-transform hover:scale-[1.02]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="bg-blue-500 p-1.5 rounded-lg">
              <Package className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-xl font-black text-blue-600">{kpis.totalProducts}</p>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Productos</p>
        </CardContent>
      </Card>

      <Card className="border bg-purple-50 border-purple-200 shadow-xs overflow-hidden transition-transform hover:scale-[1.02]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="bg-purple-500 p-1.5 rounded-lg">
              <Wrench className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-xl font-black text-purple-600">{kpis.totalServices}</p>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Servicios</p>
        </CardContent>
      </Card>

      <Card className="border bg-amber-50 border-amber-200 shadow-xs overflow-hidden transition-transform hover:scale-[1.02]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="bg-amber-500 p-1.5 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-600">{kpis.lowStock}</p>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Stock Bajo</p>
        </CardContent>
      </Card>

      <Card className="border bg-red-50 border-red-200 shadow-xs overflow-hidden transition-transform hover:scale-[1.02]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="bg-red-500 p-1.5 rounded-lg">
              <XCircle className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-xl font-black text-red-600">{kpis.outOfStock}</p>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Sin Stock</p>
        </CardContent>
      </Card>

      {/* Inventory value card — dual: costo + venta */}
      <Card className="border bg-emerald-50 border-emerald-200 shadow-xs overflow-hidden transition-transform hover:scale-[1.02] col-span-2 sm:col-span-1">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="bg-emerald-500 p-1.5 rounded-lg">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">Inventario</span>
          </div>
          <p className="text-lg font-black text-emerald-600 leading-none">{formatCurrency(kpis.inventoryValue)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Valor a costo</p>
          <div className="mt-1.5 pt-1.5 border-t border-emerald-100">
            <p className="text-base font-bold text-emerald-700 leading-none">{formatCurrency(kpis.inventorySaleValue)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Valor a venta</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
