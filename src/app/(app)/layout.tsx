
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromFirestore, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Loader2 } from 'lucide-react';
import { auth } from "@/lib/firebaseClient.js";
import { onAuthStateChanged } from 'firebase/auth';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // This effect runs only on the client side
    const checkAuthAndHydrate = async () => {
      // Use onAuthStateChanged for robust auth state checking
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // User is signed in. Now check if their profile is in localStorage.
          const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
          if (authUserString) {
            try {
              // User is authenticated and has a profile, proceed to hydrate data.
              await hydrateFromFirestore();
              setIsLoading(false);
            } catch (error) {
              console.error("Hydration failed:", error);
              localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
              router.push('/login');
            }
          } else {
            // User is authenticated with Firebase, but not yet in our app's context.
            // This happens right after login. The login page will handle redirection.
            // We just wait here. If the user is stuck, a refresh will trigger the login page's logic.
          }
        } else {
          // No user is signed in with Firebase Auth.
          router.push('/login');
        }
      });
      // Cleanup subscription on unmount
      return () => unsubscribe();
    };
    
    checkAuthAndHydrate();
    
  }, [router]);


  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg ml-4 text-muted-foreground">Cargando aplicación...</p>
      </div>
    );
  }
  
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <SidebarTrigger className="h-10 w-10 shadow-lg bg-black text-white" />
      </div>
      <SidebarInset className="flex flex-col">
        <main className="flex-1 overflow-y-auto p-4 pt-20 md:pt-6 lg:p-8 bg-background">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
