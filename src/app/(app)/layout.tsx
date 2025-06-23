
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromFirestore, placeholderUsers, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { auth } from '@root/lib/firebaseClient.js';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in with Firebase. Immediately show the app shell.
        setAuthStatus('authenticated');
        
        // Start hydration and user validation.
        setIsHydrating(true);
        try {
          await hydrateFromFirestore();
          const appUser = placeholderUsers.find(u => u.id === user.uid);

          if (appUser) {
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(appUser));
            // Hydration complete, show page content.
            setIsHydrating(false); 
          } else {
            console.error(`Authentication Error: User with UID ${user.uid} exists in Firebase but not in the application database. Logging out.`);
            toast({ title: "Error de Sincronización", description: "Tu usuario de Firebase no está registrado en la app.", variant: "destructive" });
            await signOut(auth);
            // onAuthStateChanged will fire again with user=null
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
      <AppSidebar />
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
