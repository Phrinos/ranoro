

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CotizacionesRedirector() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/servicios?tab=cotizaciones');
  }, [router]);

  return null;
}
