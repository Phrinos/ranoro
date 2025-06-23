
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromFirestore, placeholderUsers, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Firebase
import { auth } from '@root/lib/firebaseClient.js'; // Firebase

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(true);

  // This effect handles authentication using Firebase and syncs with app data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in. Ensure app data is hydrated before proceeding.
        await hydrateFromFirestore();
        
        // Find the corresponding user in our application's database using the UID.
        const appUser = placeholderUsers.find(u => u.id === user.uid);

        if (appUser) {
          // User found, store their app-specific profile and grant access.
          localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(appUser));
          setIsAuthenticated(true);
        } else {
          // This is a critical error: user exists in Firebase Auth but not in our database.
          console.error(`Authentication Error: User with UID ${user.uid} exists in Firebase but not in the application database. Logging out.`);
          await signOut(auth);
          // The onAuthStateChanged will fire again with user=null, which is handled below.
        }
      } else {
        // User is signed out.
        setIsAuthenticated(false);
        router.replace('/login');
      }
      setIsAuthorizing(false); // Auth check and hydration process is complete.
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);


  if (isAuthorizing) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-lg">Verificando sesión...</p>
      </div>
    ); // Or a full-page loading spinner
  }

  if (!isAuthenticated) {
    // This state should be brief as the effect will redirect to /login.
    // Returning null prevents a flash of the children components.
    return null;
  }
  
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
