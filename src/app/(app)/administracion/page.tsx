// src/app/(app)/administracion/page.tsx
"use client";

import React, { useState } from "react";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminData } from "./hooks/use-admin-data";
import { CorteDiarioTab } from "./components/corte-diario-tab";
import { MovimientosTab } from "./components/movimientos-tab";
import { ResumenMensualTab } from "./components/resumen-mensual-tab";
import { GastosFijosTab } from "./components/gastos-fijos-tab";

const TABS = [
  { value: "corte", label: "Corte de Caja" },
  { value: "movimientos", label: "Movimientos" },
  { value: "resumen", label: "Resumen" },
  { value: "gastos", label: "Gastos Fijos" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function AdminPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) || "corte";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  const {
    services, sales, cashTransactions, users,
    fixedExpenses, purchases, dailyCuts, inventoryItems, isLoading,
  } = useAdminData();

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
        <h1 className="text-2xl font-black tracking-tight">Administración</h1>
        <p className="text-white/60 text-sm mt-0.5">
          Finanzas del taller: corte de caja, movimientos, reportes y facturación.
        </p>
      </div>

      {/* Tab Pills */}
      <div className="flex gap-1 p-1.5 bg-muted/70 backdrop-blur-xs rounded-xl overflow-x-auto ring-1 ring-muted mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={cn(
              "shrink-0 flex-1 min-w-[100px] px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap",
              activeTab === tab.value
                ? "bg-white text-black shadow-md ring-1 ring-black/10 dark:bg-slate-800 dark:text-white dark:ring-white/10 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "corte" && (
          <CorteDiarioTab cashTransactions={cashTransactions} dailyCuts={dailyCuts} />
        )}
        {activeTab === "movimientos" && (
          <MovimientosTab
            services={services}
            sales={sales}
            cashTransactions={cashTransactions}
            users={users}
            purchases={purchases}
            inventoryItems={inventoryItems}
          />
        )}
        {activeTab === "resumen" && (
          <ResumenMensualTab
            services={services}
            sales={sales}
            cashTransactions={cashTransactions}
            purchases={purchases}
            fixedExpenses={fixedExpenses}
          />
        )}
        {activeTab === "gastos" && (
          <GastosFijosTab fixedExpenses={fixedExpenses} />
        )}
      </div>
    </div>
  );
}

export default withSuspense(AdminPageInner, null);
