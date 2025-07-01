
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromFirestore, placeholderUsers, AUTH_USER_LOCALSTORAGE_KEY, persistToFirestore, defaultSuperAdmin } from '@/lib/placeholder-data';
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { auth } from '@root/lib/firebaseClient.js';
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
    // If Firebase is not configured, run in a mock authenticated mode for local dev
    if (!auth) {
      console.warn("Firebase no está configurado. Ejecutando en modo de desarrollo sin autenticación real.");
      setAuthStatus('authenticated');
      setIsHydrating(false); // Skip hydration from firestore as it would fail
      const mockUser = placeholderUsers.find(u => u.role === 'Superadmin') || defaultSuperAdmin;
      localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(mockUser));
      window.__APP_HYDRATED__ = true; // Manually set hydration flag
      return; // Exit the effect
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log(`Firebase onAuthStateChanged: User detected (UID: ${user.uid}).`);
        setAuthStatus('authenticated');
        
        setIsHydrating(true);
        try {
          await hydrateFromFirestore();
          
          let appUser = placeholderUsers.find(u => u.id === user.uid);
          let needsPersistence = false;
    
          if (!appUser && user.email) {
            console.log(`User with UID ${user.uid} not found. Attempting to link by email: ${user.email}...`);
            const preSeededUserIndex = placeholderUsers.findIndex(u => u.email && u.email.toLowerCase() === user.email!.toLowerCase());
            if (preSeededUserIndex !== -1) {
              console.log(`Found pre-seeded user by email. Linking to Firebase UID.`);
              placeholderUsers[preSeededUserIndex].id = user.uid;
              appUser = placeholderUsers[preSeededUserIndex];
              needsPersistence = true;
            }
          }

          if (appUser) {
            console.log(`App user profile found for ${appUser.email}. Role: ${appUser.role}. Syncing profile info...`);
            
            if (user.displayName && appUser.name !== user.displayName) {
                console.log(`- Syncing name: '${appUser.name}' -> '${user.displayName}'`);
                appUser.name = user.displayName;
                needsPersistence = true;
            }
            if (user.phoneNumber && appUser.phone !== user.phoneNumber) {
                 console.log(`- Syncing phone.`);
                appUser.phone = user.phoneNumber;
                needsPersistence = true;
            }
            
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(appUser));
            
            if (needsPersistence) {
                console.log("Persisting profile updates to database...");
                persistToFirestore(['users']).catch(err => console.error("Failed to persist user data update:", err));
            }

            setIsHydrating(false); 
          } else {
            console.log(`User with UID ${user.uid} not found in app DB. Creating new user record (Just-In-Time)...`);
            
            const newUser: User = {
              id: user.uid,
              email: user.email!,
              name: user.displayName || user.email!.split('@')[0],
              role: 'Tecnico',
              phone: user.phoneNumber || undefined,
            };
            
            placeholderUsers.push(newUser);
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(newUser));
            
            console.log("Persisting new user profile to database...");
            persistToFirestore(['users']).catch(err => {
              console.error("Failed to persist newly created user:", err);
            });
            
            toast({
              title: "¡Bienvenido!",
              description: `Hemos creado un perfil para ti con el rol por defecto.`,
            });
            
            setIsHydrating(false);
          }
        } catch (error) {
          console.error("Hydration failed:", error);
          toast({ title: "Error de Carga", description: "No se pudieron cargar los datos del taller desde la base de datos.", variant: "destructive" });
          await signOut(auth);
        }

      } else {
        console.log("Firebase onAuthStateChanged: No user detected.");
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
  
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar key={isHydrating ? 'hydrating' : 'hydrated'} />
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <SidebarTrigger className="h-10 w-10 shadow-lg bg-black text-white" />
      </div>
      <SidebarInset className="flex flex-col">
        <main className="flex-1 overflow-y-auto p-4 pt-20 md:pt-6 lg:p-8">
          {isHydrating ? (
            <div className="flex h-full w-full items-center justify-center">
               <Loader2 className="h-8 w-8 animate-spin" />
               <p className="text-lg ml-4">Cargando datos del taller...</p>
            </div>
          ) : (
            children
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
