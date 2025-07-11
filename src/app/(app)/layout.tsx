
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
  const router = useRouter();

  useEffect(() => {
    // This effect runs only on the client side
    const checkAuthAndHydrate = async () => {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      
      if (!authUserString) {
        router.push('/login');
        return; 
      }
      
      try {
        await hydrateFromFirestore();
        setIsLoading(false);
      } catch (error) {
        console.error("Hydration failed:", error);
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
        router.push('/login');
      }
    };
    
    checkAuthAndHydrate();
    
  }, [router]);


  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-lg ml-4">Cargando aplicación...</p>
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
