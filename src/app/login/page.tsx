
"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// This component now immediately redirects to the main dashboard.
// The authentication flow has been removed.
function Redirector() {
    redirect('/dashboard');
    return null; // This will not be rendered.
}

export default function LoginPage() {
  return (
    <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-lg ml-4">Ingresando...</p>
        </div>
    }>
      <Redirector />
    </Suspense>
  );
}
