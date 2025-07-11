
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromFirestore, AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin, persistToFirestore, placeholderUsers } from '@/lib/placeholder-data';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      // Since there's no auth, we just set the default user in local storage
      // so other parts of the app can use it.
      localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(defaultSuperAdmin));
      
      // Hydrate data from Firestore.
      await hydrateFromFirestore();
      
      setIsLoading(false);
    };

    initializeApp();
  }, []);


  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-lg ml-4">Cargando datos del taller...</p>
      </div>
    );
  }
  
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar key={isLoading ? 'loading' : 'loaded'} />
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
