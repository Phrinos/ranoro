// src/app/(app)/cotizaciones/historial/page.tsx
"use client";

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CotizacionesPageComponent } from './components/page-component';

export default function CotizacionesPageWrapper() {
  const router = useRouter();

  // Redirect to the unified services history page, filtered for quotes
  if (typeof window !== 'undefined') {
    router.replace('/servicios/historial?status=Cotizacion');
  }

  return (
    <div className="flex h-64 w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="ml-3 text-muted-foreground">Redirigiendo a la nueva vista de servicios...</p>
    </div>
  );
}
