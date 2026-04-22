// src/app/(app)/punto-de-venta/page.tsx
"use client";

import React, { useState } from "react";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosData } from "./hooks/use-pos-data";
import { PosKpis } from "./components/pos-kpis";
import { InventoryTab } from "./components/inventory-tab";
import { CategoriesTab } from "./components/categories-tab";
import { PurchasesTab } from "./components/purchases-tab";
import { SalesTab } from "./components/sales-tab";
import { SuppliersTab } from "./components/suppliers-tab";

const TABS = [
  { value: "inventario", label: "Inventario" },
  { value: "categorias", label: "Categorías" },
  { value: "compras", label: "Compras" },
  { value: "ventas", label: "Ventas" },
  { value: "proveedores", label: "Proveedores" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function PuntoDeVentaPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) || "inventario";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  const { items, categories, suppliers, sales, purchases, payables, isLoading, kpis } = usePosData();

  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black text-white rounded-2xl p-6">
        <h1 className="text-2xl font-black tracking-tight">Punto de Venta</h1>
        <p className="text-white/60 text-sm mt-0.5">
          Inventario, compras, ventas y proveedores en un solo lugar.
        </p>
      </div>

      {/* Tab Pills */}
      <div className="flex gap-1 p-1.5 bg-muted/70 backdrop-blur-xs rounded-xl overflow-x-auto ring-1 ring-muted mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={cn(
              "shrink-0 flex-1 min-w-[90px] px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap",
              activeTab === tab.value
                ? "bg-red-700 text-white shadow-md scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPIs — only on inventory tab */}
      {activeTab === "inventario" && <PosKpis kpis={kpis} />}

      {/* Tab Content */}
      <div>
        {activeTab === "inventario" && (
          <InventoryTab items={items} categories={categories} suppliers={suppliers} />
        )}
        {activeTab === "categorias" && (
          <CategoriesTab categories={categories} />
        )}
        {activeTab === "compras" && (
          <PurchasesTab
            purchases={purchases}
            payables={payables}
            suppliers={suppliers}
            items={items}
            categories={categories}
          />
        )}
        {activeTab === "ventas" && (
          <SalesTab sales={sales} />
        )}
        {activeTab === "proveedores" && (
          <SuppliersTab suppliers={suppliers} purchases={purchases} />
        )}
      </div>
    </div>
  );
}

export default withSuspense(PuntoDeVentaPageInner, null);
