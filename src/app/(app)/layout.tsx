
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromFirestore, placeholderUsers, AUTH_USER_LOCALSTORAGE_KEY, persistToFirestore, defaultSuperAdmin } from '@/lib/placeholder-data';
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { auth } from '@root/lib/firebaseClient.js';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';

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
      (window as any).__APP_HYDRATED__ = true; // Manually set hydration flag
      return; // Exit the effect
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in with Firebase. Immediately show the app shell.
        setAuthStatus('authenticated');
        
        // Start hydration and user validation.
        setIsHydrating(true);
        try {
          await hydrateFromFirestore();
          // Try to find user by UID first (the primary, correct way)
          let appUser = placeholderUsers.find(u => u.id === user.uid);
          let needsPersistence = false;
    
          // If not found by UID, try to find by email for pre-seeded users
          if (!appUser && user.email) {
            const preSeededUserIndex = placeholderUsers.findIndex(u => u.email && u.email.toLowerCase() === user.email!.toLowerCase());
            if (preSeededUserIndex !== -1) {
              // Found a pre-seeded user by email. Update their ID to match the Firebase UID.
              console.log(`Found pre-seeded user ${user.email} by email. Updating ID to Firebase UID ${user.uid}.`);
              placeholderUsers[preSeededUserIndex].id = user.uid;
              appUser = placeholderUsers[preSeededUserIndex];
              needsPersistence = true; // Mark that we need to save this change
            }
          }

          if (appUser) {
            // User exists in our DB, proceed.
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(appUser));
            if (needsPersistence) {
                // Persist the ID update in the background
                persistToFirestore().catch(err => console.error("Failed to persist user ID update:", err));
            }
            setIsHydrating(false); 
          } else {
            // User exists in Firebase Auth, but not in our app's database.
            // Create a new user record for them "Just-In-Time".
            console.log(`User with UID ${user.uid} not found in app DB. Creating new user record...`);
            
            const newUser: User = {
              id: user.uid,
              email: user.email!,
              name: user.displayName || user.email!.split('@')[0],
              role: 'Tecnico', // Assign a default, non-admin role.
              phone: user.phoneNumber || undefined,
            };
            
            placeholderUsers.push(newUser); // Add to in-memory list
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(newUser));
            
            // Persist the new user to Firestore in the background
            persistToFirestore().catch(err => {
              console.error("Failed to persist newly created user:", err);
            });
            
            toast({
              title: "¡Bienvenido!",
              description: `Hemos creado un perfil para ti con el rol por defecto.`,
            });
            
            setIsHydrating(false); // We can now proceed
          }
        } catch (error) {
          console.error("Hydration failed:", error);
          toast({ title: "Error de Carga", description: "No se pudieron cargar los datos del taller desde la base de datos.", variant: "destructive" });
          await signOut(auth);
        }

      } else {
        // User is signed out.
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
      <SidebarInset className="flex flex-col">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
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
