
import React, { Suspense } from 'react';
import FlotillaClientLayout from './FlotillaClientLayout';
import { Loader2 } from 'lucide-react';

// Este es ahora un Componente de Servidor puro.

export default function FlotillaLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      // Fallback mientras se carga toda la lógica de cliente de Flotilla
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <FlotillaClientLayout>{children}</FlotillaClientLayout>
    </Suspense>
  );
}
