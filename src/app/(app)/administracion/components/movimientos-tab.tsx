// src/app/(app)/administracion/components/movimientos-tab.tsx
"use client";

/**
 * Movimientos Tab — wraps DetallesReporteContent and adds
 * manual cash entry / exit buttons for the taller.
 *
 * Data is already filtered (no flotilla) at the useAdminData hook level.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { ServiceRecord, SaleReceipt, CashDrawerTransaction, User, InventoryItem } from "@/types";
import type { AdminPurchase } from "../hooks/use-admin-data";
import { ManualCashDialog } from "./dialogs/manual-cash-dialog";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const DetallesReporteContent = dynamic(
  () => import("@/app/(app)/administracion/components/detalles-reporte-content"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface Props {
  services: ServiceRecord[];
  sales: SaleReceipt[];
  cashTransactions: CashDrawerTransaction[];
  users: User[];
  purchases: AdminPurchase[];
  inventoryItems: InventoryItem[];
}

export function MovimientosTab({ services, sales, cashTransactions, users, purchases, inventoryItems }: Props) {
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [cashDialogType, setCashDialogType] = useState<"Entrada" | "Salida">("Entrada");

  const openDialog = (type: "Entrada" | "Salida") => {
    setCashDialogType(type);
    setCashDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* ── Quick action buttons ─────────────────────────────────────── */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 gap-1.5"
          onClick={() => openDialog("Entrada")}
        >
          <TrendingUp className="h-4 w-4" />
          Registrar Ingreso
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 gap-1.5"
          onClick={() => openDialog("Salida")}
        >
          <TrendingDown className="h-4 w-4" />
          Registrar Salida
        </Button>
      </div>

      {/* ── Main table ───────────────────────────────────────────────── */}
      <DetallesReporteContent
        services={services}
        sales={sales}
        cashTransactions={cashTransactions}
        users={users}
        purchases={purchases as any}
        inventoryItems={inventoryItems}
      />

      {/* ── Manual cash dialog ────────────────────────────────────────── */}
      <ManualCashDialog
        open={cashDialogOpen}
        defaultType={cashDialogType}
        onOpenChange={setCashDialogOpen}
      />
    </div>
  );
}
