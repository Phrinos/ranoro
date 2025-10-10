
import React, { Suspense } from 'react';
import AppClientLayout from './AppClientLayout';
import { Loader2 } from 'lucide-react';

// Este es ahora un Componente de Servidor.
// No usa "use client", ni hooks como useState, useEffect, etc.

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      // Este fallback se mostrará mientras se carga el AppClientLayout
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <div className="flex items-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-3 text-lg text-muted-foreground">
              Cargando...
            </span>
          </div>
        </div>
      }
    >
      <AppClientLayout>{children}</AppClientLayout>
    </Suspense>
  );
}
