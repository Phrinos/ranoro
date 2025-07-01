"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { auth } from '@/lib/firebaseClient.js';
import { hydrateFromFirestore, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [authStatus, setAuthStatus] = useState<'loading' | 'unauthenticated' | 'authenticated'>('loading');
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.warn("Firebase not configured for Admin area. Running in mock auth mode.");
      setAuthStatus('authenticated');
      setIsHydrating(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthStatus('authenticated');
        setIsHydrating(true);
        try {
          await hydrateFromFirestore();

          const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
          if (authUserString) {
            const appUser: User = JSON.parse(authUserString);
            if (appUser.role !== 'Superadmin' && appUser.role !== 'Admin') {
               toast({ title: "Acceso Denegado", description: "No tienes permisos para acceder a esta sección.", variant: "destructive" });
               router.replace('/dashboard');
               return;
            }
          } else {
             toast({ title: "Sesión no válida", description: "Por favor, inicie sesión de nuevo.", variant: "destructive" });
             router.replace('/login');
             return;
          }
          setIsHydrating(false);

        } catch (error) {
          console.error("Hydration failed in AdminLayout:", error);
          toast({ title: "Error de Carga", description: "No se pudieron cargar los datos del taller.", variant: "destructive" });
          await signOut(auth).catch(() => {});
          router.replace('/login');
        }
      } else {
        setAuthStatus('unauthenticated');
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router, toast]);


  if (authStatus === 'loading' || isHydrating) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/40">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-lg ml-4">Cargando sección de administración...</p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
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
