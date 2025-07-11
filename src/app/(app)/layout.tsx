
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromFirestore, AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin, persistToFirestore, placeholderUsers } from '@/lib/placeholder-data';
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { auth, db } from '@/lib/firebaseClient.js';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';
import { doc, getDoc, setDoc } from 'firebase/firestore';

declare global {
  interface Window {
    __APP_HYDRATED__?: boolean;
  }
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [authStatus, setAuthStatus] = useState<'loading' | 'unauthenticated' | 'authenticated'>('loading');
  const [isHydrating, setIsHydrating] = useState(true);

  const handleLogout = useCallback(async (message?: string) => {
      if (auth) {
        await signOut(auth);
      }
      localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
      setAuthStatus('unauthenticated');
      if (message) {
        toast({ title: "Error de Acceso", description: message, variant: "destructive" });
      }
      router.push('/login');
  }, [router, toast]);

  useEffect(() => {
    if (!auth || !db) {
      console.error("Firebase no está configurado. La aplicación no puede funcionar.");
      toast({ title: "Error Crítico de Configuración", description: "La conexión con Firebase no está disponible.", variant: "destructive", duration: Infinity });
      setAuthStatus('unauthenticated');
      setIsHydrating(false);
      return; 
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          setIsHydrating(true);
          
          // STEP 1: Get or Create User Profile
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            console.log(`Creando perfil para el nuevo usuario: ${firebaseUser.uid}`);
            const newUserProfile: User = { ...defaultSuperAdmin, id: firebaseUser.uid, email: firebaseUser.email! };
            await setDoc(userDocRef, newUserProfile); // Create profile first
            userDocSnap = await getDoc(userDocRef); // Re-fetch to confirm creation
            
            if (!userDocSnap.exists()) {
                 throw new Error("No se pudo crear y recuperar el perfil de usuario inicial.");
            }
          }
          const appUser = userDocSnap.data() as User;
          
          // STEP 2: Hydrate workshop data using the confirmed user profile
          await hydrateFromFirestore(appUser);
          
          // STEP 3: Set local state and finish loading
          localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(appUser));
          setAuthStatus('authenticated');
          setIsHydrating(false);

        } catch (error: any) {
          console.error("Error durante la autenticación o carga de datos:", error);
          await handleLogout(error.message || "Error al cargar los datos del taller.");
        }
      } else {
        setAuthStatus('unauthenticated');
        setIsHydrating(false); // No user, stop hydrating
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router, toast, handleLogout]);


  if (authStatus === 'loading' || isHydrating) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-lg ml-4">{authStatus === 'loading' ? 'Verificando sesión...' : 'Cargando datos del taller...'}</p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
     // Render nothing, the effect will redirect.
     // This avoids a flash of the login page if already logged in.
    return null;
  }
  
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar key={isHydrating ? 'hydrating' : 'hydrated'} />
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <SidebarTrigger className="h-10 w-10 shadow-lg bg-black text-white" />
      </div>
      <SidebarInset className="flex flex-col">
        <main className="flex-1 overflow-y-auto p-4 pt-20 md:pt-6 lg:p-8">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
