
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromFirestore, AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin, persistToFirestore, placeholderUsers, logAudit } from '@/lib/placeholder-data';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User as RanoroUser } from '@/types';
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebaseClient.js";
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in.
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          let appUser: RanoroUser;

          if (userDoc.exists()) {
            // User profile exists, load it.
            appUser = userDoc.data() as RanoroUser;
          } else {
            // First login for this user, create their profile.
            // This is crucial for the default admin on a new setup.
            appUser = {
              ...defaultSuperAdmin,
              id: firebaseUser.uid,
              email: firebaseUser.email!,
            };
            await setDoc(userDocRef, appUser);
            await logAudit('Acceso', 'Creación de perfil de usuario en el primer inicio de sesión.', { userId: appUser.id, userName: appUser.name });
            // This initial user list will be persisted in the main doc on the first save operation.
            placeholderUsers.push(appUser); 
          }
          
          localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(appUser));
          
          // Now that we have the user and their profile, we can hydrate the workshop data.
          await hydrateFromFirestore();
          
          setIsAuthenticated(true);
        } catch (error) {
            console.error("Error during user authentication or data hydration:", error);
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
        <p className="text-lg ml-4">Verificando sesión...</p>
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
