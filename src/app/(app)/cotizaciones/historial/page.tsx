// src/app/(app)/cotizaciones/historial/page.tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export default function CotizacionesPageWrapper() {
  const router = useRouter();
  
  // Redirect to the unified services history page, filtered for quotes
  React.useEffect(() => {
    router.replace('/servicios/historial?status=Cotizacion');
  }, [router]);

  return (
    <div className="flex h-64 w-full items-center justify-center">
        Cargando...
    </div>
  );
}
