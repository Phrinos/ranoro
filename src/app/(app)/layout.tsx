
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromFirestore, persistToFirestore } from '@/lib/placeholder-data';
import { onAuthStateChanged } from 'firebase/auth'; // Firebase
import { auth } from '@/lib/firebaseClient'; // Firebase

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // This effect handles authentication using Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.replace('/login');
      }
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [router]);

  // This effect handles data persistence, now triggered by Firebase auth state
  useEffect(() => {
    const runAsyncHydration = async () => {
        if (isAuthenticated) {
            await hydrateFromFirestore();
        }
    };
    
    runAsyncHydration();

    const handlePersist = async () => {
      if (document.visibilityState === 'hidden' && isAuthenticated) {
        await persistToFirestore();
      }
    };
    
    document.addEventListener('visibilitychange', handlePersist);
    window.addEventListener('beforeunload', () => {
        if(isAuthenticated) {
            persistToFirestore();
        }
    });

    return () => {
      document.removeEventListener('visibilitychange', handlePersist);
      window.removeEventListener('beforeunload', () => {
        if(isAuthenticated) {
            persistToFirestore();
        }
    });
      
      if(isAuthenticated) {
        persistToFirestore();
      }
    };
  }, [isAuthenticated]);


  if (isAuthenticated === null) {
    return null; // Or a full-page loading spinner
  }

  if (!isAuthenticated) {
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
