
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromFirestore, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebaseClient.js";
import { doc, getDoc } from 'firebase/firestore';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in.
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify({ id: user.uid, ...userDoc.data() }));
          } else {
            // This case should ideally be handled during the first login creation process
            // but as a fallback, we can use default data or log an error.
            console.warn("User document does not exist in Firestore for UID:", user.uid);
            // Maybe redirect to login with an error message.
            router.push('/login');
          }
          
          await hydrateFromFirestore();
          setIsAuthenticated(true);

        } catch (error) {
            console.error("Error during user data hydration:", error);
            // Handle error, maybe sign out user and redirect to login
            await auth.signOut();
            router.push('/login');
        }
      } else {
        // User is signed out.
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
        setIsAuthenticated(false);
        router.push('/login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);


  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-lg ml-4">Cargando aplicación...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // This can show a brief "Redirecting..." message or a spinner
    // while the redirect to /login happens.
    return (
       <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-lg ml-4">Redirigiendo al login...</p>
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
        <main className="flex-1 overflow-y-auto p-4 pt-20 md:pt-6 lg:p-8">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
