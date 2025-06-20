
"use client"; // Required for useEffect and useRouter

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authUserString = localStorage.getItem('authUser');
      if (!authUserString) {
        router.replace('/login');
        return;
      }
      try {
        const authUser = JSON.parse(authUserString);
        // Optionally, check for admin role here if needed for /admin routes
        // For now, just being authenticated is enough for this simulation
        if (!authUser || (authUser.role !== 'superadmin' && authUser.role !== 'admin')) {
           // If specific admin roles are required, enforce here
           // toast({ title: "Acceso Denegado", description: "No tienes permisos para acceder a esta sección.", variant: "destructive" });
           // router.replace('/dashboard'); // or '/login'
        }
      } catch (e) {
        console.error("Error parsing authUser from localStorage", e);
        router.replace('/login');
      }
    }
  }, [router, pathname]);

  // Prevent rendering children if redirecting
  if (typeof window !== 'undefined' && !localStorage.getItem('authUser') && pathname !== '/login') {
    return null; 
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <Link href="/dashboard">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver al Panel</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Panel de Administración
        </h1>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
        {children}
      </main>
    </div>
  );
}
