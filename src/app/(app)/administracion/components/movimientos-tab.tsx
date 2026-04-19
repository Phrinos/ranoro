// src/app/(app)/administracion/components/movimientos-tab.tsx
"use client";

/**
 * Movimientos Tab — wraps and reuses the existing DetallesReporteContent
 * which is battle-tested, has all filters, CSV export, and manual entry.
 * 
 * The data is already filtered (no flotilla) at the useAdminData hook level.
 */

import type { ServiceRecord, SaleReceipt, CashDrawerTransaction, User } from "@/types";
import type { AdminPurchase } from "../hooks/use-admin-data";
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
}

export function MovimientosTab({ services, sales, cashTransactions, users, purchases }: Props) {
  return (
    <DetallesReporteContent
      services={services}
      sales={sales}
      cashTransactions={cashTransactions}
      users={users}
      purchases={purchases as any}
    />
  );
}
