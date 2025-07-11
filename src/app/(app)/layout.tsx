
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromFirestore, AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin, persistToFirestore } from '@/lib/placeholder-data';
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
          
          let appUser: User | null = null;
          let tenantId: string | null = null;
          
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            console.log(`User profile for ${firebaseUser.uid} not found. Creating...`);
            const newUserProfile: User = { ...defaultSuperAdmin, id: firebaseUser.uid, email: firebaseUser.email! };
            tenantId = newUserProfile.tenantId;

            // Step 1: Create the user profile document FIRST. This is critical for the rules to work.
            await setDoc(userDocRef, newUserProfile);
            
            // Step 2: Now that the user profile exists, check and create the tenant document.
            if(tenantId) {
                const tenantDocRef = doc(db, 'tenants', tenantId);
                const tenantDocSnap = await getDoc(tenantDocRef);
                if (!tenantDocSnap.exists()) {
                    console.log(`Tenant document for ${tenantId} not found. Seeding initial data...`);
                    // This will create the tenant document with initial data including the user list.
                    await persistToFirestore([], tenantId);
                }
            } else {
                 throw new Error("El perfil de Superadmin por defecto no tiene un tenantId asignado.");
            }
            
            userDocSnap = await getDoc(userDocRef); // Re-fetch the user doc
            if (!userDocSnap.exists()) {
                 throw new Error("No se pudo crear el perfil de usuario inicial.");
            }
          }
          
          appUser = userDocSnap.data() as User;
          tenantId = appUser.tenantId || null;
          
          if (!tenantId) {
            await handleLogout("Tu perfil no tiene un taller asignado. Contacta al administrador.");
            return;
          }

          // Step 3: Now that we have the tenantId, hydrate the rest of the data.
          await hydrateFromFirestore(tenantId);
          
          // Step 4: Set local state and finish loading.
          localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(appUser));
          setAuthStatus('authenticated');
          setIsHydrating(false);

        } catch (error: any) {
          console.error("Error during authentication or data hydration:", error);
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
