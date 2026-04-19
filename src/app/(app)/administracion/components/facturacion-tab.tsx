// src/app/(app)/administracion/components/facturacion-tab.tsx
"use client";

/**
 * Facturación Tab — migra el contenido de /facturacion-old/page.tsx como tab
 * dentro del módulo de administración.
 */

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const FacturacionContent = dynamic(
  () => import("@/app/(app)/administracion/components/facturacion-content"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

export function FacturacionTab() {
  return <FacturacionContent />;
}
