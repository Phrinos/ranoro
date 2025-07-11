
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromFirestore, placeholderUsers, AUTH_USER_LOCALSTORAGE_KEY, persistToFirestore, defaultSuperAdmin } from '@/lib/placeholder-data';
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { auth } from '@/lib/firebaseClient.js';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';

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

  useEffect(() => {
    // This check is crucial for Firebase to work. If it's not configured, nothing will work.
    if (!auth) {
      console.error("Firebase no está configurado. La aplicación no puede funcionar. Revisa tu archivo firebaseClient.js");
      toast({ title: "Error Crítico de Configuración", description: "La conexión con Firebase no está disponible.", variant: "destructive", duration: Infinity });
      setAuthStatus('unauthenticated'); // Prevent infinite loading
      setIsHydrating(false);
      // Don't route here, as it might cause loops. Let the component render a message or fail.
      return; 
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setAuthStatus('authenticated');
        setIsHydrating(true);
        try {
          // Attempt to hydrate all app data from the tenant document
          await hydrateFromFirestore();

          // After hydrating, find the specific app user profile from the now-hydrated placeholderUsers
          let appUser = placeholderUsers.find(u => u.id === firebaseUser.uid);

          // If user exists in Firebase Auth but not in our user collection (e.g., first login for a pre-seeded auth user)
          if (!appUser && firebaseUser.email) {
            console.log(`User with UID ${firebaseUser.uid} not found. Attempting to create profile...`);

            // This is a new user or a user whose profile doesn't exist yet.
            // Create a new user profile object.
            const newUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
              role: 'Tecnico', // Default role for new users
              tenantId: defaultSuperAdmin.tenantId, // Assign the default tenantId
            };
            
            // Add the new user to the local placeholder array
            placeholderUsers.push(newUser);
            
            // Persist ONLY the users array to Firestore, which now includes the new user.
            // The security rules allow a user to create their own profile.
            await persistToFirestore(['users']);
            
            appUser = newUser; // Set the newly created user as the current appUser
            toast({ title: "¡Bienvenido!", description: `Hemos creado un perfil para ti.` });
          }

          // At this point, appUser should exist.
          if (appUser) {
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(appUser));
            setIsHydrating(false);
          } else {
            // This case should ideally not be reached, but as a fallback:
            throw new Error("No se pudo encontrar o crear un perfil de usuario.");
          }

        } catch (error: any) {
          console.error("Error during hydration or user setup:", error);
          toast({ title: "Error de Carga", description: error.message || "No se pudieron cargar los datos del taller. Por favor, intente de nuevo.", variant: "destructive", duration: 5000 });
          await signOut(auth);
          setAuthStatus('unauthenticated');
          router.push('/login');
        }
      } else {
        setAuthStatus('unauthenticated');
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router, toast]);


  if (authStatus === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-lg ml-4">Iniciando aplicación...</p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return null;
  }
  
  if (isHydrating) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-lg ml-4">Cargando datos del taller...</p>
        </div>
      );
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
