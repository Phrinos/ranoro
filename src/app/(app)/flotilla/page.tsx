// src/app/(app)/flotilla/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FlotillaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main vehicles page for the flotilla module
    router.replace('/flotilla/vehiculos');
  }, [router]);

  return (
    <div>
      <p>Redireccionando a la sección de vehículos...</p>
    </div>
  );
}
