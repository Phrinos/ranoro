
import React, { Suspense } from 'react';
import AppClientLayout from './AppClientLayout';
import { Loader2 } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// This is now a Server Component.
// It doesn't use "use client", useState, useEffect, etc.

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const authCookie = cookies().get('AuthToken');

  if (!authCookie) {
    // If there's no auth cookie, redirect to login immediately on the server.
    // This is much faster than a client-side check.
    redirect('/login');
  }
  
  return (
    <Suspense
      // This fallback is shown while the AppClientLayout and its children are loading
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
