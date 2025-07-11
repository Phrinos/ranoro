
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromFirestore, AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin, persistToFirestore } from '@/lib/placeholder-data';
import { Loader2 } from 'lucide-react';
import { auth, db } from "@/lib/firebaseClient.js";
import { onAuthStateChanged } from 'firebase/auth';
import type { User as RanoroUser } from '@/types';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth || !db) {
        console.error("Firebase no está inicializado.");
        setIsLoading(false);
        router.push('/login');
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is authenticated with Firebase
        try {
            // Step 1: Ensure user profile exists in Firestore and save it to localStorage.
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            let userDocSnap = await getDoc(userDocRef);

            let ranoroUser: RanoroUser;

            if (!userDocSnap.exists()) {
                // If this is the superadmin user, create their profile.
                if (firebaseUser.uid === defaultSuperAdmin.id) {
                    console.log("Superadmin profile not found, creating it...");
                    ranoroUser = defaultSuperAdmin;
                    await setDoc(userDocRef, ranoroUser);
                } else {
                    // For any other user, they should already exist. If not, it's an error.
                    throw new Error("El perfil de usuario no se encuentra en la base de datos.");
                }
            } else {
                ranoroUser = { id: userDocSnap.id, ...userDocSnap.data() } as RanoroUser;
            }

            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(ranoroUser));

            // Step 2: Now that user is confirmed, hydrate the rest of the app data.
            await hydrateFromFirestore();
            
            // Step 3: All data is ready, stop loading and show the app.
            setIsLoading(false);
        } catch (error) {
            console.error("Error during app layout initialization:", error);
            // On failure, log out and redirect to login
            await auth.signOut();
            localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
            router.push('/login');
        }
      } else {
        // No user is signed in. Clear local storage and redirect to login.
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
        router.push('/login');
      }
    });

    return () => unsubscribe();
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
